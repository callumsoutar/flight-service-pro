# Total Hours Tracking Implementation Guide

## Overview
This implementation adds `total_hours_start` and `total_hours_end` fields to the `flight_logs` table, allowing each flight log to track the aircraft's total hours at the beginning and end of the flight. This simplifies tech log queries and provides better historical accuracy.

## Changes Made

### 1. Database Schema (`add_total_hours_tracking_to_flight_logs.sql`)
- Added `total_hours_start` and `total_hours_end` columns to `flight_logs`
- Created indexes for performance
- Added constraint to ensure `total_hours_end >= total_hours_start`
- Backfilled existing flight_logs with calculated values
- Created simplified `get_tech_log_reports()` function

### 2. TypeScript Types
- Updated `src/types/flight_logs.ts` to include new fields

### 3. API Endpoints

#### `src/app/api/bookings/[id]/calculate-charges/route.ts`
- Fetches aircraft data including `total_time_method`
- Calculates credited time based on the method (hobbs, tacho, etc.)
- Sets `total_hours_start` from current aircraft `total_hours`
- Sets `total_hours_end` by adding credited time
- Stores both values in the flight_log record

#### `src/app/api/bookings/route.ts`
- Simplified `updateAircraftOnBookingCompletion()` function
- Now reads pre-calculated `total_hours_end` from flight_log
- Updates aircraft `total_hours` to the pre-calculated value
- Eliminates redundant calculation logic

### 4. Frontend Optimistic Updates
- Updated `src/hooks/use-booking-check-in.ts`
- Fetches aircraft data to calculate optimistic `total_hours` values
- Provides immediate UI feedback during charge calculation

## Implementation Steps

### Step 1: Run Database Migration
```bash
# Connect to your Supabase database and run:
psql -h [your-host] -U [your-user] -d [your-database] -f migrations/add_total_hours_tracking_to_flight_logs.sql
```

### Step 2: Verify Migration
Check that the migration was successful:
```sql
-- Check columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'flight_logs'
  AND column_name IN ('total_hours_start', 'total_hours_end');

-- Check indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'flight_logs'
  AND indexname IN ('idx_flight_logs_aircraft_date', 'idx_flight_logs_total_hours');

-- Check constraint exists
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'flight_logs'
  AND constraint_name = 'check_total_hours_progression';

-- Check backfill worked (should return rows with total_hours values)
SELECT id, total_hours_start, total_hours_end
FROM flight_logs
WHERE total_hours_start IS NOT NULL
LIMIT 5;
```

### Step 3: Deploy Code Changes
The TypeScript and API changes are already in place. Simply deploy your updated codebase.

### Step 4: Test the Implementation

#### Test Case 1: New Flight Check-in
1. Create a booking and check it out
2. Check in the flight with hobbs/tacho readings
3. Verify flight_log has `total_hours_start` and `total_hours_end` populated
4. Verify aircraft `total_hours` updated correctly

#### Test Case 2: Different Total Time Methods
Test with aircraft that use different `total_time_method` values:
- hobbs
- tacho
- hobbs less 5%
- hobbs less 10%
- tacho less 5%
- tacho less 10%

Example for aircraft with `total_time_method = 'tacho'`:
```
Aircraft total_hours: 5000.0
Tacho start: 3000.0
Tacho end: 3000.8
Expected:
  - total_hours_start: 5000.0
  - total_hours_end: 5000.8
  - aircraft.total_hours updated to: 5000.8
```

#### Test Case 3: Tech Log Query
```sql
-- Query tech log for specific aircraft and date range
SELECT * FROM get_tech_log_reports(
  '[aircraft-id]'::UUID,
  '2025-01-01'::DATE,
  '2025-01-31'::DATE
);

-- Verify the total_hours values progress correctly throughout the day
```

## Benefits

### Before (Complex Backward Calculation)
```sql
-- Old approach: Calculate backwards from current total_hours
WITH with_future_time AS (
  SELECT cf.*,
    COALESCE(
      (SELECT SUM(cf2.credited_time)
       FROM credited_flights cf2
       WHERE cf2.flight_date > cf.flight_date),
      0
    ) as credited_time_after_this_date
  FROM credited_flights cf
)
SELECT
  (current_total_hours - credited_time_after_this_date - credited_time) as start_total,
  (current_total_hours - credited_time_after_this_date) as end_total
FROM with_future_time;
```

### After (Simple Direct Lookup)
```sql
-- New approach: Direct lookup from stored values
SELECT
  total_hours_start,
  total_hours_end
FROM flight_logs
WHERE checked_out_aircraft_id = '[aircraft-id]'
  AND DATE(created_at) = '[date]';
```

### Key Improvements
1. **Accuracy**: Total hours are calculated once and stored, eliminating calculation drift
2. **Performance**: No complex backward calculations needed for queries
3. **Auditability**: Historical total_hours values are preserved
4. **Simplicity**: Tech log queries are straightforward and fast
5. **Reliability**: Values are consistent even if aircraft total_hours is manually corrected

## Rollback Plan

If you need to rollback this implementation:

```bash
psql -h [your-host] -U [your-user] -d [your-database] -f migrations/ROLLBACK_total_hours_tracking.sql
```

Then revert the code changes using git:
```bash
git checkout HEAD~1 -- src/types/flight_logs.ts
git checkout HEAD~1 -- src/app/api/bookings/[id]/calculate-charges/route.ts
git checkout HEAD~1 -- src/app/api/bookings/route.ts
git checkout HEAD~1 -- src/hooks/use-booking-check-in.ts
```

## Maintenance Notes

### Adding New Total Time Methods
If you add a new `total_time_method` in the future, update the calculation logic in:
1. `src/app/api/bookings/[id]/calculate-charges/route.ts` (lines 176-208)
2. `src/hooks/use-booking-check-in.ts` (lines 308-334)
3. Migration backfill script (if needed for historical data)

### Data Integrity
The constraint `check_total_hours_progression` ensures that `total_hours_end >= total_hours_start`. If you need to correct historical data, you may need to temporarily disable this constraint.

## Support

If you encounter issues:
1. Check database logs for migration errors
2. Verify all indexes and constraints were created
3. Test with a single flight first before processing multiple bookings
4. Use the rollback script if needed to restore previous functionality
