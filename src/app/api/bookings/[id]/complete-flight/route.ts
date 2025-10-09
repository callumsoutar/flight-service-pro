import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { getOrganizationTaxRate } from "@/lib/tax-rates";
import { InvoiceService } from "@/lib/invoice-service";
import { generateRequiredItems, matchInvoiceItems } from "@/lib/invoice-item-upsert";
import { updateAircraftOnBookingCompletion } from "@/lib/aircraft-update";

/**
 * Unified endpoint for booking completion workflow
 * Handles both 'calculate' and 'complete' actions
 */

interface MeterReadings {
  hobbsStart: number;
  hobbsEnd: number;
  tachStart: number;
  tachEnd: number;
  soloEndHobbs?: number;
}

interface CompleteFlightRequest {
  action: 'calculate' | 'complete';

  // For calculate action (DEPRECATED - use /calculate-preview instead)
  meterReadings?: MeterReadings;
  flightTypeId?: string;
  instructorId?: string;
  soloFlightTypeId?: string;

  // For complete action - now requires ALL data for atomic creation
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
    chargeable_id?: string | null;
  }>;
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
    const body: CompleteFlightRequest = await req.json();
    const { action } = body;

    if (action === 'calculate') {
      return await handleCalculate(supabase, bookingId, body, user.id);
    } else if (action === 'complete') {
      return await handleComplete(supabase, bookingId, body, user.id);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle 'calculate' action - update flight log and generate invoice items
 */
async function handleCalculate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  body: CompleteFlightRequest,
  userId: string
): Promise<NextResponse> {
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

  // 1. Fetch booking with relations
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
  const { data: userRole } = await supabase.rpc('get_user_role', { user_id: userId });
  const isPrivileged = userRole && ['admin', 'owner', 'instructor'].includes(userRole);
  const isOwnBooking = booking.user_id === userId;
  
  if (!isPrivileged && !isOwnBooking) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Get aircraft to determine billing method and total_time_method
  const aircraftId = booking.flight_logs?.[0]?.checked_out_aircraft_id || booking.aircraft_id;
  const { data: aircraft } = await supabase
    .from('aircraft')
    .select('id, registration, total_time_method, total_hours, aircraft_type_id')
    .eq('id', aircraftId)
    .single();

  if (!aircraft) {
    return NextResponse.json({ error: "Aircraft not found" }, { status: 404 });
  }

  // 3. Get aircraft charge rate to determine billing method
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
  // For NEW calculations: Use aircraft's current total_hours as the starting point
  // For RECALCULATIONS: Use the existing flight_log.total_hours_start to preserve the original baseline
  // This prevents double-counting when updating meter readings on already-completed flights
  let totalHoursStart = aircraft.total_hours || 0;
  
  // Check if this booking already has a flight_log with total_hours_start set
  const existingFlightLog = booking.flight_logs?.[0];
  if (existingFlightLog && existingFlightLog.total_hours_start !== null && existingFlightLog.total_hours_start !== undefined) {
    // Use existing baseline - this is a recalculation
    totalHoursStart = existingFlightLog.total_hours_start;
  } else {
    // First-time calculation - use current aircraft total_hours
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
      creditedTime = hobbsTime; // Fallback
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

  // 6. Determine instruction type and calculate dual/solo times
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

  // 7. Update or create flight log
  let flightLog = booking.flight_logs?.[0];

  const flightLogData = {
    hobbs_start: round(meterReadings.hobbsStart),
    hobbs_end: round(meterReadings.hobbsEnd),
    tach_start: round(meterReadings.tachStart),
    tach_end: round(meterReadings.tachEnd),
    solo_end_hobbs: meterReadings.soloEndHobbs ? round(meterReadings.soloEndHobbs) : null,
    flight_time_hobbs: hobbsTime,
    flight_time_tach: tachTime,
    flight_time: flightTime,
    dual_time: dualTime > 0 ? dualTime : null,
    solo_time: soloTime > 0 ? soloTime : null,
    total_hours_start: totalHoursStart,
    total_hours_end: totalHoursEnd,
    actual_end: new Date().toISOString(), // Set completion timestamp
  };

  if (flightLog) {
    const { data: updated } = await supabase
      .from('flight_logs')
      .update(flightLogData)
      .eq('id', flightLog.id)
      .select('*')
      .single();
    flightLog = updated;
  } else {
    const { data: created } = await supabase
      .from('flight_logs')
      .insert({
        booking_id: bookingId,
        checked_out_aircraft_id: aircraftId,
        ...flightLogData,
      })
      .select('*')
      .single();
    flightLog = created;
  }

  // 8. Get or create invoice
  let invoice;
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (existingInvoice) {
    invoice = existingInvoice;
  } else {
    const taxRate = await getOrganizationTaxRate();
    const { data: newInvoice } = await supabase
      .from('invoices')
      .insert({
        user_id: booking.user_id,
        booking_id: bookingId,
        status: 'draft',
        tax_rate: taxRate,
        subtotal: 0,
        tax_total: 0,
        total_amount: 0,
        balance_due: 0,
      })
      .select('*')
      .single();
    invoice = newInvoice;
  }

  // 9. Get instructor rate (if needed)
  let instructorRate = 0;
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
  }

  // 10. Get solo rate (if needed)
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

  // 11. Get instructor name
  let instructorName = 'Instructor';
  if (instructorId) {
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

  // 12. Generate required invoice items
  const requiredItems = generateRequiredItems({
    instructionType,
    dualTime,
    soloTime,
    aircraftRate: chargeRate.rate_per_hour,
    instructorRate,
    soloAircraftRate: soloRate,
    flightTypeName: flightType.name,
    aircraftReg: aircraft.registration,
    instructorName,
    taxRate: invoice.tax_rate,
  });

  // 13. Get current invoice items
  const { data: currentItems } = await supabase
    .from('invoice_items')
    .select('id, description, quantity, unit_price, deleted_at')
    .eq('invoice_id', invoice.id)
    .is('deleted_at', null);

  // 14. Match and execute UPSERT operations
  const actions = matchInvoiceItems(currentItems || [], requiredItems);

  for (const action of actions) {
    if (action.action === 'update' && action.existingId) {
      const required = action.data as { quantity: number; unit_price: number; tax_rate: number };
      const amounts = InvoiceService.calculateItemAmounts({
        quantity: required.quantity,
        unit_price: required.unit_price,
        tax_rate: required.tax_rate,
      });

      await supabase
        .from('invoice_items')
        .update({
          quantity: required.quantity,
          unit_price: required.unit_price,
          tax_rate: required.tax_rate,
          amount: amounts.amount,
          tax_amount: amounts.tax_amount,
          line_total: amounts.line_total,
          rate_inclusive: amounts.rate_inclusive,
        })
        .eq('id', action.existingId);
    } else if (action.action === 'insert') {
      const required = action.data as { description: string; quantity: number; unit_price: number; tax_rate: number; chargeable_id?: string | null };
      const amounts = InvoiceService.calculateItemAmounts({
        quantity: required.quantity,
        unit_price: required.unit_price,
        tax_rate: required.tax_rate,
      });

      await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          description: required.description,
          quantity: required.quantity,
          unit_price: required.unit_price,
          tax_rate: required.tax_rate,
          chargeable_id: required.chargeable_id || null,
          amount: amounts.amount,
          tax_amount: amounts.tax_amount,
          line_total: amounts.line_total,
          rate_inclusive: amounts.rate_inclusive,
        });
    } else if (action.action === 'delete') {
      const itemId = (action.data as { id: string }).id;
      await supabase
        .from('invoice_items')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .eq('id', itemId);
    }
  }

  // 15. Fetch updated invoice items and calculate totals using InvoiceService
  const { data: updatedItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  // Use InvoiceService for consistent totals calculation with proper rounding
  const totals = InvoiceService.calculateInvoiceTotals(updatedItems || []);

  return NextResponse.json({
    booking,
    flightLog,
    invoice,
    invoiceItems: updatedItems || [],
    aircraft,
    totals: {
      subtotal: totals.subtotal,
      tax: totals.tax_total,
      total: totals.total_amount
    },
  });
}

/**
 * Handle 'complete' action - atomically create flight_log, invoice, and invoice_items
 */
async function handleComplete(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  body: CompleteFlightRequest,
  userId: string
): Promise<NextResponse> {
  const { meterReadings, flightTypeId, invoiceItems } = body;

  // Validate required fields for atomic completion
  if (!meterReadings || !flightTypeId || !invoiceItems || invoiceItems.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields for completion" },
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
    .from('bookings')
    .select(`
      *,
      user:user_id(id, first_name, last_name, email),
      flight_type:flight_type_id(*),
      flight_logs(
        *,
        checked_out_aircraft:checked_out_aircraft_id(*)
      )
    `)
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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

  // 3. Get aircraft charge rate to determine billing method
  const { data: chargeRate } = await supabase
    .from('aircraft_charge_rates')
    .select('rate_per_hour, charge_hobbs, charge_tacho')
    .eq('aircraft_id', aircraftId)
    .eq('flight_type_id', flightTypeId)
    .single();

  if (!chargeRate) {
    return NextResponse.json({ error: "No charge rate configured for this aircraft and flight type" }, { status: 400 });
  }

  const chargingBy = chargeRate.charge_hobbs ? 'hobbs' : chargeRate.charge_tacho ? 'tacho' : null;

  // 4. Calculate flight times
  const hobbsTime = round(meterReadings.hobbsEnd - meterReadings.hobbsStart);
  const tachTime = round(meterReadings.tachEnd - meterReadings.tachStart);

  // 5. Calculate total_hours
  let totalHoursStart = aircraft.total_hours || 0;
  const existingFlightLog = booking.flight_logs?.[0];
  if (existingFlightLog && existingFlightLog.total_hours_start !== null) {
    totalHoursStart = existingFlightLog.total_hours_start;
  }

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
    dualTime = chargingBy === 'hobbs' ? hobbsTime : tachTime;
  }

  const flightTime = round(dualTime + soloTime);

  // 7. Create or update flight log
  let flightLog = existingFlightLog;
  const flightLogData = {
    hobbs_start: round(meterReadings.hobbsStart),
    hobbs_end: round(meterReadings.hobbsEnd),
    tach_start: round(meterReadings.tachStart),
    tach_end: round(meterReadings.tachEnd),
    solo_end_hobbs: meterReadings.soloEndHobbs ? round(meterReadings.soloEndHobbs) : null,
    flight_time_hobbs: hobbsTime,
    flight_time_tach: tachTime,
    flight_time: flightTime,
    dual_time: dualTime > 0 ? dualTime : null,
    solo_time: soloTime > 0 ? soloTime : null,
    total_hours_start: totalHoursStart,
    total_hours_end: totalHoursEnd,
    actual_end: new Date().toISOString(), // Set completion timestamp
  };

  if (flightLog) {
    const { data: updated } = await supabase
      .from('flight_logs')
      .update(flightLogData)
      .eq('id', flightLog.id)
      .select('*')
      .single();
    flightLog = updated;
  } else {
    const { data: created } = await supabase
      .from('flight_logs')
      .insert({
        booking_id: bookingId,
        checked_out_aircraft_id: aircraftId,
        ...flightLogData,
      })
      .select('*')
      .single();
    flightLog = created;
  }

  // 8. Create or get invoice
  let invoice;
  let invoiceWarning: string | undefined;
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  const taxRate = await getOrganizationTaxRate();

  if (existingInvoice) {
    // Check if invoice is already finalized (paid, pending, overdue)
    // These statuses are protected by the prevent_invoice_modification trigger
    const isFinalized = ['paid', 'pending', 'overdue'].includes(existingInvoice.status);
    
    if (isFinalized) {
      // For finalized invoices, don't modify the invoice header
      // Only invoice items can be updated
      invoice = existingInvoice;
      invoiceWarning = `Invoice ${existingInvoice.invoice_number} is ${existingInvoice.status}. Only invoice items were updated - invoice details remain unchanged.`;
    } else {
      // For draft invoices, update normally
      const invoiceNumber = await InvoiceService.generateInvoiceNumber();
      const { data: updated, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'pending',
          invoice_number: invoiceNumber,
          issue_date: new Date().toISOString(),
          tax_rate: taxRate,
        })
        .eq('id', existingInvoice.id)
        .select('*')
        .single();
      
      if (updateError) {
        return NextResponse.json({ error: `Failed to update invoice: ${updateError.message}` }, { status: 500 });
      }
      invoice = updated;
    }
  } else {
    // Create new invoice
    const invoiceNumber = await InvoiceService.generateInvoiceNumber();
    const { data: created, error: createError } = await supabase
      .from('invoices')
      .insert({
        user_id: booking.user_id,
        booking_id: bookingId,
        status: 'pending',
        invoice_number: invoiceNumber,
        issue_date: new Date().toISOString(),
        tax_rate: taxRate,
        subtotal: 0,
        tax_total: 0,
        total_amount: 0,
        balance_due: 0,
      })
      .select('*')
      .single();
    
    if (createError) {
      return NextResponse.json({ error: `Failed to create invoice: ${createError.message}` }, { status: 500 });
    }
    invoice = created;
  }

  if (!invoice) {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }

  // 9. Get existing invoice items
  const { data: existingItems } = await supabase
    .from('invoice_items')
    .select('id, deleted_at')
    .eq('invoice_id', invoice.id)
    .is('deleted_at', null);

  const existingItemIds = new Set(existingItems?.map(i => i.id) || []);
  const processedItemIds = new Set<string>();

  // 10. Upsert invoice items
  for (const item of invoiceItems) {
    // Recalculate amounts for safety
    const calculatedAmounts = InvoiceService.calculateItemAmounts({
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate || 0,
    });

    const itemData = {
      invoice_id: invoice.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate || 0,
      description: item.description,
      chargeable_id: item.chargeable_id || null,
      amount: calculatedAmounts.amount,
      tax_amount: calculatedAmounts.tax_amount,
      line_total: calculatedAmounts.line_total,
      rate_inclusive: calculatedAmounts.rate_inclusive,
    };

    // Check if this is an existing item (not a temp ID)
    const isExistingItem = !item.id.startsWith('temp-') && existingItemIds.has(item.id);

    if (isExistingItem) {
      // Update existing item
      await supabase
        .from('invoice_items')
        .update(itemData)
        .eq('id', item.id);
      processedItemIds.add(item.id);
    } else {
      // Insert new item
      await supabase
        .from('invoice_items')
        .insert(itemData);
    }
  }

  // 11. Delete items that existed but are no longer in the list
  const itemsToDelete = Array.from(existingItemIds).filter(id => !processedItemIds.has(id));
  if (itemsToDelete.length > 0) {
    await supabase
      .from('invoice_items')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .in('id', itemsToDelete);
  }

  // 12. Update invoice totals and create transaction
  await InvoiceService.updateInvoiceTotalsWithTransactionSync(invoice.id);

  // 13. Update booking status
  await supabase
    .from('bookings')
    .update({ status: 'complete' })
    .eq('id', bookingId);

  // 14. Update aircraft meters
  try {
    await updateAircraftOnBookingCompletion(supabase, bookingId);
  } catch {
    // Aircraft update failed - continue with completion
  }

  // 13. Fetch final data
  const { data: updatedBooking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  const { data: updatedInvoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoice.id)
    .single();

  return NextResponse.json({
    booking: updatedBooking,
    invoice: updatedInvoice,
    success: true,
    warning: invoiceWarning,
  });
}

