import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { getOrganizationTaxRate } from "@/lib/tax-rates";
import { InvoiceService } from "@/lib/invoice-service";
import { Booking } from "@/types/bookings";
import { FlightLog } from "@/types/flight_logs";
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
  flightTimeHobbs: number;
  flightTimeTach: number;
  soloEndHobbs?: number;
  dualTime: number;
  soloTime: number;
  soloFlightType?: string;
  soloAircraftRate?: number;
}

// Type for booking with joined relations from the Supabase query
type BookingWithRelations = Booking & {
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'>;
  aircraft: { registration: string };
  flight_logs?: FlightLog[];
};

interface CalculateChargesResponse {
  booking: BookingWithRelations;
  flight_log?: FlightLog;
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
      tachEnd,
      flightTimeHobbs,
      flightTimeTach,
      soloEndHobbs,
      dualTime,
      soloTime,
      // soloFlightType, // Reserved for future use
      soloAircraftRate
    } = body;

    // 1. Fetch booking data with flight logs
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        user:user_id(id, first_name, last_name, email),
        aircraft:aircraft_id(id, registration, type),
        flight_logs(
          *,
          checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
          checked_out_instructor:checked_out_instructor_id(
            *,
            users:users!instructors_user_id_fkey(
              id,
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if user has permission to calculate charges for this booking
    // Users can only calculate charges for their own bookings, unless they are admin/owner/instructor
    const { data: userRole } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });
    
    const isPrivilegedUser = userRole && ['admin', 'owner', 'instructor'].includes(userRole);
    const isOwnBooking = booking.user_id === user.id;
    
    if (!isPrivilegedUser && !isOwnBooking) {
      return NextResponse.json({ error: "Forbidden: You can only calculate charges for your own bookings" }, { status: 403 });
    }

    // Helper function to round to 1 decimal place and avoid floating-point errors
    const roundToOneDecimal = (value: number): number => {
      return Math.round(value * 10) / 10;
    };

    // 2. Update or create flight log with meter readings
    let flightLog = booking.flight_logs?.[0];
    const meterUpdates: Record<string, number | null> = {};
    if (typeof hobbsStart === 'number') meterUpdates.hobbs_start = roundToOneDecimal(hobbsStart);
    if (typeof hobbsEnd === 'number') meterUpdates.hobbs_end = roundToOneDecimal(hobbsEnd);
    if (typeof tachStart === 'number') meterUpdates.tach_start = roundToOneDecimal(tachStart);
    if (typeof tachEnd === 'number') meterUpdates.tach_end = roundToOneDecimal(tachEnd);
    if (typeof soloEndHobbs === 'number') meterUpdates.solo_end_hobbs = roundToOneDecimal(soloEndHobbs);
    meterUpdates.flight_time = roundToOneDecimal(chargeTime);
    meterUpdates.flight_time_hobbs = roundToOneDecimal(flightTimeHobbs);
    meterUpdates.flight_time_tach = roundToOneDecimal(flightTimeTach);
    // Store dual/solo time breakdown with proper rounding
    meterUpdates.dual_time = dualTime > 0 ? roundToOneDecimal(dualTime) : null;
    meterUpdates.solo_time = soloTime > 0 ? roundToOneDecimal(soloTime) : null;

    if (Object.keys(meterUpdates).length > 0) {
      if (flightLog) {
        // Update existing flight log
        const { data: updatedFlightLog, error: flightLogError } = await supabase
          .from("flight_logs")
          .update(meterUpdates)
          .eq("id", flightLog.id)
          .select(`
            *,
            checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
            checked_out_instructor:checked_out_instructor_id(
              *,
              users:users!instructors_user_id_fkey(
                id,
                first_name,
                last_name,
                email
              )
            )
          `)
          .single();

        if (flightLogError) {
          return NextResponse.json({ error: `Failed to update flight log: ${flightLogError.message}` }, { status: 500 });
        }
        flightLog = updatedFlightLog;
      } else {
        // Create new flight log
        const { data: newFlightLog, error: flightLogError } = await supabase
          .from("flight_logs")
          .insert([{
            booking_id: bookingId,
            ...meterUpdates
          }])
          .select(`
            *,
            checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
            checked_out_instructor:checked_out_instructor_id(
              *,
              users:users!instructors_user_id_fkey(
                id,
                first_name,
                last_name,
                email
              )
            )
          `)
          .single();

        if (flightLogError) {
          return NextResponse.json({ error: `Failed to create flight log: ${flightLogError.message}` }, { status: 500 });
        }
        flightLog = newFlightLog;
      }
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
      const taxRate = await getOrganizationTaxRate();
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
    // Use checked_out_aircraft from flight_log instead of booking aircraft
    const aircraftReg = flightLog?.checked_out_aircraft?.registration || booking.aircraft?.registration || 'Aircraft';

    // Create descriptions based on dual/solo time breakdown
    const isDualSoloFlight = dualTime > 0 && soloTime > 0;
    const isDualOnlyFlight = dualTime > 0 && soloTime === 0;
    const isSoloOnlyFlight = dualTime === 0 && soloTime > 0;

    // 5. Get current invoice items
    const { data: currentItems } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id);

    // Define item descriptions
    const dualAircraftDesc = `Dual ${flightTypeName} - ${aircraftReg}`;
    const dualInstructorDesc = `Dual ${flightTypeName} - ${instructorName}`;
    const soloAircraftDesc = `Solo ${flightTypeName} - ${aircraftReg}`;
    const standardAircraftDesc = `${flightTypeName} - ${aircraftReg}`;
    const standardInstructorDesc = `${flightTypeName} - ${instructorName}`;

    // Find existing items
    const existingDualAircraft = currentItems?.find(item => item.description === dualAircraftDesc);
    const existingDualInstructor = currentItems?.find(item => item.description === dualInstructorDesc);
    const existingSoloAircraft = currentItems?.find(item => item.description === soloAircraftDesc);
    const existingStandardAircraft = currentItems?.find(item => item.description === standardAircraftDesc);
    const existingStandardInstructor = currentItems?.find(item => item.description === standardInstructorDesc);

    // 6. Create or update line items based on dual/solo time breakdown
    const itemOperations = [];

    if (isDualSoloFlight || isDualOnlyFlight) {
      // Handle dual time - aircraft item
      if (existingDualAircraft) {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(dualTime),
          unit_price: aircraftRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .update({
              quantity: roundToOneDecimal(dualTime),
              unit_price: aircraftRate,
              description: dualAircraftDesc,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .eq("id", existingDualAircraft.id)
            .select("*")
            .single()
        );
      } else {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(dualTime),
          unit_price: aircraftRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .insert({
              invoice_id: invoice.id,
              description: dualAircraftDesc,
              quantity: roundToOneDecimal(dualTime),
              unit_price: aircraftRate,
              tax_rate: invoice.tax_rate,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .select("*")
            .single()
        );
      }

      // Handle dual time - instructor item
      if (existingDualInstructor) {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(dualTime),
          unit_price: instructorRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .update({
              quantity: roundToOneDecimal(dualTime),
              unit_price: instructorRate,
              description: dualInstructorDesc,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .eq("id", existingDualInstructor.id)
            .select("*")
            .single()
        );
      } else {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(dualTime),
          unit_price: instructorRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .insert({
              invoice_id: invoice.id,
              description: dualInstructorDesc,
              quantity: roundToOneDecimal(dualTime),
              unit_price: instructorRate,
              tax_rate: invoice.tax_rate,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .select("*")
            .single()
        );
      }
    }

    if (isDualSoloFlight) {
      // Handle solo time - aircraft only (use solo rate if provided)
      const soloRate = soloAircraftRate || aircraftRate;
      if (existingSoloAircraft) {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(soloTime),
          unit_price: soloRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .update({
              quantity: roundToOneDecimal(soloTime),
              unit_price: soloRate,
              description: soloAircraftDesc,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .eq("id", existingSoloAircraft.id)
            .select("*")
            .single()
        );
      } else {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(soloTime),
          unit_price: soloRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .insert({
              invoice_id: invoice.id,
              description: soloAircraftDesc,
              quantity: roundToOneDecimal(soloTime),
              unit_price: soloRate,
              tax_rate: invoice.tax_rate,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .select("*")
            .single()
        );
      }
    } else if (isSoloOnlyFlight) {
      // Pure solo flight - aircraft only (use solo rate if provided)
      const soloRate = soloAircraftRate || aircraftRate;
      if (existingSoloAircraft) {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(soloTime),
          unit_price: soloRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .update({
              quantity: roundToOneDecimal(soloTime),
              unit_price: soloRate,
              description: soloAircraftDesc,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .eq("id", existingSoloAircraft.id)
            .select("*")
            .single()
        );
      } else {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(soloTime),
          unit_price: soloRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .insert({
              invoice_id: invoice.id,
              description: soloAircraftDesc,
              quantity: roundToOneDecimal(soloTime),
              unit_price: soloRate,
              tax_rate: invoice.tax_rate,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .select("*")
            .single()
        );
      }
    } else {
      // Standard flight (non-dual/solo breakdown) - fallback to original logic
      if (existingStandardAircraft) {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(chargeTime),
          unit_price: aircraftRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .update({
              quantity: roundToOneDecimal(chargeTime),
              unit_price: aircraftRate,
              description: standardAircraftDesc,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .eq("id", existingStandardAircraft.id)
            .select("*")
            .single()
        );
      } else {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(chargeTime),
          unit_price: aircraftRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .insert({
              invoice_id: invoice.id,
              description: standardAircraftDesc,
              quantity: roundToOneDecimal(chargeTime),
              unit_price: aircraftRate,
              tax_rate: invoice.tax_rate,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .select("*")
            .single()
        );
      }

      // Standard instructor item
      if (existingStandardInstructor) {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(chargeTime),
          unit_price: instructorRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .update({
              quantity: roundToOneDecimal(chargeTime),
              unit_price: instructorRate,
              description: standardInstructorDesc,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .eq("id", existingStandardInstructor.id)
            .select("*")
            .single()
        );
      } else {
        const calculatedAmounts = InvoiceService.calculateItemAmounts({
          quantity: roundToOneDecimal(chargeTime),
          unit_price: instructorRate,
          tax_rate: invoice.tax_rate
        });
        
        itemOperations.push(
          supabase
            .from("invoice_items")
            .insert({
              invoice_id: invoice.id,
              description: standardInstructorDesc,
              quantity: roundToOneDecimal(chargeTime),
              unit_price: instructorRate,
              tax_rate: invoice.tax_rate,
              amount: calculatedAmounts.amount,
              tax_amount: calculatedAmounts.tax_amount,
              line_total: calculatedAmounts.line_total,
              rate_inclusive: calculatedAmounts.rate_inclusive,
            })
            .select("*")
            .single()
        );
      }
    }

    // Clean up old line items that are no longer relevant
    const itemsToDelete = [];

    if (isDualSoloFlight || isDualOnlyFlight) {
      // Remove standard items if they exist (switching from standard to dual/solo)
      if (existingStandardAircraft) itemsToDelete.push(existingStandardAircraft.id);
      if (existingStandardInstructor) itemsToDelete.push(existingStandardInstructor.id);
    } else if (isSoloOnlyFlight) {
      // Remove dual items if they exist (switching from dual to solo only)
      if (existingDualAircraft) itemsToDelete.push(existingDualAircraft.id);
      if (existingDualInstructor) itemsToDelete.push(existingDualInstructor.id);
      if (existingStandardAircraft) itemsToDelete.push(existingStandardAircraft.id);
      if (existingStandardInstructor) itemsToDelete.push(existingStandardInstructor.id);
    } else {
      // Remove dual/solo items if they exist (switching from dual/solo to standard)
      if (existingDualAircraft) itemsToDelete.push(existingDualAircraft.id);
      if (existingDualInstructor) itemsToDelete.push(existingDualInstructor.id);
      if (existingSoloAircraft) itemsToDelete.push(existingSoloAircraft.id);
    }

    // For dual/solo flights, also remove solo items if no longer needed
    if (isDualOnlyFlight && existingSoloAircraft) {
      itemsToDelete.push(existingSoloAircraft.id);
    }

    // Delete old items
    if (itemsToDelete.length > 0) {
      await supabase
        .from("invoice_items")
        .delete()
        .in("id", itemsToDelete);
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
      booking: {
        ...booking,
        flight_logs: flightLog ? [flightLog] : []
      },
      flight_log: flightLog,
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