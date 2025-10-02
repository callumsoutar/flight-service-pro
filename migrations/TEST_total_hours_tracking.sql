-- Test Script: Verify total_hours tracking implementation
-- Run this script after applying the migration to verify everything works correctly

-- ============================================================================
-- TEST 1: Verify Schema Changes
-- ============================================================================
\echo '=== TEST 1: Verifying Schema Changes ==='

-- Check if columns exist
SELECT
  CASE
    WHEN COUNT(*) = 2 THEN '✓ PASS: Both total_hours columns exist'
    ELSE '✗ FAIL: Missing total_hours columns'
  END as result
FROM information_schema.columns
WHERE table_name = 'flight_logs'
  AND column_name IN ('total_hours_start', 'total_hours_end');

-- Check if indexes exist
SELECT
  CASE
    WHEN COUNT(*) >= 1 THEN '✓ PASS: Performance indexes created'
    ELSE '✗ FAIL: Missing indexes'
  END as result
FROM pg_indexes
WHERE tablename = 'flight_logs'
  AND indexname LIKE 'idx_flight_logs_%';

-- Check if constraint exists
SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✓ PASS: Constraint check_total_hours_progression exists'
    ELSE '✗ FAIL: Missing constraint'
  END as result
FROM information_schema.table_constraints
WHERE table_name = 'flight_logs'
  AND constraint_name = 'check_total_hours_progression';

-- ============================================================================
-- TEST 2: Verify Backfill Data
-- ============================================================================
\echo ''
\echo '=== TEST 2: Verifying Backfill Data ==='

-- Count flight logs with total_hours data
SELECT
  COUNT(*) as total_flight_logs,
  COUNT(total_hours_start) as logs_with_start,
  COUNT(total_hours_end) as logs_with_end,
  CASE
    WHEN COUNT(total_hours_start) = COUNT(total_hours_end) THEN '✓ PASS: Consistent backfill'
    ELSE '✗ FAIL: Inconsistent backfill'
  END as result
FROM flight_logs
WHERE flight_time_hobbs IS NOT NULL
  AND flight_time_tach IS NOT NULL;

-- ============================================================================
-- TEST 3: Verify Data Integrity
-- ============================================================================
\echo ''
\echo '=== TEST 3: Verifying Data Integrity ==='

-- Check that total_hours_end >= total_hours_start for all records
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS: All records have valid total_hours progression'
    ELSE CONCAT('✗ FAIL: ', COUNT(*), ' records have invalid total_hours progression')
  END as result
FROM flight_logs
WHERE total_hours_start IS NOT NULL
  AND total_hours_end IS NOT NULL
  AND total_hours_end < total_hours_start;

-- Sample some records to verify values look reasonable
\echo ''
\echo 'Sample Flight Log Records (first 5):'
SELECT
  id,
  checked_out_aircraft_id,
  flight_time_hobbs,
  flight_time_tach,
  total_hours_start,
  total_hours_end,
  ROUND(total_hours_end - total_hours_start, 1) as credited_time
FROM flight_logs
WHERE total_hours_start IS NOT NULL
  AND total_hours_end IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- TEST 4: Verify Tech Log Function
-- ============================================================================
\echo ''
\echo '=== TEST 4: Verifying Tech Log Function ==='

-- Check if function exists and has correct signature
SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✓ PASS: get_tech_log_reports function exists'
    ELSE '✗ FAIL: get_tech_log_reports function not found'
  END as result
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_tech_log_reports'
  AND n.nspname = 'public';

-- Test the function with a sample query (last 7 days)
\echo ''
\echo 'Sample Tech Log Report (last 7 days):'
SELECT
  registration,
  report_date,
  daily_hobbs_time,
  daily_tach_time,
  daily_credited_time,
  flight_count,
  total_time_method,
  total_hours_start_of_day,
  total_hours_end_of_day
FROM get_tech_log_reports(
  NULL, -- All aircraft
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE
)
ORDER BY report_date DESC, registration
LIMIT 10;

-- ============================================================================
-- TEST 5: Verify Calculation Accuracy
-- ============================================================================
\echo ''
\echo '=== TEST 5: Verifying Calculation Accuracy ==='

-- Compare credited_time calculation with stored values
-- This should return 0 rows if calculations are correct
WITH calculated_vs_stored AS (
  SELECT
    fl.id,
    a.registration,
    a.total_time_method,
    fl.flight_time_hobbs,
    fl.flight_time_tach,
    ROUND(fl.total_hours_end - fl.total_hours_start, 1) as stored_credited_time,
    ROUND(
      CASE a.total_time_method
        WHEN 'hobbs' THEN fl.flight_time_hobbs
        WHEN 'tacho' THEN fl.flight_time_tach
        WHEN 'hobbs less 5%' THEN fl.flight_time_hobbs * 0.95
        WHEN 'hobbs less 10%' THEN fl.flight_time_hobbs * 0.90
        WHEN 'tacho less 5%' THEN fl.flight_time_tach * 0.95
        WHEN 'tacho less 10%' THEN fl.flight_time_tach * 0.90
        WHEN 'airswitch' THEN fl.flight_time_hobbs
        ELSE fl.flight_time_hobbs
      END,
      1
    ) as calculated_credited_time
  FROM flight_logs fl
  JOIN aircraft a ON fl.checked_out_aircraft_id = a.id
  WHERE fl.total_hours_start IS NOT NULL
    AND fl.total_hours_end IS NOT NULL
    AND fl.flight_time_hobbs IS NOT NULL
    AND fl.flight_time_tach IS NOT NULL
)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS: All credited time calculations match'
    ELSE CONCAT('✗ WARNING: ', COUNT(*), ' records have calculation mismatches (may be due to rounding)')
  END as result
FROM calculated_vs_stored
WHERE ABS(stored_credited_time - calculated_credited_time) > 0.2; -- Allow 0.2 tolerance for rounding

-- Show any mismatches if they exist
SELECT
  registration,
  total_time_method,
  flight_time_hobbs,
  flight_time_tach,
  stored_credited_time,
  calculated_credited_time,
  ABS(stored_credited_time - calculated_credited_time) as difference
FROM (
  SELECT
    a.registration,
    a.total_time_method,
    fl.flight_time_hobbs,
    fl.flight_time_tach,
    ROUND(fl.total_hours_end - fl.total_hours_start, 1) as stored_credited_time,
    ROUND(
      CASE a.total_time_method
        WHEN 'hobbs' THEN fl.flight_time_hobbs
        WHEN 'tacho' THEN fl.flight_time_tach
        WHEN 'hobbs less 5%' THEN fl.flight_time_hobbs * 0.95
        WHEN 'hobbs less 10%' THEN fl.flight_time_hobbs * 0.90
        WHEN 'tacho less 5%' THEN fl.flight_time_tach * 0.95
        WHEN 'tacho less 10%' THEN fl.flight_time_tach * 0.90
        WHEN 'airswitch' THEN fl.flight_time_hobbs
        ELSE fl.flight_time_hobbs
      END,
      1
    ) as calculated_credited_time
  FROM flight_logs fl
  JOIN aircraft a ON fl.checked_out_aircraft_id = a.id
  WHERE fl.total_hours_start IS NOT NULL
    AND fl.total_hours_end IS NOT NULL
    AND fl.flight_time_hobbs IS NOT NULL
    AND fl.flight_time_tach IS NOT NULL
) calc
WHERE ABS(stored_credited_time - calculated_credited_time) > 0.2
LIMIT 10;

-- ============================================================================
-- TEST 6: Performance Check
-- ============================================================================
\echo ''
\echo '=== TEST 6: Performance Check ==='

-- Compare query performance of old vs new approach
\echo 'Testing query performance...'

EXPLAIN ANALYZE
SELECT
  registration,
  report_date,
  total_hours_start_of_day,
  total_hours_end_of_day
FROM get_tech_log_reports(
  NULL,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
)
ORDER BY report_date DESC;

-- ============================================================================
-- Summary
-- ============================================================================
\echo ''
\echo '=== TEST SUMMARY ==='
\echo 'Review the results above. All tests should show ✓ PASS.'
\echo 'If any tests show ✗ FAIL or ✗ WARNING, investigate before proceeding.'
\echo ''
\echo 'Next Steps:'
\echo '1. If all tests pass, deploy the code changes'
\echo '2. Test with a real booking check-in workflow'
\echo '3. Monitor the application logs for any errors'
\echo '4. Verify tech log reports display correctly in the UI'
