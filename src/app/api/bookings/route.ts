import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Auth error in /api/bookings:", authError);
    return NextResponse.json({ error: "Authentication failed", details: authError.message }, { status: 401 });
  }
  if (!user) {
    console.error("No user found in /api/bookings");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const searchParams = req.nextUrl.searchParams;
  const bookingId = searchParams.get("id");

  try {
    let query = supabase
      .from("bookings")
      .select(`
        *,
        user:user_id(id, first_name, last_name, email),
        instructor:instructor_id(*),
        aircraft:aircraft_id(id, registration, type)
      `);

    if (bookingId) {
      query = query.eq("id", bookingId);
      const { data, error } = await query.single();
      if (error) {
        console.error("Error fetching single booking:", error);
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ booking: normalizeBookingTimestamps(data) });
    }

    const { data, error } = await query.order("start_time", { ascending: false });
    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ bookings: (data ?? []).map(normalizeBookingTimestamps) });
  } catch (error) {
    console.error("Unexpected error in /api/bookings:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const requiredFields = ["user_id", "aircraft_id", "start_time", "end_time", "purpose", "booking_type"];
  for (const field of requiredFields) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }
  // Compose insert payload
  const insertPayload: Record<string, unknown> = {
    user_id: body.user_id,
    aircraft_id: body.aircraft_id,
    start_time: body.start_time,
    end_time: body.end_time,
    purpose: body.purpose,
    booking_type: body.booking_type,
    // Optional fields
    instructor_id: body.instructor_id || null,
    remarks: body.remarks || null,
    lesson_id: body.lesson_id || null,
    flight_type_id: body.flight_type_id || null,
    status: body.status || "unconfirmed",
    cancellation_reason: body.cancellation_reason || null,
    cancellation_category_id: body.cancellation_category_id || null,
  };
  const { data, error } = await supabase
    .from("bookings")
    .insert([insertPayload])
    .select(`
      *,
      user:user_id(id, first_name, last_name, email),
      instructor:instructor_id(*),
      aircraft:aircraft_id(id, registration, type)
    `)
    .single();
  if (error) {
    // Handle exclusion constraint (double-booking) errors
    if (
      error.code === "23P01" ||
      (error.message && (
        error.message.includes("no_aircraft_overlap") ||
        error.message.includes("no_instructor_overlap")
      ))
    ) {
      let msg = "This resource is already booked for the selected time.";
      if (error.message.includes("no_aircraft_overlap")) {
        msg = "The selected aircraft is already booked for this time.";
      } else if (error.message.includes("no_instructor_overlap")) {
        msg = "The selected instructor is already booked for this time.";
      }
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ booking: normalizeBookingTimestamps(data) });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { id, ...updateFields } = body;
  if (!id) {
    return NextResponse.json({ error: "Booking id is required" }, { status: 400 });
  }
  // Only allow patching safe fields
  const allowedFields = [
    "start_time", "end_time", "purpose", "remarks", "instructor_id", "user_id", "aircraft_id", "lesson_id", "flight_type_id", "booking_type", "status",
    "checked_out_aircraft_id", "checked_out_instructor_id", // <-- allow these fields
    // Add meter fields for patching
    "hobbs_start", "hobbs_end", "tach_start", "tach_end",
    // Add cancellation fields
    "cancellation_reason", "cancellation_category_id"
  ];
  const updates: Record<string, unknown> = {};
  
  // UUID fields that should be converted from empty strings to null
  const uuidFields = ["instructor_id", "user_id", "aircraft_id", "lesson_id", "flight_type_id", "checked_out_aircraft_id", "checked_out_instructor_id", "cancellation_category_id"];
  
  for (const key of allowedFields) {
    if (key in updateFields) {
      let value = updateFields[key];
      
      // Convert empty strings to null for UUID fields to prevent PostgreSQL errors
      if (uuidFields.includes(key) && typeof value === 'string' && value.trim() === '') {
        value = null;
      }
      
      updates[key] = value;
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  
  // First, get the existing booking to check for status changes
  const { data: existingBooking, error: existingError } = await supabase
    .from("bookings")
    .select("status, checked_out_aircraft_id, hobbs_start, hobbs_end, tach_start, tach_end")
    .eq("id", id)
    .single();
  
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 404 });
  }

  const { error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id);
  if (error) {
    // Handle exclusion constraint (double-booking) errors
    if (
      error.code === "23P01" ||
      (error.message && (
        error.message.includes("no_aircraft_overlap") ||
        error.message.includes("no_instructor_overlap")
      ))
    ) {
      let msg = "This resource is already booked for the selected time.";
      if (error.message.includes("no_aircraft_overlap")) {
        msg = "The selected aircraft is already booked for this time.";
      } else if (error.message.includes("no_instructor_overlap")) {
        msg = "The selected instructor is already booked for this time.";
      }
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Handle aircraft updates for booking completion or meter corrections
  if (existingBooking.checked_out_aircraft_id) {
    try {
      // Case 1: Booking being set to 'complete' for the first time
      if (updates.status === 'complete' && existingBooking.status !== 'complete') {
        await updateAircraftOnBookingCompletion(supabase, existingBooking, updates);
      }
      // Case 2: Booking is already 'complete' and meter readings are being corrected
      else if (existingBooking.status === 'complete' && isMeterCorrection(existingBooking, updates)) {
        await handleMeterCorrection(supabase, id, existingBooking, updates, user.id);
      }
    } catch (aircraftError) {
      console.error('Failed to update aircraft:', aircraftError);
      // Don't fail the booking update if aircraft update fails - log the error
      // The booking is already updated, but aircraft meters might be out of sync
    }
  }

  // Fetch and return the updated booking (including flight_time)
  const { data: updatedBooking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  return NextResponse.json({ booking: normalizeBookingTimestamps(updatedBooking) });
}

// Type for booking data with the fields used in aircraft updates
type BookingForAircraftUpdate = {
  checked_out_aircraft_id: string;
  hobbs_start: number | null;
  hobbs_end: number | null;
  tach_start: number | null;
  tach_end: number | null;
  status: string;
};

// Type for update fields that affect aircraft
type BookingUpdatesForAircraft = {
  hobbs_start?: number | null;
  hobbs_end?: number | null;
  tach_start?: number | null;
  tach_end?: number | null;
  status?: string;
};

async function updateAircraftOnBookingCompletion(
  supabase: SupabaseClient,
  existingBooking: BookingForAircraftUpdate,
  updates: BookingUpdatesForAircraft
) {
  const aircraftId = existingBooking.checked_out_aircraft_id;
  
  // Get final meter readings - prefer updated values, fall back to existing
  const finalHobbsEnd = updates.hobbs_end ?? existingBooking.hobbs_end;
  const finalTachEnd = updates.tach_end ?? existingBooking.tach_end;
  const finalHobbsStart = updates.hobbs_start ?? existingBooking.hobbs_start;
  const finalTachStart = updates.tach_start ?? existingBooking.tach_start;
  
  // Validate that we have the required meter readings
  if (!finalHobbsEnd || !finalTachEnd || !finalHobbsStart || !finalTachStart) {
    console.log('Skipping aircraft update - missing meter readings');
    return;
  }

  // Get aircraft data including total_time_method
  const { data: aircraft, error: aircraftFetchError } = await supabase
    .from('aircraft')
    .select('total_time_method, total_hours, current_hobbs, current_tach')
    .eq('id', aircraftId)
    .single();
    
  if (aircraftFetchError) {
    throw new Error(`Failed to fetch aircraft data: ${aircraftFetchError.message}`);
  }

  // Calculate flight time based on total_time_method
  const hobbsTime = finalHobbsEnd - finalHobbsStart;
  const tachoTime = finalTachEnd - finalTachStart;
  
  let flightTimeToAdd = 0;
  switch (aircraft.total_time_method) {
    case 'hobbs':
      flightTimeToAdd = hobbsTime;
      break;
    case 'tacho':
      flightTimeToAdd = tachoTime;
      break;
    case 'airswitch':
      // TODO: Add airswitch meter fields to schema
      // For now, fallback to hobbs time until airswitch meters are implemented
      flightTimeToAdd = hobbsTime;
      console.warn(`Aircraft ${aircraftId} uses airswitch method but no airswitch meters available - using hobbs time`);
      break;
    case 'hobbs less 5%':
      flightTimeToAdd = hobbsTime * 0.95;
      break;
    case 'hobbs less 10%':
      flightTimeToAdd = hobbsTime * 0.90;
      break;
    case 'tacho less 5%':
      flightTimeToAdd = tachoTime * 0.95;
      break;
    case 'tacho less 10%':
      flightTimeToAdd = tachoTime * 0.90;
      break;
    default:
      // Default to hobbs if no method specified
      flightTimeToAdd = hobbsTime;
      console.warn(`Unknown total_time_method '${aircraft.total_time_method}' for aircraft ${aircraftId} - using hobbs time`);
      break;
  }

  // Update aircraft current meters and total hours
  const newTotalHours = (aircraft.total_hours || 0) + flightTimeToAdd;
  
  const { error: updateError } = await supabase
    .from('aircraft')
    .update({
      current_hobbs: finalHobbsEnd,
      current_tach: finalTachEnd,
      total_hours: newTotalHours,
      updated_at: new Date().toISOString()
    })
    .eq('id', aircraftId);
    
  if (updateError) {
    throw new Error(`Failed to update aircraft: ${updateError.message}`);
  }

  console.log(`Aircraft ${aircraftId} updated: meters set to H:${finalHobbsEnd}/T:${finalTachEnd}, total_hours: ${aircraft.total_hours} -> ${newTotalHours} (+${flightTimeToAdd.toFixed(2)})`);
}

function isMeterCorrection(existingBooking: BookingForAircraftUpdate, updates: BookingUpdatesForAircraft): boolean {
  // Check if any meter readings are being updated
  return (
    (updates.hobbs_start !== undefined && updates.hobbs_start !== existingBooking.hobbs_start) ||
    (updates.hobbs_end !== undefined && updates.hobbs_end !== existingBooking.hobbs_end) ||
    (updates.tach_start !== undefined && updates.tach_start !== existingBooking.tach_start) ||
    (updates.tach_end !== undefined && updates.tach_end !== existingBooking.tach_end)
  );
}

async function handleMeterCorrection(
  supabase: SupabaseClient,
  bookingId: string,
  existingBooking: BookingForAircraftUpdate,
  updates: BookingUpdatesForAircraft,
  userId: string
) {
  const aircraftId = existingBooking.checked_out_aircraft_id;
  
  // Get current aircraft data
  const { data: aircraft, error: aircraftFetchError } = await supabase
    .from('aircraft')
    .select('total_time_method, total_hours, current_hobbs, current_tach')
    .eq('id', aircraftId)
    .single();
    
  if (aircraftFetchError) {
    throw new Error(`Failed to fetch aircraft data: ${aircraftFetchError.message}`);
  }

  // Calculate old flight time and credited time
  // Validate that existing booking has meter readings for correction
  if (!existingBooking.hobbs_start || !existingBooking.hobbs_end || !existingBooking.tach_start || !existingBooking.tach_end) {
    throw new Error('Cannot perform meter correction: existing booking missing meter readings');
  }
  
  const oldHobbsTime = existingBooking.hobbs_end - existingBooking.hobbs_start;
  const oldTachoTime = existingBooking.tach_end - existingBooking.tach_start;
  const oldCreditedTime = calculateCreditedTimeFromMethod(oldHobbsTime, oldTachoTime, aircraft.total_time_method);

  // Get new meter readings (prefer updates, fall back to existing)
  const newHobbsStart = updates.hobbs_start ?? existingBooking.hobbs_start;
  const newHobbsEnd = updates.hobbs_end ?? existingBooking.hobbs_end;
  const newTachStart = updates.tach_start ?? existingBooking.tach_start;
  const newTachEnd = updates.tach_end ?? existingBooking.tach_end;

  // Validate new meter readings
  if (!newHobbsStart || !newHobbsEnd || !newTachStart || !newTachEnd) {
    throw new Error('All meter readings are required for corrections');
  }

  if (newHobbsEnd < newHobbsStart || newTachEnd < newTachStart) {
    throw new Error('End meter readings must be greater than start readings');
  }

  // Calculate new flight time and credited time
  const newHobbsTime = newHobbsEnd - newHobbsStart;
  const newTachoTime = newTachEnd - newTachStart;
  const newCreditedTime = calculateCreditedTimeFromMethod(newHobbsTime, newTachoTime, aircraft.total_time_method);

  // Calculate the difference
  const creditedTimeDifference = newCreditedTime - oldCreditedTime;
  const hobbsDifference = newHobbsTime - oldHobbsTime;
  const tachoDifference = newTachoTime - oldTachoTime;

  // Update aircraft total_hours and current meters
  const newTotalHours = aircraft.total_hours + creditedTimeDifference;
  
  const { error: updateError } = await supabase
    .from('aircraft')
    .update({
      current_hobbs: newHobbsEnd,
      current_tach: newTachEnd,
      total_hours: newTotalHours,
      updated_at: new Date().toISOString()
    })
    .eq('id', aircraftId);
    
  if (updateError) {
    throw new Error(`Failed to update aircraft: ${updateError.message}`);
  }

  // Create audit trail in aircraft_tech_log
  const correctionDescription = `Meter correction for booking ${bookingId}: ` +
    `Hobbs ${oldHobbsTime.toFixed(2)}h -> ${newHobbsTime.toFixed(2)}h (${hobbsDifference >= 0 ? '+' : ''}${hobbsDifference.toFixed(2)}h), ` +
    `Tacho ${oldTachoTime.toFixed(2)}h -> ${newTachoTime.toFixed(2)}h (${tachoDifference >= 0 ? '+' : ''}${tachoDifference.toFixed(2)}h), ` +
    `Credited time adjustment: ${creditedTimeDifference >= 0 ? '+' : ''}${creditedTimeDifference.toFixed(2)}h`;

  const { error: logError } = await supabase
    .from('aircraft_tech_log')
    .insert({
      aircraft_id: aircraftId,
      entry_type: 'meter_correction',
      description: correctionDescription,
      hours: creditedTimeDifference,
      created_by: userId,
      entry_date: new Date().toISOString(),
      notes: JSON.stringify({
        booking_id: bookingId,
        old_meters: {
          hobbs_start: existingBooking.hobbs_start,
          hobbs_end: existingBooking.hobbs_end,
          tach_start: existingBooking.tach_start,
          tach_end: existingBooking.tach_end,
          flight_time_hobbs: oldHobbsTime,
          flight_time_tach: oldTachoTime,
          credited_time: oldCreditedTime
        },
        new_meters: {
          hobbs_start: newHobbsStart,
          hobbs_end: newHobbsEnd,
          tach_start: newTachStart,
          tach_end: newTachEnd,
          flight_time_hobbs: newHobbsTime,
          flight_time_tach: newTachoTime,
          credited_time: newCreditedTime
        },
        total_hours_before: aircraft.total_hours,
        total_hours_after: newTotalHours,
        calculation_method: aircraft.total_time_method
      })
    });

  if (logError) {
    console.error('Failed to create audit log for meter correction:', logError);
    // Don't fail the correction if audit logging fails
  }

  console.log(`Aircraft ${aircraftId} meter correction: booking ${bookingId}, credited time ${oldCreditedTime.toFixed(2)} -> ${newCreditedTime.toFixed(2)} (${creditedTimeDifference >= 0 ? '+' : ''}${creditedTimeDifference.toFixed(2)}h), total_hours: ${aircraft.total_hours} -> ${newTotalHours}`);
}

function calculateCreditedTimeFromMethod(hobbsTime: number, tachoTime: number, method: string): number {
  switch (method) {
    case 'hobbs':
      return hobbsTime;
    case 'tacho':
      return tachoTime;
    case 'hobbs less 5%':
      return hobbsTime * 0.95;
    case 'hobbs less 10%':
      return hobbsTime * 0.90;
    case 'tacho less 5%':
      return tachoTime * 0.95;
    case 'tacho less 10%':
      return tachoTime * 0.90;
    case 'airswitch':
      // For now, default to hobbs - can be enhanced later
      return hobbsTime;
    default:
      return hobbsTime;
  }
}

function isLegacyDateString(val: string) {
  // Matches 'YYYY-MM-DD HH:MM:SS+00' (legacy format)
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00$/.test(val);
}

function normalizeBookingTimestamps(booking: Record<string, unknown> | null) {
  if (!booking) return booking;
  // Normalize start_time and end_time to ISO 8601 (with T and Z) only if legacy format
  if (booking.start_time && typeof booking.start_time === 'string' && isLegacyDateString(booking.start_time)) {
    const d = new Date(booking.start_time.replace(' ', 'T').replace('+00', 'Z'));
    booking.start_time = isNaN(d.getTime()) ? booking.start_time : d.toISOString();
  }
  if (booking.end_time && typeof booking.end_time === 'string' && isLegacyDateString(booking.end_time)) {
    const d = new Date(booking.end_time.replace(' ', 'T').replace('+00', 'Z'));
    booking.end_time = isNaN(d.getTime()) ? booking.end_time : d.toISOString();
  }
  return booking;
} 