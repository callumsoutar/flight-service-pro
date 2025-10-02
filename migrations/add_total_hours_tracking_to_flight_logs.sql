-- Migration: Add total_hours tracking to flight_logs
-- This allows flight logs to store the aircraft's total hours at the start and end of each flight
-- making tech log queries simpler and more accurate

-- Step 1: Add new columns to flight_logs table
ALTER TABLE flight_logs
  ADD COLUMN IF NOT EXISTS total_hours_start NUMERIC(10,1),
  ADD COLUMN IF NOT EXISTS total_hours_end NUMERIC(10,1);

-- Add helpful comments
COMMENT ON COLUMN flight_logs.total_hours_start IS 'Aircraft total hours at flight start (based on aircraft total_time_method)';
COMMENT ON COLUMN flight_logs.total_hours_end IS 'Aircraft total hours at flight end (based on aircraft total_time_method)';

-- Step 2: Create index for performance on tech log queries
CREATE INDEX IF NOT EXISTS idx_flight_logs_aircraft_date
  ON flight_logs(checked_out_aircraft_id, created_at DESC);

-- Step 3: Create index for total_hours queries
CREATE INDEX IF NOT EXISTS idx_flight_logs_total_hours
  ON flight_logs(checked_out_aircraft_id, total_hours_start, total_hours_end)
  WHERE total_hours_start IS NOT NULL AND total_hours_end IS NOT NULL;

-- Step 4: Add constraint to ensure total_hours_end >= total_hours_start
ALTER TABLE flight_logs
  ADD CONSTRAINT check_total_hours_progression
  CHECK (total_hours_end IS NULL OR total_hours_start IS NULL OR total_hours_end >= total_hours_start);

-- Step 5: Create simplified tech log function
-- Note: This function is now MUCH simpler because total_hours calculations
-- are done in the application layer and stored in flight_logs.
-- The function just aggregates and returns the pre-calculated values.
DROP FUNCTION IF EXISTS get_tech_log_reports(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_tech_log_reports(
  p_aircraft_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  aircraft_id UUID,
  registration TEXT,
  report_date DATE,
  daily_hobbs_time NUMERIC,
  daily_tach_time NUMERIC,
  daily_credited_time NUMERIC,
  flight_count BIGINT,
  total_time_method TEXT,
  total_hours_start_of_day NUMERIC,
  total_hours_end_of_day NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fl.checked_out_aircraft_id,
    a.registration,
    DATE(fl.created_at) as flight_date,
    -- Sum of hobbs time for the day (informational only)
    SUM(COALESCE(fl.flight_time_hobbs, 0)) as hobbs_time,
    -- Sum of tach time for the day (informational only)
    SUM(COALESCE(fl.flight_time_tach, 0)) as tach_time,
    -- Sum of credited time (already calculated per flight based on total_time_method)
    SUM(COALESCE(fl.total_hours_end, 0) - COALESCE(fl.total_hours_start, 0)) as credited_time,
    -- Number of flights
    COUNT(*) as num_flights,
    -- Total time method (informational only, not used in calculations)
    a.total_time_method::TEXT as time_method,
    -- First flight of the day's starting total_hours
    MIN(fl.total_hours_start) as start_total,
    -- Last flight of the day's ending total_hours
    MAX(fl.total_hours_end) as end_total
  FROM flight_logs fl
  JOIN aircraft a ON fl.checked_out_aircraft_id = a.id
  WHERE fl.total_hours_start IS NOT NULL
    AND fl.total_hours_end IS NOT NULL
    AND (p_aircraft_id IS NULL OR fl.checked_out_aircraft_id = p_aircraft_id)
    AND (p_start_date IS NULL OR DATE(fl.created_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(fl.created_at) <= p_end_date)
  GROUP BY fl.checked_out_aircraft_id, a.registration, a.total_time_method::TEXT, DATE(fl.created_at)
  ORDER BY fl.checked_out_aircraft_id, DATE(fl.created_at);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tech_log_reports IS 'Generate tech log reports showing daily flight activity and total hours progression for aircraft. Total hours are pre-calculated in application layer and stored in flight_logs.';
