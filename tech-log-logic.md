# Aircraft Tech Log & Meter Management System

## Overview

This system provides comprehensive aircraft meter tracking, automatic total hours calculation, daily tech log rollups, and robust meter correction handling for flight school operations.

## System Architecture

### Core Components

1. **Bookings API** (`/api/bookings`) - Handles meter updates and corrections
2. **Aircraft Tech Log** (`aircraft_tech_log` table) - Stores daily flight summaries
3. **Edge Functions** - Automated daily rollups and data processing
4. **Check-In UI** - User interface for recording flight meters

## How It Works

### 1. Flight Check-In Process

**User Experience:**
1. Instructor opens booking check-in page
2. Start meters are pre-populated from aircraft current readings
3. User enters end meter readings after flight
4. System automatically:
   - Updates booking with meter readings
   - Updates aircraft current meters
   - Calculates and adds flight time to aircraft total_hours
   - Uses aircraft's configured `total_time_method` for calculations

**Backend Process:**
```
Check-In → Booking Updated → Aircraft Meters Updated → Total Hours Calculated
```

### 2. Total Time Method Calculations

Each aircraft has a `total_time_method` that determines how flight time is credited:

| Method | Calculation | Example | Status |
|--------|-------------|---------|---------|
| `hobbs` | Hobbs time only | 1.0h Hobbs = 1.0h credited | ✅ Full support |
| `tacho` | Tacho time only | 1.0h Tacho = 1.0h credited | ✅ Full support |
| `airswitch` | Uses airswitch time | 1.0h Airswitch = 1.0h credited | ⚠️ Fallback to hobbs* |
| `hobbs less 5%` | Hobbs minus 5% | 1.0h Hobbs = 0.95h credited | ✅ Full support |
| `hobbs less 10%` | Hobbs minus 10% | 1.0h Hobbs = 0.90h credited | ✅ Full support |
| `tacho less 5%` | Tacho minus 5% | 1.0h Tacho = 0.95h credited | ✅ Full support |
| `tacho less 10%` | Tacho minus 10% | 1.0h Tacho = 0.90h credited | ✅ Full support |

**\*Airswitch Note:** Currently uses hobbs time as fallback since airswitch meter fields are not yet implemented in the database schema.

**Example Calculation:**
- Aircraft: VH-ABC (total_time_method: "hobbs less 10%")
- Flight: Hobbs 1.5 hours, Tacho 1.3 hours
- Credited time: 1.5 × 0.90 = 1.35 hours
- Aircraft total_hours increases by 1.35 hours

### 3. Daily Tech Log Rollups

**Automated Process (Midnight UTC):**
- Edge Function `aircraft-daily-rollup` runs automatically
- Processes all completed flights from previous day
- Creates summary entries in `aircraft_tech_log`

**What Gets Recorded:**
```sql
{
  "log_date": "2025-01-29",
  "aircraft_id": "uuid",
  "hobbs_time_total": 8.5,        -- Total Hobbs time flown
  "tach_time_total": 7.2,         -- Total Tacho time flown  
  "credited_time_total": 7.65,    -- Time credited based on method
  "flight_count": 4,              -- Number of flights
  "hobbs_start_of_day": 1000.0,   -- Starting meter reading
  "hobbs_end_of_day": 1008.5,     -- Ending meter reading
  "tach_start_of_day": 800.0,     -- Starting meter reading
  "tach_end_of_day": 807.2,       -- Ending meter reading
  "total_hours_at_end_of_day": 1450.65,  -- Aircraft total_hours
  "booking_ids": ["uuid1", "uuid2", "uuid3", "uuid4"],
  "calculation_method": "hobbs less 10%"
}
```

## User Scenarios

### Scenario 1: Normal Flight Check-In

**Setup:**
- Aircraft VH-ABC: current_hobbs=1000.0, current_tach=800.0, total_hours=1400.0
- Method: "hobbs less 10%"
- Booking: Student lesson from 9:00-10:30 AM

**User Process:**
1. Instructor opens check-in for booking
2. Start meters pre-filled: Hobbs=1000.0, Tach=800.0
3. After flight, instructor enters: Hobbs=1001.5, Tach=801.2
4. System calculates: 1.5h Hobbs × 0.90 = 1.35h credited
5. Aircraft updated: current_hobbs=1001.5, current_tach=801.2, total_hours=1401.35

**Result:**
- ✅ Booking shows completed with correct meters
- ✅ Aircraft meters updated for next flight
- ✅ Total hours increased appropriately

### Scenario 2: Meter Correction (Same Day)

**Setup:**
- Previous flight completed with wrong end meters
- Booking shows: start_hobbs=1000.0, end_hobbs=1001.5 (WRONG)
- Should be: end_hobbs=1002.0

**User Process:**
1. Instructor notices error, edits booking
2. Changes end_hobbs from 1001.5 to 1002.0
3. System automatically:
   - Calculates old impact: 1.5h × 0.90 = 1.35h credited
   - Calculates new impact: 2.0h × 0.90 = 1.80h credited
   - Adjustment needed: +0.45h
   - Updates aircraft: current_hobbs=1002.0, total_hours=1401.80

**Audit Trail:**
```sql
INSERT INTO aircraft_tech_log (
  aircraft_id, entry_type, description,
  log_date, credited_time_total
) VALUES (
  'uuid', 'correction', 
  'Meter correction: Hobbs end 1001.5→1002.0, credited time adjustment +0.45h',
  '2025-01-29', 0.45
);
```

### Scenario 3: Late Correction (Next Day)

**Setup:**
- Daily rollup already ran at midnight
- Error discovered the following morning
- Previous day's rollup shows incorrect totals

**User Process:**
1. User corrects meter readings from previous day
2. System processes correction normally
3. Daily rollup Edge Function detects the correction
4. Creates corrective tech log entry
5. Recalculates previous day's totals if needed

**Tech Log Correction Entry:**
```sql
{
  "entry_type": "correction",
  "description": "Late correction for 2025-01-28: booking abc123 meters adjusted",
  "log_date": "2025-01-28",
  "credited_time_total": -0.25,  -- Negative adjustment
  "notes": "Corrected on 2025-01-29 by user_id"
}
```

### Scenario 4: Multiple Corrections

**Setup:**
- Same booking corrected multiple times
- Original: end_hobbs=1001.5
- First correction: end_hobbs=1002.0
- Second correction: end_hobbs=1001.8

**System Behavior:**
1. Each correction is processed independently
2. System calculates difference from CURRENT state to NEW state
3. Aircraft meters always reflect the latest values
4. All corrections are logged with full audit trail

**Audit Trail:**
```
Correction 1: +0.45h (1001.5→1002.0)
Correction 2: -0.18h (1002.0→1001.8)
Net effect: +0.27h
```

## Edge Functions

### `aircraft-daily-rollup`

**Purpose:** Automated daily processing of flight activity

**Schedule:** Every day at midnight UTC via pg_cron

**Process:**
1. Identifies all aircraft with completed flights from previous day
2. Calculates daily totals for each aircraft
3. Creates comprehensive tech log entries
4. Handles any corrections from previous periods
5. Validates data consistency

**Triggered by:** Scheduled cron job

**Database Impact:**
- Inserts daily summary records into `aircraft_tech_log`
- Updates correction flags and audit trails

## Database Schema

### `aircraft_tech_log` Table

```sql
CREATE TABLE aircraft_tech_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id UUID REFERENCES aircraft(id),
  entry_type TEXT DEFAULT 'daily_rollup',  -- 'daily_rollup', 'correction', 'manual'
  entry_date TIMESTAMP DEFAULT NOW(),
  log_date DATE,                           -- Date of the flight activity
  
  -- Daily Totals
  hobbs_time_total NUMERIC DEFAULT 0,      -- Total Hobbs time for the day
  tach_time_total NUMERIC DEFAULT 0,       -- Total Tacho time for the day
  credited_time_total NUMERIC DEFAULT 0,   -- Time credited to total_hours
  flight_count INTEGER DEFAULT 0,          -- Number of flights completed
  
  -- Meter Readings
  hobbs_start_of_day NUMERIC,              -- First Hobbs reading of day
  hobbs_end_of_day NUMERIC,                -- Last Hobbs reading of day
  tach_start_of_day NUMERIC,               -- First Tacho reading of day
  tach_end_of_day NUMERIC,                 -- Last Tacho reading of day
  total_hours_at_end_of_day NUMERIC,       -- Aircraft total_hours at end of day
  
  -- Metadata
  booking_ids JSONB,                       -- Array of booking UUIDs
  calculation_method TEXT,                 -- total_time_method used
  notes TEXT,                              -- Additional notes
  description TEXT,                        -- Human-readable description
  created_by UUID,                         -- User who created entry
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Relationships

```
aircraft (current_hobbs, current_tach, total_hours, total_time_method)
    ↓
bookings (hobbs_start, hobbs_end, tach_start, tach_end, status)
    ↓
aircraft_tech_log (daily rollups and corrections)
```

## Error Handling & Edge Cases

### Invalid Meter Readings
- **End < Start:** Rejected with validation error
- **Negative Values:** Rejected with validation error
- **Huge Jumps:** Logged for manual review

### Concurrent Updates
- Database transactions ensure consistency
- Last update wins for meter values
- All changes logged in audit trail

### Edge Function Failures
- Retry logic for temporary failures
- Manual rollup capability via API
- Alert system for persistent failures

### Data Consistency
- Daily validation checks via Edge Function
- Automatic correction proposals for discrepancies
- Manual override capability for edge cases

## Benefits

1. **Automated Accuracy:** No manual calculation errors
2. **Complete Audit Trail:** Every change is logged and traceable
3. **Flexible Calculation:** Supports all common total time methods
4. **Correction Friendly:** Easy to fix mistakes without data corruption
5. **Performance:** Non-blocking operations for user interface
6. **Compliance:** Detailed records for regulatory requirements
7. **Maintenance Planning:** Accurate total_hours for scheduling

## Technical Implementation Notes

- **Atomic Operations:** All related updates happen in database transactions
- **Real-time Updates:** Aircraft meters updated immediately on booking completion
- **Eventual Consistency:** Tech log rollups happen asynchronously but are guaranteed
- **Scalability:** Edge Functions can handle high volumes of daily flights
- **Monitoring:** Built-in logging and error tracking throughout the system

## Future Enhancements

### Airswitch Meter Support
To fully support the `airswitch` total_time_method, the following database changes are needed:

```sql
-- Add airswitch meter fields to aircraft table
ALTER TABLE aircraft 
ADD COLUMN current_airswitch NUMERIC DEFAULT 0;

-- Add airswitch meter fields to bookings table  
ALTER TABLE bookings
ADD COLUMN airswitch_start NUMERIC,
ADD COLUMN airswitch_end NUMERIC;

-- Update aircraft_tech_log for airswitch tracking
ALTER TABLE aircraft_tech_log
ADD COLUMN airswitch_time_total NUMERIC DEFAULT 0,
ADD COLUMN airswitch_start_of_day NUMERIC,
ADD COLUMN airswitch_end_of_day NUMERIC;
```

Once implemented, the airswitch calculation would use actual airswitch meter readings instead of falling back to hobbs time.
