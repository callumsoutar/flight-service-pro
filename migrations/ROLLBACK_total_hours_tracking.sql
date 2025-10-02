-- ROLLBACK Script: Remove total_hours tracking from flight_logs
-- Use this script if you need to rollback the total_hours tracking feature

-- Step 1: Restore the original get_tech_log_reports function
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
  WITH daily_flights AS (
    SELECT
      fl.checked_out_aircraft_id,
      a.registration,
      a.total_time_method::TEXT as time_method,
      a.total_hours::NUMERIC as current_total_hours,
      DATE(fl.created_at) as flight_date,
      SUM(COALESCE(fl.flight_time_hobbs::NUMERIC, 0)) as hobbs_time,
      SUM(COALESCE(fl.flight_time_tach::NUMERIC, 0)) as tach_time,
      COUNT(*) as num_flights
    FROM flight_logs fl
    JOIN aircraft a ON fl.checked_out_aircraft_id = a.id
    WHERE fl.flight_time_hobbs IS NOT NULL
      AND fl.flight_time_tach IS NOT NULL
      AND (p_aircraft_id IS NULL OR fl.checked_out_aircraft_id = p_aircraft_id)
      AND (p_start_date IS NULL OR DATE(fl.created_at) >= p_start_date)
      AND (p_end_date IS NULL OR DATE(fl.created_at) <= p_end_date)
    GROUP BY fl.checked_out_aircraft_id, a.registration, a.total_time_method::TEXT, a.total_hours, DATE(fl.created_at)
  ),
  credited_flights AS (
    SELECT *,
      CASE time_method
        WHEN 'hobbs' THEN hobbs_time
        WHEN 'tacho' THEN tach_time
        WHEN 'hobbs less 5%' THEN hobbs_time * 0.95
        WHEN 'hobbs less 10%' THEN hobbs_time * 0.90
        WHEN 'tacho less 5%' THEN tach_time * 0.95
        WHEN 'tacho less 10%' THEN tach_time * 0.90
        WHEN 'airswitch' THEN hobbs_time
        ELSE hobbs_time
      END as credited_time
    FROM daily_flights
  ),
  with_future_time AS (
    SELECT cf.*,
      COALESCE(
        (SELECT SUM(cf2.credited_time)
         FROM credited_flights cf2
         WHERE cf2.checked_out_aircraft_id = cf.checked_out_aircraft_id
         AND cf2.flight_date > cf.flight_date),
        0
      ) as credited_time_after_this_date
    FROM credited_flights cf
  )
  SELECT
    wft.checked_out_aircraft_id,
    wft.registration,
    wft.flight_date,
    wft.hobbs_time,
    wft.tach_time,
    wft.credited_time,
    wft.num_flights,
    wft.time_method,
    (wft.current_total_hours - wft.credited_time_after_this_date - wft.credited_time) as start_total,
    (wft.current_total_hours - wft.credited_time_after_this_date) as end_total
  FROM with_future_time wft
  ORDER BY wft.checked_out_aircraft_id, wft.flight_date;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop the constraint
ALTER TABLE flight_logs
  DROP CONSTRAINT IF EXISTS check_total_hours_progression;

-- Step 3: Drop the indexes
DROP INDEX IF EXISTS idx_flight_logs_total_hours;
DROP INDEX IF EXISTS idx_flight_logs_aircraft_date;

-- Step 4: Remove the columns (WARNING: This will delete all data in these columns)
-- Comment out these lines if you want to keep the data
-- ALTER TABLE flight_logs DROP COLUMN IF EXISTS total_hours_start;
-- ALTER TABLE flight_logs DROP COLUMN IF EXISTS total_hours_end;

-- Note: The TypeScript and API code changes will need to be manually reverted using git
COMMENT ON TABLE flight_logs IS 'ROLLBACK applied - removed total_hours tracking columns';
