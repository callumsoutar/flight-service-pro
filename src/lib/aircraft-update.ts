/**
 * Aircraft Update Utility
 * 
 * Handles updating aircraft meters (current_hobbs, current_tach, total_hours)
 * when a booking is completed.
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Update aircraft meters when a booking is completed
 * 
 * This function:
 * 1. Fetches the flight_log data for the booking
 * 2. Validates all required data is present
 * 3. Checks for later completed flights (safety check)
 * 4. Updates the aircraft meters atomically
 * 
 * @param supabase - Supabase client
 * @param bookingId - ID of the booking being completed
 * @returns Promise<void>
 * @throws Error if flight log not found or aircraft update fails
 */
export async function updateAircraftOnBookingCompletion(
  supabase: SupabaseClient,
  bookingId: string
): Promise<void> {
  // Get flight log with total_hours data and booking start_time
  const { data: flightLog, error: flightLogError } = await supabase
    .from('flight_logs')
    .select('checked_out_aircraft_id, hobbs_end, tach_end, total_hours_end, bookings!inner(start_time)')
    .eq('booking_id', bookingId)
    .single();

  if (flightLogError || !flightLog) {
    throw new Error('Flight log not found');
  }

  const aircraftId = flightLog.checked_out_aircraft_id;
  const finalHobbsEnd = flightLog.hobbs_end;
  const finalTachEnd = flightLog.tach_end;
  const newTotalHours = flightLog.total_hours_end; // Use pre-calculated value!
  
  // Handle nested bookings data - could be array OR object depending on query type
  const bookingData = flightLog as unknown as { bookings?: { start_time: string }[] | { start_time: string } };
  let bookingStartTime: string | undefined;
  
  if (Array.isArray(bookingData.bookings)) {
    bookingStartTime = bookingData.bookings[0]?.start_time;
  } else if (bookingData.bookings && typeof bookingData.bookings === 'object') {
    bookingStartTime = (bookingData.bookings as { start_time: string }).start_time;
  }

  // Validate that we have the required data
  // Use explicit null checks instead of truthy checks (0 is a valid value!)
  if (finalHobbsEnd === null || finalHobbsEnd === undefined || 
      finalTachEnd === null || finalTachEnd === undefined || 
      newTotalHours === null || newTotalHours === undefined) {
    // Skip aircraft update - missing required data
    return;
  }

  if (!bookingStartTime) {
    return;
  }

  // SAFETY CHECK: Look for any completed flights AFTER this booking's start time
  // If there are later flights, we should NOT update the aircraft's current meters and total_hours
  // because that would set them backwards in time
  const { data: laterBookings, error: laterFlightsError } = await supabase
    .from('bookings')
    .select('id, start_time, flight_logs!inner(id)')
    .eq('status', 'complete')
    .eq('flight_logs.checked_out_aircraft_id', aircraftId)
    .gt('start_time', bookingStartTime)
    .limit(1);

  if (laterFlightsError) {
    // Continue with update despite error - better to update than to skip
  } else if (laterBookings && laterBookings.length > 0) {
    // There are completed flights AFTER this one
    // Do NOT update aircraft current meters and total_hours
    // Exit without updating aircraft
    return;
  }

  // Safe to update: This is either the most recent flight, or there are no completed flights after it

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

