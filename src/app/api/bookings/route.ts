import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { sendBookingConfirmation, sendBookingUpdate } from "@/lib/email/booking-emails";
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

  // Role authorization check
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  // All authenticated users can access bookings, but with different data levels
  const isPrivilegedUser = userRole && ['admin', 'owner', 'instructor'].includes(userRole);
  const isRestrictedUser = userRole && ['member', 'student'].includes(userRole);

  if (!isPrivilegedUser && !isRestrictedUser) {
    return NextResponse.json({ 
      error: 'Forbidden: Booking access requires a valid role' 
    }, { status: 403 });
  }
  
  const searchParams = req.nextUrl.searchParams;
  const bookingId = searchParams.get("id");
  const date = searchParams.get("date"); // YYYY-MM-DD format
  const range = parseInt(searchParams.get("range") || "0", 10); // Number of days before and after

  try {
    let query = supabase
      .from("bookings")
      .select(`
        *,
        user:user_id(id, first_name, last_name, email),
        instructor:instructor_id(*),
        aircraft:aircraft_id(id, registration, type),
        authorization_override,
        authorization_override_by,
        authorization_override_at,
        authorization_override_reason,
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
      `);

    if (bookingId) {
      query = query.eq("id", bookingId);
      const { data, error } = await query.single();
      if (error) {
        console.error("Error fetching single booking:", error);
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      // Check if user has permission to view detailed booking information
      // Users can only view their own booking details, unless they are admin/owner/instructor
      const { data: userRole } = await supabase.rpc('get_user_role', {
        user_id: user.id
      });
      
      const isPrivilegedUser = userRole && ['admin', 'owner', 'instructor'].includes(userRole);
      const isOwnBooking = data.user_id === user.id;
      
      if (!isPrivilegedUser && !isOwnBooking) {
        return NextResponse.json({ error: "Forbidden: You can only view your own booking details" }, { status: 403 });
      }
      
      return NextResponse.json({ booking: normalizeBookingTimestamps(data) });
    }

    // Filter by date if provided (for scheduler performance)
    if (date) {
      // Calculate date range accounting for timezone differences
      const baseDate = new Date(date);
      const startDate = new Date(baseDate);
      startDate.setDate(baseDate.getDate() - range);
      const endDate = new Date(baseDate);
      endDate.setDate(baseDate.getDate() + range + 1); // +1 to include the end date

      const startOfRange = startDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
      const endOfRange = endDate.toISOString().split('T')[0] + 'T23:59:59.999Z';

      query = query.gte("start_time", startOfRange).lte("start_time", endOfRange);
    }

    // For restricted users (members/students), only show their own bookings unless it's for scheduler
    if (isRestrictedUser && !date) {
      // Non-scheduler requests: only show user's own bookings
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query.order("start_time", { ascending: false });
    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter sensitive data for restricted users
    const responseData = isRestrictedUser 
      ? (data ?? []).map(filterBookingData)
      : (data ?? []);

    return NextResponse.json({ bookings: responseData.map(normalizeBookingTimestamps) });
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

  // Role authorization check
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  // All authenticated users can create bookings, but with restrictions
  const isPrivilegedUser = userRole && ['admin', 'owner', 'instructor'].includes(userRole);
  const isRestrictedUser = userRole && ['member', 'student'].includes(userRole);

  if (!isPrivilegedUser && !isRestrictedUser) {
    return NextResponse.json({ 
      error: 'Forbidden: Booking creation requires a valid role' 
    }, { status: 403 });
  }
  
  const body = await req.json();
  const requiredFields = ["aircraft_id", "start_time", "end_time", "purpose", "booking_type"];
  for (const field of requiredFields) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  // Restricted users can only create bookings for themselves
  if (isRestrictedUser && body.user_id && body.user_id !== user.id) {
    return NextResponse.json({ 
      error: 'Forbidden: You can only create bookings for yourself' 
    }, { status: 403 });
  }

  // If no user_id provided and user is restricted, set to current user
  if (isRestrictedUser && !body.user_id) {
    body.user_id = user.id;
  }
  // Check for conflicts before attempting to insert
  try {
    await checkBookingConflicts(supabase, {
      aircraft_id: body.aircraft_id,
      instructor_id: body.instructor_id,
      start_time: body.start_time,
      end_time: body.end_time,
      excludeBookingId: null // For new bookings, don't exclude any existing booking
    });
  } catch (conflictError) {
    return NextResponse.json({ 
      error: conflictError instanceof Error ? conflictError.message : "Resource conflict detected" 
    }, { status: 409 });
  }

  // Note: Type rating validation is handled in the frontend as a warning only.
  // The backend allows booking creation regardless of type rating status.
  // This ensures bookings can be created even if instructors lack type ratings,
  // with appropriate warnings displayed in the UI.

  // Compose insert payload
  const insertPayload: Record<string, unknown> = {
    aircraft_id: body.aircraft_id,
    start_time: body.start_time,
    end_time: body.end_time,
    purpose: body.purpose,
    booking_type: body.booking_type,
    // Optional fields
    user_id: body.user_id || null,
    instructor_id: body.instructor_id || null,
    remarks: body.remarks || null,
    lesson_id: body.lesson_id || null,
    flight_type_id: body.flight_type_id || null,
    status: body.status || "unconfirmed",

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

  // Send confirmation email after successful booking creation
  // Skip email if this is part of a bulk operation (recurring bookings)
  const skipEmail = req.nextUrl.searchParams.get('skip_email') === 'true';

  try {
    if (!skipEmail && data && data.user && data.user.email) {
      // Prepare additional booking data for email
      let instructor = null;
      if (data.instructor && data.instructor.users) {
        const instructorUser = Array.isArray(data.instructor.users) 
          ? data.instructor.users[0] 
          : data.instructor.users;
        
        instructor = {
          name: `${instructorUser?.first_name || ''} ${instructorUser?.last_name || ''}`.trim() || 
                instructorUser?.email || 
                data.instructor.id,
          email: instructorUser?.email,
        };
      }

      // Get lesson and flight type names if available
      let lesson = null;
      let flightType = null;
      
      if (data.lesson_id) {
        const { data: lessonData } = await supabase
          .from('lessons')
          .select('name')
          .eq('id', data.lesson_id)
          .single();
        lesson = lessonData ? { name: lessonData.name } : null;
      }

      if (data.flight_type_id) {
        const { data: flightTypeData } = await supabase
          .from('flight_types')
          .select('name')
          .eq('id', data.flight_type_id)
          .single();
        flightType = flightTypeData ? { name: flightTypeData.name } : null;
      }

      // Send the email in the background - don't wait for it to complete
      sendBookingConfirmation({
        booking: data,
        member: data.user,
        aircraft: data.aircraft,
        instructor,
        lesson,
        flightType,
      }).catch((emailError) => {
        console.error('Failed to send booking confirmation email:', emailError);
        // Don't fail the booking creation if email fails
      });
    }
  } catch (emailError) {
    console.error('Error in email sending process:', emailError);
    // Don't fail the booking creation if email process fails
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

  // Role authorization check
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  const isPrivilegedUser = userRole && ['admin', 'owner', 'instructor'].includes(userRole);
  const isRestrictedUser = userRole && ['member', 'student'].includes(userRole);

  if (!isPrivilegedUser && !isRestrictedUser) {
    return NextResponse.json({ 
      error: 'Forbidden: Booking modification requires a valid role' 
    }, { status: 403 });
  }
  
  const body = await req.json();
  const { id, ...updateFields } = body;
  if (!id) {
    return NextResponse.json({ error: "Booking id is required" }, { status: 400 });
  }

  // Check if restricted user can modify this booking (only their own)
  if (isRestrictedUser) {
    const { data: existingBooking, error: checkError } = await supabase
      .from("bookings")
      .select("user_id")
      .eq("id", id)
      .single();
    
    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 404 });
    }
    
    if (existingBooking.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Forbidden: You can only modify your own bookings' 
      }, { status: 403 });
    }
  }
  // Only allow patching safe fields
  const allowedFields = [
    "start_time", "end_time", "purpose", "remarks", "instructor_id", "user_id", "aircraft_id", "lesson_id", "flight_type_id", "booking_type", "status",
    // Note: checked_out_aircraft_id, checked_out_instructor_id, and meter readings are now in flight_logs table only
  ];
  const updates: Record<string, unknown> = {};
  
  // UUID fields that should be converted from empty strings to null
  const uuidFields = ["instructor_id", "user_id", "aircraft_id", "lesson_id", "flight_type_id"];
  
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

  // Check for conflicts if time or resource fields are being updated
  const hasTimeChanges = updates.start_time || updates.end_time;
  const hasResourceChanges = updates.aircraft_id || updates.instructor_id;
  
  if (hasTimeChanges || hasResourceChanges) {
    try {
      // Get current booking data to use for conflict checking
      const { data: currentBooking, error: currentError } = await supabase
        .from("bookings")
        .select("aircraft_id, instructor_id, start_time, end_time")
        .eq("id", id)
        .single();
      
      if (currentError) {
        return NextResponse.json({ error: currentError.message }, { status: 404 });
      }

      await checkBookingConflicts(supabase, {
        aircraft_id: updates.aircraft_id || currentBooking.aircraft_id,
        instructor_id: updates.instructor_id || currentBooking.instructor_id,
        start_time: updates.start_time || currentBooking.start_time,
        end_time: updates.end_time || currentBooking.end_time,
        excludeBookingId: id // Exclude the current booking being updated
      });
    } catch (conflictError) {
      return NextResponse.json({ 
        error: conflictError instanceof Error ? conflictError.message : "Resource conflict detected" 
      }, { status: 409 });
    }

    // Note: Type rating validation is handled in the frontend as a warning only.
    // The backend allows booking updates regardless of type rating status.
    // This ensures bookings can be created/updated even if instructors lack type ratings,
    // with appropriate warnings displayed in the UI.
  }
  
  // First, get the existing booking to check for status changes
  const { data: existingBooking, error: existingError } = await supabase
    .from("bookings")
    .select("status")
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
  // First, check if there's a flight_log with checked_out_aircraft_id
  const { data: flightLog } = await supabase
    .from("flight_logs")
    .select("checked_out_aircraft_id, hobbs_start, hobbs_end, tach_start, tach_end")
    .eq("booking_id", id)
    .single();
    
  if (flightLog?.checked_out_aircraft_id) {
    try {
      // Case 1: Booking being set to 'complete' for the first time
      if (updates.status === 'complete' && existingBooking.status !== 'complete') {
        await updateAircraftOnBookingCompletion(supabase, { ...existingBooking, ...flightLog }, updates);
      }
      // Case 2: Booking is already 'complete' and meter readings are being corrected
      else if (existingBooking.status === 'complete' && isMeterCorrection({ ...existingBooking, ...flightLog }, updates)) {
        await handleMeterCorrection(supabase, id, { ...existingBooking, ...flightLog }, updates, user.id);
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
    .select(`
      *,
      user:user_id(id, first_name, last_name, email),
      instructor:instructor_id(*, users:users!instructors_user_id_fkey(*)),
      aircraft:aircraft_id(id, registration, type)
    `)
    .eq("id", id)
    .single();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Send email notification for status changes
  try {
    if (updatedBooking && updatedBooking.user && updatedBooking.user.email && 
        updates.status && updates.status !== existingBooking.status) {
      
      // Prepare instructor data
      let instructor = null;
      if (updatedBooking.instructor && updatedBooking.instructor.users) {
        const instructorUser = Array.isArray(updatedBooking.instructor.users) 
          ? updatedBooking.instructor.users[0] 
          : updatedBooking.instructor.users;
        
        instructor = {
          name: `${instructorUser?.first_name || ''} ${instructorUser?.last_name || ''}`.trim() || 
                instructorUser?.email || 
                updatedBooking.instructor.id,
          email: instructorUser?.email,
        };
      }

      // Get lesson and flight type names if available
      let lesson = null;
      let flightType = null;
      
      if (updatedBooking.lesson_id) {
        const { data: lessonData } = await supabase
          .from('lessons')
          .select('name')
          .eq('id', updatedBooking.lesson_id)
          .single();
        lesson = lessonData ? { name: lessonData.name } : null;
      }

      if (updatedBooking.flight_type_id) {
        const { data: flightTypeData } = await supabase
          .from('flight_types')
          .select('name')
          .eq('id', updatedBooking.flight_type_id)
          .single();
        flightType = flightTypeData ? { name: flightTypeData.name } : null;
      }

      // Determine if this is a confirmation or general update
      if (updates.status === 'confirmed' && existingBooking.status === 'unconfirmed') {
        // Send confirmation email
        sendBookingConfirmation({
          booking: updatedBooking,
          member: updatedBooking.user,
          aircraft: updatedBooking.aircraft,
          instructor,
          lesson,
          flightType,
        }).catch((emailError) => {
          console.error('Failed to send booking confirmation email:', emailError);
        });
      } else {
        // Send general update email
        sendBookingUpdate({
          booking: updatedBooking,
          member: updatedBooking.user,
          aircraft: updatedBooking.aircraft,
          instructor,
          lesson,
          flightType,
        }).catch((emailError) => {
          console.error('Failed to send booking update email:', emailError);
        });
      }
    }
  } catch (emailError) {
    console.error('Error in email sending process:', emailError);
    // Don't fail the booking update if email process fails
  }

  return NextResponse.json({ booking: normalizeBookingTimestamps(updatedBooking) });
}

// Type for booking data with the fields used in aircraft updates
// Note: checked_out_aircraft_id and meter readings are now in flight_logs table
type BookingForAircraftUpdate = {
  checked_out_aircraft_id: string; // This comes from flight_logs now
  hobbs_start: number | null; // This comes from flight_logs now
  hobbs_end: number | null; // This comes from flight_logs now
  tach_start: number | null; // This comes from flight_logs now
  tach_end: number | null; // This comes from flight_logs now
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
    // Skip aircraft update - missing meter readings
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

// Filter sensitive booking data for restricted users (members/students)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterBookingData(booking: any) {
  // Remove sensitive fields that restricted users shouldn't see
  const filtered = { ...booking };
  
  // Remove financial data
  delete filtered.aircraft_charge_rate;
  delete filtered.instructor_charge_rate;
  delete filtered.total_cost;
  
  // Remove detailed user information from other users' bookings
  if (filtered.user && typeof filtered.user === 'object') {
    filtered.user = {
      id: filtered.user.id,
      first_name: filtered.user.first_name,
      last_name: filtered.user.last_name
      // Remove email and other sensitive user data
    };
  }
  
  return filtered;
}

// Check for booking conflicts with aircraft and instructors
async function checkBookingConflicts(
  supabase: SupabaseClient,
  params: {
    aircraft_id: string;
    instructor_id?: string | null;
    start_time: string;
    end_time: string;
    excludeBookingId?: string | null;
  }
) {
  const { aircraft_id, instructor_id, start_time, end_time, excludeBookingId } = params;
  
  // Convert times to Date objects for validation
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid start or end time format");
  }
  
  if (startDate >= endDate) {
    throw new Error("Start time must be before end time");
  }
  
  // Query for overlapping bookings
  let query = supabase
    .from("bookings")
    .select("id, aircraft_id, instructor_id, start_time, end_time, status")
    .in("status", ["unconfirmed", "confirmed", "briefing", "flying"])
    .lt("start_time", end_time)
    .gt("end_time", start_time);
  
  // Exclude the current booking if updating
  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }
  
  const { data: conflicts, error } = await query;
  
  if (error) {
    throw new Error(`Failed to check for conflicts: ${error.message}`);
  }
  
  // Check for aircraft conflicts
  const aircraftConflicts = conflicts?.filter(booking => 
    booking.aircraft_id === aircraft_id
  ) || [];
  
  if (aircraftConflicts.length > 0) {
    const conflictTimes = aircraftConflicts.map(c => 
      `${new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    ).join(', ');
    throw new Error(`Aircraft is already booked during this time (${conflictTimes}). Please choose a different aircraft or time slot.`);
  }
  
  // Check for instructor conflicts (only if instructor is specified)
  if (instructor_id) {
    const instructorConflicts = conflicts?.filter(booking => 
      booking.instructor_id === instructor_id
    ) || [];
    
    if (instructorConflicts.length > 0) {
      const conflictTimes = instructorConflicts.map(c => 
        `${new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      ).join(', ');
      throw new Error(`Instructor is already booked during this time (${conflictTimes}). Please choose a different instructor or time slot.`);
    }
  }
} 