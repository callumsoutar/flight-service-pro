import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { getOrganizationTaxRate } from "@/lib/tax-rates";
import { InvoiceService } from "@/lib/invoice-service";

/**
 * Preview calculation endpoint - NO database writes
 * Returns calculated invoice items and totals without persisting to database
 */

interface MeterReadings {
  hobbsStart: number;
  hobbsEnd: number;
  tachStart: number;
  tachEnd: number;
  soloEndHobbs?: number;
}

interface CalculatePreviewRequest {
  meterReadings: MeterReadings;
  flightTypeId: string;
  instructorId?: string;
  soloFlightTypeId?: string;
}

// Helper to round to 1 decimal
const round = (val: number) => Math.round(val * 10) / 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CalculatePreviewRequest = await req.json();
    const { meterReadings, flightTypeId, instructorId, soloFlightTypeId } = body;

    if (!meterReadings || !flightTypeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate meter readings
    if (meterReadings.hobbsEnd <= meterReadings.hobbsStart) {
      return NextResponse.json(
        { error: "End Hobbs must be greater than Start Hobbs" },
        { status: 400 }
      );
    }
    if (meterReadings.tachEnd <= meterReadings.tachStart) {
      return NextResponse.json(
        { error: "End Tach must be greater than Start Tach" },
        { status: 400 }
      );
    }
    if (meterReadings.soloEndHobbs && meterReadings.soloEndHobbs <= meterReadings.hobbsEnd) {
      return NextResponse.json(
        { error: "Solo End Hobbs must be greater than Dual End Hobbs" },
        { status: 400 }
      );
    }

    // 1. Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        user:user_id(id, first_name, last_name, email),
        flight_type:flight_type_id(*),
        flight_logs(
          *,
          checked_out_aircraft:checked_out_aircraft_id(*)
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check authorization
    const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
    const isPrivileged = userRole && ['admin', 'owner', 'instructor'].includes(userRole);
    const isOwnBooking = booking.user_id === user.id;

    if (!isPrivileged && !isOwnBooking) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Get aircraft
    const aircraftId = booking.flight_logs?.[0]?.checked_out_aircraft_id || booking.aircraft_id;
    const { data: aircraft } = await supabase
      .from('aircraft')
      .select('id, registration, total_time_method, total_hours, aircraft_type_id')
      .eq('id', aircraftId)
      .single();

    if (!aircraft) {
      return NextResponse.json({ error: "Aircraft not found" }, { status: 404 });
    }

    // 3. Get aircraft charge rate
    const { data: chargeRate } = await supabase
      .from('aircraft_charge_rates')
      .select('rate_per_hour, charge_hobbs, charge_tacho')
      .eq('aircraft_id', aircraftId)
      .eq('flight_type_id', flightTypeId)
      .single();

    if (!chargeRate) {
      return NextResponse.json({ error: "No charge rate configured for this aircraft and flight type" }, { status: 400 });
    }

    // Determine which meter to use for billing
    const chargingBy = chargeRate.charge_hobbs ? 'hobbs' : chargeRate.charge_tacho ? 'tacho' : null;

    // 4. Calculate flight times
    const hobbsTime = round(meterReadings.hobbsEnd - meterReadings.hobbsStart);
    const tachTime = round(meterReadings.tachEnd - meterReadings.tachStart);

    // 5. Calculate total_hours progression
    let totalHoursStart = aircraft.total_hours || 0;

    // Check if this booking already has a flight_log with total_hours_start set
    const existingFlightLog = booking.flight_logs?.[0];
    if (existingFlightLog && existingFlightLog.total_hours_start !== null && existingFlightLog.total_hours_start !== undefined) {
      totalHoursStart = existingFlightLog.total_hours_start;
    }

    // Calculate credited time based on total_time_method
    let creditedTime = 0;
    switch (aircraft.total_time_method) {
      case 'hobbs':
        creditedTime = hobbsTime;
        break;
      case 'tacho':
        creditedTime = tachTime;
        break;
      case 'airswitch':
        creditedTime = hobbsTime;
        break;
      case 'hobbs less 5%':
        creditedTime = hobbsTime * 0.95;
        break;
      case 'hobbs less 10%':
        creditedTime = hobbsTime * 0.90;
        break;
      case 'tacho less 5%':
        creditedTime = tachTime * 0.95;
        break;
      case 'tacho less 10%':
        creditedTime = tachTime * 0.90;
        break;
      default:
        creditedTime = hobbsTime;
    }

    const totalHoursEnd = round(totalHoursStart + creditedTime);

    // 6. Get flight type
    const { data: flightType } = await supabase
      .from('flight_types')
      .select('name, instruction_type')
      .eq('id', flightTypeId)
      .single();

    if (!flightType) {
      return NextResponse.json({ error: "Flight type not found" }, { status: 404 });
    }

    const instructionType = flightType.instruction_type;
    let dualTime = 0;
    let soloTime = 0;

    if (instructionType === 'solo') {
      soloTime = chargingBy === 'hobbs' ? hobbsTime : tachTime;
    } else if (instructionType === 'dual') {
      dualTime = chargingBy === 'hobbs' ? hobbsTime : tachTime;
      if (meterReadings.soloEndHobbs) {
        soloTime = round(meterReadings.soloEndHobbs - meterReadings.hobbsEnd);
      }
    } else {
      // Trial or other
      dualTime = chargingBy === 'hobbs' ? hobbsTime : tachTime;
    }

    const flightTime = round(dualTime + soloTime);

    // 7. Get instructor rate (if needed)
    let instructorRate = 0;
    let instructorName = 'Instructor';

    if (instructionType === 'dual' || instructionType === 'trial') {
      if (!instructorId) {
        return NextResponse.json({ error: "Instructor required for dual/trial flights" }, { status: 400 });
      }

      const { data: rateData } = await supabase
        .from('instructor_flight_type_rates')
        .select('rate')
        .eq('instructor_id', instructorId)
        .eq('flight_type_id', flightTypeId)
        .maybeSingle();

      instructorRate = rateData?.rate || 0;

      // Get instructor name
      const { data: instructor } = await supabase
        .from('instructors')
        .select('users(first_name, last_name)')
        .eq('id', instructorId)
        .single();

      const user = instructor?.users as { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] | null;
      const userObj = Array.isArray(user) ? user[0] : user;
      if (userObj) {
        instructorName = `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || 'Instructor';
      }
    }

    // 8. Get solo rate (if needed)
    let soloRate = chargeRate.rate_per_hour;
    if (soloTime > 0 && soloFlightTypeId) {
      const { data: soloChargeRate } = await supabase
        .from('aircraft_charge_rates')
        .select('rate_per_hour')
        .eq('aircraft_id', aircraftId)
        .eq('flight_type_id', soloFlightTypeId)
        .maybeSingle();

      if (soloChargeRate) {
        soloRate = soloChargeRate.rate_per_hour;
      }
    }

    // 9. Get tax rate
    const taxRate = await getOrganizationTaxRate();

    // 10. Generate invoice items (in-memory, no DB write)
    const invoiceItems: Array<{
      id: string;
      quantity: number;
      unit_price: number;
      rate_inclusive: number;
      amount: number;
      tax_rate: number;
      tax_amount: number;
      line_total: number;
      description: string;
      chargeable_id: string | null;
    }> = [];

    // Add aircraft charge
    if (dualTime > 0) {
      const amounts = InvoiceService.calculateItemAmounts({
        quantity: dualTime,
        unit_price: chargeRate.rate_per_hour,
        tax_rate: taxRate,
      });

      invoiceItems.push({
        id: `temp-aircraft-${Date.now()}`,
        quantity: dualTime,
        unit_price: chargeRate.rate_per_hour,
        rate_inclusive: amounts.rate_inclusive,
        amount: amounts.amount,
        tax_rate: taxRate,
        tax_amount: amounts.tax_amount,
        line_total: amounts.line_total,
        description: `${flightType.name} - ${aircraft.registration}`,
        chargeable_id: null,
      });
    }

    // Add instructor charge
    if ((instructionType === 'dual' || instructionType === 'trial') && dualTime > 0) {
      const amounts = InvoiceService.calculateItemAmounts({
        quantity: dualTime,
        unit_price: instructorRate,
        tax_rate: taxRate,
      });

      invoiceItems.push({
        id: `temp-instructor-${Date.now()}`,
        quantity: dualTime,
        unit_price: instructorRate,
        rate_inclusive: amounts.rate_inclusive,
        amount: amounts.amount,
        tax_rate: taxRate,
        tax_amount: amounts.tax_amount,
        line_total: amounts.line_total,
        description: `Instruction - ${instructorName}`,
        chargeable_id: null,
      });
    }

    // Add solo charge
    if (soloTime > 0) {
      const amounts = InvoiceService.calculateItemAmounts({
        quantity: soloTime,
        unit_price: soloRate,
        tax_rate: taxRate,
      });

      invoiceItems.push({
        id: `temp-solo-${Date.now()}`,
        quantity: soloTime,
        unit_price: soloRate,
        rate_inclusive: amounts.rate_inclusive,
        amount: amounts.amount,
        tax_rate: taxRate,
        tax_amount: amounts.tax_amount,
        line_total: amounts.line_total,
        description: `Solo Flight - ${aircraft.registration}`,
        chargeable_id: null,
      });
    }

    // 11. Calculate totals
    const totals = InvoiceService.calculateInvoiceTotals(invoiceItems);

    // Return calculated data (no DB persistence)
    return NextResponse.json({
      flightLog: {
        hobbsStart: round(meterReadings.hobbsStart),
        hobbsEnd: round(meterReadings.hobbsEnd),
        tachStart: round(meterReadings.tachStart),
        tachEnd: round(meterReadings.tachEnd),
        soloEndHobbs: meterReadings.soloEndHobbs ? round(meterReadings.soloEndHobbs) : undefined,
        hobbsTime,
        tachTime,
        flightTime,
        dualTime,
        soloTime,
        totalHoursStart,
        totalHoursEnd,
      },
      invoiceItems,
      totals: {
        subtotal: totals.subtotal,
        tax: totals.tax_total,
        total: totals.total_amount,
      },
      flightTypeId,
      instructorId,
      soloFlightTypeId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
