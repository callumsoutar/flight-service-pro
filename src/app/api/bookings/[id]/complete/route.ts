import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { Booking } from "@/types/bookings";
import { Invoice } from "@/types/invoices";

interface CompleteBookingRequest {
  invoiceItems?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    rate_inclusive?: number;
    amount: number;
    tax_rate?: number;
    tax_amount?: number;
    line_total?: number;
    description: string;
    chargeable_id?: string;
  }>;
}

interface CompleteBookingResponse {
  booking: Booking;
  invoice: Invoice;
  success: boolean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CompleteBookingResponse | { error: string }>> {
  const { id: bookingId } = await params;
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CompleteBookingRequest = await req.json();
    const { invoiceItems } = body;

    // 1. Fetch booking to validate it exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // 2. Get invoice for this booking
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found for this booking" }, { status: 404 });
    }

    // 3. Update all invoice items in parallel if provided
    if (invoiceItems && invoiceItems.length > 0) {
      const updatePromises = invoiceItems.map(item => 
        supabase
          .from("invoice_items")
          .update({
            quantity: item.quantity,
            unit_price: item.unit_price,
            rate_inclusive: item.rate_inclusive,
            amount: item.amount,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            line_total: item.line_total,
            description: item.description,
            chargeable_id: item.chargeable_id || null,
          })
          .eq("id", item.id)
      );

      const updateResults = await Promise.allSettled(updatePromises);
      
      // Check for errors in updates
      for (const result of updateResults) {
        if (result.status === 'rejected') {
          console.error('Invoice item update failed:', result.reason);
          return NextResponse.json({ error: "Failed to update invoice items" }, { status: 500 });
        }
      }
    }

    // 4. Update invoice status to 'pending' and ensure booking_id is set
    const invoiceUpdates: { status: string; booking_id?: string } = { status: "pending" };
    if (invoice.booking_id !== bookingId) {
      invoiceUpdates.booking_id = bookingId;
    }

    const { error: invoiceUpdateError } = await supabase
      .from("invoices")
      .update(invoiceUpdates)
      .eq("id", invoice.id);

    if (invoiceUpdateError) {
      return NextResponse.json({ error: `Failed to update invoice: ${invoiceUpdateError.message}` }, { status: 500 });
    }

    // 5. Complete the booking using the main bookings API logic (this triggers aircraft meter updates)
    const bookingUpdateResponse = await fetch(`${req.nextUrl.origin}/api/bookings`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || "",
        "Cookie": req.headers.get("Cookie") || "",
      },
      body: JSON.stringify({
        id: bookingId,
        status: "complete",
      }),
    });

    if (!bookingUpdateResponse.ok) {
      const errorData = await bookingUpdateResponse.json();
      return NextResponse.json({ error: `Failed to complete booking: ${errorData.error}` }, { status: 500 });
    }

    const { booking: completedBooking } = await bookingUpdateResponse.json();

    // 6. Fetch updated invoice
    const { data: updatedInvoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice.id)
      .single();

    return NextResponse.json({
      booking: completedBooking,
      invoice: updatedInvoice,
      success: true,
    });

  } catch (error) {
    console.error('Complete booking error:', error);
    const errorMessage = error instanceof Error ? error.message : "Failed to complete booking";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}