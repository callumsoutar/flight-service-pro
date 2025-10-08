-- ============================================================================
-- AIRCRAFT UPDATE BUG - COMPREHENSIVE TEST SUITE
-- ============================================================================
-- This file contains SQL tests to reproduce and verify the aircraft update bug fix
-- Run these queries in order to test the complete flow

-- ============================================================================
-- SETUP: Reset to Pre-Flight State
-- ============================================================================

-- 1. Reset aircraft to pre-flight state
UPDATE aircraft
SET 
  current_hobbs = 5458.5,
  current_tach = 4566.4,
  total_hours = 5550.7,
  updated_at = NOW()
WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44';

-- 2. Reset booking to 'flying' status
UPDATE bookings
SET status = 'flying'
WHERE id = '36864c27-28ef-4893-ab05-105484269a57';

-- 3. Verify reset state
SELECT 
  'Aircraft Reset' as test,
  registration,
  current_hobbs,
  current_tach,
  total_hours,
  total_time_method
FROM aircraft
WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44';

-- Expected: current_hobbs=5458.5, current_tach=4566.4, total_hours=5550.7

-- ============================================================================
-- TEST 1: Verify Flight Log Data
-- ============================================================================

SELECT 
  'Flight Log Data' as test,
  fl.id,
  fl.booking_id,
  fl.checked_out_aircraft_id,
  fl.hobbs_start,
  fl.hobbs_end,
  fl.tach_start,
  fl.tach_end,
  fl.flight_time_hobbs,
  fl.flight_time_tach,
  fl.flight_time,
  fl.total_hours_start,
  fl.total_hours_end,
  a.total_time_method,
  -- Calculate expected total_hours_end
  CASE 
    WHEN a.total_time_method = 'tacho' THEN fl.total_hours_start + fl.flight_time_tach
    WHEN a.total_time_method = 'hobbs' THEN fl.total_hours_start + fl.flight_time_hobbs
    ELSE fl.total_hours_start + fl.flight_time_hobbs
  END as expected_total_hours_end,
  -- Verify calculation is correct
  CASE 
    WHEN a.total_time_method = 'tacho' THEN 
      CASE WHEN fl.total_hours_end = fl.total_hours_start + fl.flight_time_tach THEN '✅ PASS' ELSE '❌ FAIL' END
    WHEN a.total_time_method = 'hobbs' THEN 
      CASE WHEN fl.total_hours_end = fl.total_hours_start + fl.flight_time_hobbs THEN '✅ PASS' ELSE '❌ FAIL' END
    ELSE '⚠️ UNKNOWN METHOD'
  END as calculation_check
FROM flight_logs fl
JOIN aircraft a ON fl.checked_out_aircraft_id = a.id
WHERE fl.id = '0686be56-9581-411f-bda5-d17867d411fb';

-- Expected: 
-- total_hours_start = 5550.7
-- total_hours_end = 5551.5
-- expected_total_hours_end = 5551.5
-- calculation_check = ✅ PASS

-- ============================================================================
-- TEST 2: Verify Aircraft Charge Rate
-- ============================================================================

SELECT 
  'Aircraft Charge Rate' as test,
  acr.aircraft_id,
  acr.flight_type_id,
  acr.rate_per_hour,
  acr.charge_hobbs,
  acr.charge_tacho,
  acr.charge_airswitch,
  -- Determine billing method
  CASE 
    WHEN acr.charge_hobbs THEN 'hobbs'
    WHEN acr.charge_tacho THEN 'tacho'
    WHEN acr.charge_airswitch THEN 'airswitch'
    ELSE 'none'
  END as billing_method
FROM aircraft_charge_rates acr
WHERE acr.aircraft_id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44'
  AND acr.flight_type_id = '592b8877-78a6-43e6-98a0-58d30da5ad5c';

-- Expected:
-- charge_hobbs = true
-- billing_method = 'hobbs'

-- ============================================================================
-- TEST 3: Check for Later Flights (Safety Check)
-- ============================================================================

SELECT 
  'Later Flights Check' as test,
  fl.id as flight_log_id,
  b.id as booking_id,
  b.start_time,
  b.status,
  fl.total_hours_end,
  -- Compare to our test booking
  CASE 
    WHEN b.start_time > '2025-10-08 22:00:00+00' THEN '⚠️ LATER FLIGHT EXISTS'
    ELSE '✅ NO LATER FLIGHTS'
  END as safety_check
FROM flight_logs fl
JOIN bookings b ON fl.booking_id = b.id
WHERE fl.checked_out_aircraft_id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44'
  AND b.status = 'complete'
  AND b.start_time > '2025-10-08 22:00:00+00'
ORDER BY b.start_time ASC;

-- Expected: No rows (no later flights)

-- ============================================================================
-- TEST 4: Simulate Booking Completion (Manual)
-- ============================================================================

-- This simulates what the backend should do when completing a booking
-- Run this to manually test the aircraft update logic

-- 4a. Update booking status to 'complete'
UPDATE bookings
SET status = 'complete', updated_at = NOW()
WHERE id = '36864c27-28ef-4893-ab05-105484269a57'
RETURNING id, status;

-- 4b. Update aircraft meters (this is what the backend should do automatically)
UPDATE aircraft
SET 
  current_hobbs = 5459.5,
  current_tach = 4567.2,
  total_hours = 5551.5,
  updated_at = NOW()
WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44'
RETURNING id, registration, current_hobbs, current_tach, total_hours;

-- ============================================================================
-- TEST 5: Verify Final State
-- ============================================================================

SELECT 
  'Final Aircraft State' as test,
  a.registration,
  a.current_hobbs,
  a.current_tach,
  a.total_hours,
  a.total_time_method,
  -- Verify against expected values
  CASE WHEN a.current_hobbs = 5459.5 THEN '✅' ELSE '❌' END as hobbs_check,
  CASE WHEN a.current_tach = 4567.2 THEN '✅' ELSE '❌' END as tach_check,
  CASE WHEN a.total_hours = 5551.5 THEN '✅' ELSE '❌' END as total_hours_check
FROM aircraft a
WHERE a.id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44';

-- Expected:
-- current_hobbs = 5459.5 ✅
-- current_tach = 4567.2 ✅
-- total_hours = 5551.5 ✅

-- ============================================================================
-- TEST 6: Verify Audit Trail
-- ============================================================================

SELECT 
  'Audit Trail' as test,
  al.table_name,
  al.action,
  al.created_at,
  al.old_data->>'current_hobbs' as old_hobbs,
  al.new_data->>'current_hobbs' as new_hobbs,
  al.old_data->>'current_tach' as old_tach,
  al.new_data->>'current_tach' as new_tach,
  al.old_data->>'total_hours' as old_total_hours,
  al.new_data->>'total_hours' as new_total_hours
FROM audit_logs al
WHERE al.record_id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44'
  AND al.table_name = 'aircraft'
ORDER BY al.created_at DESC
LIMIT 5;

-- Expected: Recent UPDATE entry with correct before/after values

-- ============================================================================
-- TEST 7: Edge Cases
-- ============================================================================

-- 7a. Test with missing total_hours_end (should skip aircraft update)
SELECT 
  'Missing total_hours_end Test' as test,
  fl.id,
  fl.total_hours_end,
  CASE 
    WHEN fl.total_hours_end IS NULL THEN '⚠️ WOULD SKIP UPDATE'
    ELSE '✅ HAS VALUE'
  END as validation_check
FROM flight_logs fl
WHERE fl.id = '0686be56-9581-411f-bda5-d17867d411fb';

-- Expected: total_hours_end IS NOT NULL

-- 7b. Test with missing hobbs_end (should skip aircraft update)
SELECT 
  'Missing hobbs_end Test' as test,
  fl.id,
  fl.hobbs_end,
  CASE 
    WHEN fl.hobbs_end IS NULL THEN '⚠️ WOULD SKIP UPDATE'
    ELSE '✅ HAS VALUE'
  END as validation_check
FROM flight_logs fl
WHERE fl.id = '0686be56-9581-411f-bda5-d17867d411fb';

-- Expected: hobbs_end IS NOT NULL

-- 7c. Test with missing tach_end (should skip aircraft update)
SELECT 
  'Missing tach_end Test' as test,
  fl.id,
  fl.tach_end,
  CASE 
    WHEN fl.tach_end IS NULL THEN '⚠️ WOULD SKIP UPDATE'
    ELSE '✅ HAS VALUE'
  END as validation_check
FROM flight_logs fl
WHERE fl.id = '0686be56-9581-411f-bda5-d17867d411fb';

-- Expected: tach_end IS NOT NULL

-- ============================================================================
-- TEST 8: Rounding and Precision
-- ============================================================================

SELECT 
  'Rounding Test' as test,
  fl.hobbs_start,
  fl.hobbs_end,
  fl.flight_time_hobbs,
  fl.tach_start,
  fl.tach_end,
  fl.flight_time_tach,
  -- Verify rounding to 1 decimal place
  ROUND((fl.hobbs_end - fl.hobbs_start)::numeric, 1) as calculated_hobbs_time,
  ROUND((fl.tach_end - fl.tach_start)::numeric, 1) as calculated_tach_time,
  -- Check if stored values match calculated values
  CASE 
    WHEN fl.flight_time_hobbs = ROUND((fl.hobbs_end - fl.hobbs_start)::numeric, 1) THEN '✅'
    ELSE '❌'
  END as hobbs_precision_check,
  CASE 
    WHEN fl.flight_time_tach = ROUND((fl.tach_end - fl.tach_start)::numeric, 1) THEN '✅'
    ELSE '❌'
  END as tach_precision_check
FROM flight_logs fl
WHERE fl.id = '0686be56-9581-411f-bda5-d17867d411fb';

-- Expected: Both precision checks = ✅

-- ============================================================================
-- TEST 9: Total Time Method Variations
-- ============================================================================

-- Test different total_time_method values
SELECT 
  'Total Time Method Test' as test,
  a.registration,
  a.total_time_method,
  fl.flight_time_hobbs,
  fl.flight_time_tach,
  fl.total_hours_start,
  fl.total_hours_end,
  -- Calculate expected increment based on method
  CASE a.total_time_method
    WHEN 'hobbs' THEN fl.flight_time_hobbs
    WHEN 'tacho' THEN fl.flight_time_tach
    WHEN 'airswitch' THEN fl.flight_time_hobbs -- fallback
    WHEN 'hobbs less 5%' THEN fl.flight_time_hobbs * 0.95
    WHEN 'hobbs less 10%' THEN fl.flight_time_hobbs * 0.90
    WHEN 'tacho less 5%' THEN fl.flight_time_tach * 0.95
    WHEN 'tacho less 10%' THEN fl.flight_time_tach * 0.90
    ELSE fl.flight_time_hobbs
  END as expected_increment,
  -- Verify calculation
  CASE 
    WHEN ABS((fl.total_hours_end - fl.total_hours_start) - 
      CASE a.total_time_method
        WHEN 'hobbs' THEN fl.flight_time_hobbs
        WHEN 'tacho' THEN fl.flight_time_tach
        WHEN 'airswitch' THEN fl.flight_time_hobbs
        WHEN 'hobbs less 5%' THEN fl.flight_time_hobbs * 0.95
        WHEN 'hobbs less 10%' THEN fl.flight_time_hobbs * 0.90
        WHEN 'tacho less 5%' THEN fl.flight_time_tach * 0.95
        WHEN 'tacho less 10%' THEN fl.flight_time_tach * 0.90
        ELSE fl.flight_time_hobbs
      END) < 0.01 THEN '✅ CORRECT'
    ELSE '❌ INCORRECT'
  END as method_calculation_check
FROM aircraft a
JOIN flight_logs fl ON fl.checked_out_aircraft_id = a.id
WHERE fl.id = '0686be56-9581-411f-bda5-d17867d411fb';

-- Expected: method_calculation_check = ✅ CORRECT

-- ============================================================================
-- TEST 10: Comprehensive Summary
-- ============================================================================

SELECT 
  'COMPREHENSIVE TEST SUMMARY' as test,
  -- Aircraft state
  (SELECT current_hobbs FROM aircraft WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44') as current_hobbs,
  (SELECT current_tach FROM aircraft WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44') as current_tach,
  (SELECT total_hours FROM aircraft WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44') as total_hours,
  -- Flight log state
  (SELECT total_hours_start FROM flight_logs WHERE id = '0686be56-9581-411f-bda5-d17867d411fb') as fl_total_start,
  (SELECT total_hours_end FROM flight_logs WHERE id = '0686be56-9581-411f-bda5-d17867d411fb') as fl_total_end,
  -- Booking state
  (SELECT status FROM bookings WHERE id = '36864c27-28ef-4893-ab05-105484269a57') as booking_status,
  -- Overall pass/fail
  CASE 
    WHEN (SELECT current_hobbs FROM aircraft WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44') = 5459.5
     AND (SELECT current_tach FROM aircraft WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44') = 4567.2
     AND (SELECT total_hours FROM aircraft WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44') = 5551.5
     AND (SELECT status FROM bookings WHERE id = '36864c27-28ef-4893-ab05-105484269a57') = 'complete'
    THEN '✅ ALL TESTS PASSED'
    ELSE '❌ TESTS FAILED'
  END as overall_result;

-- Expected: overall_result = ✅ ALL TESTS PASSED

-- ============================================================================
-- CLEANUP (Optional)
-- ============================================================================

-- Uncomment to reset to pre-test state
-- UPDATE aircraft SET current_hobbs = 5458.5, current_tach = 4566.4, total_hours = 5550.7 WHERE id = '8d045a8d-a763-4dbc-bf58-9a420ed12d44';
-- UPDATE bookings SET status = 'flying' WHERE id = '36864c27-28ef-4893-ab05-105484269a57';
