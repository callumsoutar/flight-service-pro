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
  console.log('[updateAircraftOnBookingCompletion] Starting for booking:', bookingId);
  
  // Get flight log with total_hours data and booking start_time
  const { data: flightLog, error: flightLogError } = await supabase
    .from('flight_logs')
    .select('checked_out_aircraft_id, hobbs_end, tach_end, total_hours_end, bookings!inner(start_time)')
    .eq('booking_id', bookingId)
    .single();

  console.log('[updateAircraftOnBookingCompletion] Flight log query result:', { flightLog, flightLogError });

  if (flightLogError || !flightLog) {
    console.error('[updateAircraftOnBookingCompletion] Flight log not found:', flightLogError);
    throw new Error('Flight log not found');
  }

  const aircraftId = flightLog.checked_out_aircraft_id;
  const finalHobbsEnd = flightLog.hobbs_end;
  const finalTachEnd = flightLog.tach_end;
  const newTotalHours = flightLog.total_hours_end; // Use pre-calculated value!
  const bookingData = flightLog as unknown as { bookings?: { start_time: string }[] };
  const bookingStartTime = bookingData.bookings?.[0]?.start_time;

  console.log('[updateAircraftOnBookingCompletion] Extracted values:', {
    aircraftId,
    finalHobbsEnd,
    finalTachEnd,
    newTotalHours,
    bookingStartTime
  });

  // Validate that we have the required data
  if (!finalHobbsEnd || !finalTachEnd || !newTotalHours) {
    // Skip aircraft update - missing required data
    console.warn(`[updateAircraftOnBookingCompletion] Skipping aircraft update for booking ${bookingId} - missing required flight log data`);
    console.warn('[updateAircraftOnBookingCompletion] Missing data:', { finalHobbsEnd, finalTachEnd, newTotalHours });
    return;
  }

  if (!bookingStartTime) {
    console.warn(`[updateAircraftOnBookingCompletion] Skipping aircraft update for booking ${bookingId} - booking start_time not found`);
    return;
  }

  // SAFETY CHECK: Look for any completed flights AFTER this booking's start time
  // If there are later flights, we should NOT update the aircraft's current meters and total_hours
  // because that would set them backwards in time
  console.log('[updateAircraftOnBookingCompletion] Checking for later flights after:', bookingStartTime);
  
  const { data: laterFlights, error: laterFlightsError } = await supabase
    .from('flight_logs')
    .select('total_hours_end, bookings!inner(start_time, status)')
    .eq('checked_out_aircraft_id', aircraftId)
    .eq('bookings.status', 'complete')
    .gt('bookings.start_time', bookingStartTime)
    .limit(1);

  console.log('[updateAircraftOnBookingCompletion] Later flights check:', { laterFlights, laterFlightsError });

  if (laterFlightsError) {
    console.warn('[updateAircraftOnBookingCompletion] Error checking for later flights:', laterFlightsError);
    // Continue with update despite error - better to update than to skip
  } else if (laterFlights && laterFlights.length > 0) {
    // There are completed flights AFTER this one
    // Do NOT update aircraft current meters and total_hours
    console.warn(`[updateAircraftOnBookingCompletion] Not updating aircraft ${aircraftId} meters for booking ${bookingId} - there are ${laterFlights.length} completed flight(s) after this booking's time (${bookingStartTime})`);
    console.warn('[updateAircraftOnBookingCompletion] This is a historical booking completion. Aircraft meters will not be updated to prevent going backwards in time.');
    // Exit without updating aircraft
    return;
  }

  // Safe to update: This is either the most recent flight, or there are no completed flights after it
  console.log('[updateAircraftOnBookingCompletion] Updating aircraft:', aircraftId);
  console.log('[updateAircraftOnBookingCompletion] Update values:', {
    current_hobbs: finalHobbsEnd,
    current_tach: finalTachEnd,
    total_hours: newTotalHours
  });

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
    console.error('[updateAircraftOnBookingCompletion] Aircraft update failed:', updateError);
    throw new Error(`Failed to update aircraft: ${updateError.message}`);
  }

  console.log('[updateAircraftOnBookingCompletion] Aircraft updated successfully');
}

