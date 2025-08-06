import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { getTaxRateForUser } from "@/lib/tax-rates";
import { Booking } from "@/types/bookings";
import { Invoice } from "@/types/invoices";
import { InvoiceItem } from "@/types/invoice_items";
import { User } from "@/types/users";

interface CalculateChargesRequest {
  chargeTime: number;
  aircraftRate: number;
  instructorRate: number;
  chargingBy: 'hobbs' | 'tacho' | null;
  selectedInstructor: string;
  selectedFlightType: string;
  hobbsStart?: number;
  hobbsEnd?: number;
  tachStart?: number;
  tachEnd?: number;
}

// Type for booking with joined relations from the Supabase query
type BookingWithRelations = Booking & {
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'>;
  aircraft: { registration: string };
};

interface CalculateChargesResponse {
  booking: BookingWithRelations;
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  totals: {
    subtotal: number;
    totalTax: number;
    total: number;
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CalculateChargesResponse | { error: string }>> {
  const { id: bookingId } = await params;
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CalculateChargesRequest = await req.json();
    const {
      chargeTime,
      aircraftRate,
      instructorRate,
      selectedInstructor,
      selectedFlightType,
      hobbsStart,
      hobbsEnd,
      tachStart,
      tachEnd
    } = body;

    // Start a transaction by creating all operations in sequence
    // 1. Fetch booking data first
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        user:user_id(id, first_name, last_name, email),
        aircraft:checked_out_aircraft_id(registration)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // 2. Update booking meters if provided
    let updatedBooking = booking;
    const meterUpdates: Record<string, number> = {};
    if (typeof hobbsStart === 'number') meterUpdates.hobbs_start = hobbsStart;
    if (typeof hobbsEnd === 'number') meterUpdates.hobbs_end = hobbsEnd;
    if (typeof tachStart === 'number') meterUpdates.tach_start = tachStart;
    if (typeof tachEnd === 'number') meterUpdates.tach_end = tachEnd;

    if (Object.keys(meterUpdates).length > 0) {
      const { data: patchedBooking, error: patchError } = await supabase
        .from("bookings")
        .update(meterUpdates)
        .eq("id", bookingId)
        .select("*")
        .single();

      if (patchError) {
        return NextResponse.json({ error: `Failed to update booking: ${patchError.message}` }, { status: 500 });
      }
      updatedBooking = patchedBooking;
    }

    // 3. Get or create invoice
    let invoice;
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (existingInvoice) {
      invoice = existingInvoice;
    } else {
      // Create new invoice
      const taxRate = await getTaxRateForUser(booking.user_id);
      const { data: newInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: booking.user_id,
          booking_id: bookingId,
          status: "draft",
          tax_rate: taxRate,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          subtotal: 0,
          tax_total: 0,
          total_amount: 0,
          total_paid: 0,
          balance_due: 0,
        })
        .select("*")
        .single();

      if (invoiceError) {
        return NextResponse.json({ error: `Failed to create invoice: ${invoiceError.message}` }, { status: 500 });
      }
      invoice = newInvoice;
    }

    // 4. Fetch flight type and instructor names for descriptions
    const [flightTypeRes, instructorRes] = await Promise.all([
      supabase.from("flight_types").select("name").eq("id", selectedFlightType).single(),
      supabase.from("instructors").select("users(first_name, last_name)").eq("id", selectedInstructor).single()
    ]);

    const flightTypeName = flightTypeRes.data?.name || 'Flight';
    const instructorUser = instructorRes.data?.users as Pick<User, 'first_name' | 'last_name'>;
    const instructorName = instructorUser 
      ? `${instructorUser.first_name || ''} ${instructorUser.last_name || ''}`.trim() || 'Instructor'
      : 'Instructor';
    const aircraftReg = booking.aircraft?.registration || 'Aircraft';

    const aircraftDesc = `${flightTypeName} - ${aircraftReg}`;
    const instructorDesc = `${flightTypeName} - ${instructorName}`;

    // 5. Get current invoice items
    const { data: currentItems } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id);

    const existingAircraft = currentItems?.find(item => item.description === aircraftDesc);
    const existingInstructor = currentItems?.find(item => item.description === instructorDesc);

    // 6. Create or update line items in parallel
    const itemOperations = [];

    // Aircraft line item
    if (existingAircraft) {
      itemOperations.push(
        supabase
          .from("invoice_items")
          .update({
            quantity: chargeTime,
            unit_price: aircraftRate,
            description: aircraftDesc,
          })
          .eq("id", existingAircraft.id)
          .select("*")
          .single()
      );
    } else {
      itemOperations.push(
        supabase
          .from("invoice_items")
          .insert({
            invoice_id: invoice.id,
            description: aircraftDesc,
            quantity: chargeTime,
            unit_price: aircraftRate,
            tax_rate: invoice.tax_rate,
          })
          .select("*")
          .single()
      );
    }

    // Instructor line item
    if (existingInstructor) {
      itemOperations.push(
        supabase
          .from("invoice_items")
          .update({
            quantity: chargeTime,
            unit_price: instructorRate,
            description: instructorDesc,
          })
          .eq("id", existingInstructor.id)
          .select("*")
          .single()
      );
    } else {
      itemOperations.push(
        supabase
          .from("invoice_items")
          .insert({
            invoice_id: invoice.id,
            description: instructorDesc,
            quantity: chargeTime,
            unit_price: instructorRate,
            tax_rate: invoice.tax_rate,
          })
          .select("*")
          .single()
      );
    }

    // Execute line item operations in parallel
    const itemResults = await Promise.allSettled(itemOperations);
    
    // Check for errors in item operations
    for (const result of itemResults) {
      if (result.status === 'rejected') {
        console.error('Line item operation failed:', result.reason);
        return NextResponse.json({ error: "Failed to update invoice items" }, { status: 500 });
      }
    }

    // 7. Fetch updated invoice items
    const { data: updatedItems, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: `Failed to fetch updated items: ${itemsError.message}` }, { status: 500 });
    }

    // 8. Calculate totals
    const subtotal = updatedItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const totalTax = updatedItems?.reduce((sum, item) => sum + (item.tax_amount || 0), 0) || 0;
    const total = updatedItems?.reduce((sum, item) => sum + (item.line_total || 0), 0) || 0;

    return NextResponse.json({
      booking: updatedBooking,
      invoice,
      invoiceItems: updatedItems || [],
      totals: {
        subtotal,
        totalTax,
        total,
      },
    });

  } catch (error) {
    console.error('Calculate charges error:', error);
    const errorMessage = error instanceof Error ? error.message : "Failed to calculate charges";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}