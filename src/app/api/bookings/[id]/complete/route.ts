import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { Booking } from "@/types/bookings";
import { Invoice } from "@/types/invoices";
import { InvoiceService } from "@/lib/invoice-service";
import { updateAircraftOnBookingCompletion } from "@/lib/aircraft-update";

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

    // 4. Calculate and update invoice totals based on all invoice items
    try {
      await InvoiceService.updateInvoiceTotals(supabase, invoice.id);
    } catch (totalError) {
      console.error('Failed to update invoice totals:', totalError);
      return NextResponse.json({ error: `Failed to calculate invoice totals: ${totalError instanceof Error ? totalError.message : 'Unknown error'}` }, { status: 500 });
    }

    // 5. Generate invoice number if not already set
    let invoiceNumber = invoice.invoice_number;
    if (!invoiceNumber) {
      try {
        invoiceNumber = await InvoiceService.generateInvoiceNumber();
      } catch (numberError) {
        console.error('Failed to generate invoice number:', numberError);
        return NextResponse.json({ error: `Failed to generate invoice number: ${numberError instanceof Error ? numberError.message : 'Unknown error'}` }, { status: 500 });
      }
    }

    // 6. Update invoice status to 'pending', set invoice number, and ensure booking_id is set
    const invoiceUpdates: {
      status: string;
      booking_id?: string;
      invoice_number?: string;
      issue_date?: string;
    } = {
      status: "pending",
      invoice_number: invoiceNumber,
      issue_date: invoice.issue_date || new Date().toISOString()
    };

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

    // 7. Update booking status to 'complete'
    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ status: "complete" })
      .eq("id", bookingId);

    if (bookingUpdateError) {
      return NextResponse.json({ error: `Failed to complete booking: ${bookingUpdateError.message}` }, { status: 500 });
    }

    // 8. Update aircraft meters based on flight log data
    try {
      await updateAircraftOnBookingCompletion(supabase, bookingId);
    } catch (aircraftError) {
      console.error('[Complete Booking] Failed to update aircraft meters:', aircraftError);
      // Don't fail the booking completion if aircraft update fails
      // The booking is complete, but aircraft meters might be out of sync
      // This will be logged for manual correction
    }

    // 9. Fetch the completed booking
    const { data: completedBooking, error: fetchBookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchBookingError) {
      console.error('[Complete Booking] Failed to fetch completed booking:', fetchBookingError);
      // Return success anyway since the booking was completed
      return NextResponse.json({
        booking: booking, // Return original booking data
        invoice: invoice,
        success: true,
      });
    }

    // 10. Fetch updated invoice with all totals
    const { data: updatedInvoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice.id)
      .single();

    return NextResponse.json({
      booking: completedBooking || booking,
      invoice: updatedInvoice || invoice,
      success: true,
    });

  } catch (error) {
    console.error('Complete booking error:', error);
    const errorMessage = error instanceof Error ? error.message : "Failed to complete booking";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}