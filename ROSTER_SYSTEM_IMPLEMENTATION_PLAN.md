# Roster/Shift System Implementation Plan

## Project Overview
Implementing a comprehensive roster/shift system for flight school instructors with:
- Recurring weekly availability rules ("forever until changed")
- One-off exceptions (add/replace/cancel shifts) 
- Single-tenant architecture (no organization_id needed)
- Supabase with RLS for security
- Next.js 15 App Router with TypeScript

## Architecture Notes
- **Single-tenant system**: No organization_id fields needed based on existing codebase
- **Security**: RLS policies based on user authentication only
- **Instructors**: Existing table structure uses `instructors` table with `user_id` foreign key
- **User context**: Authentication handled via Supabase Auth with user ID-based access control

## Implementation Checklist

### Phase 1: Database Schema & Functions
- [ ] Create `roster_rules` table for recurring weekly availability
- [ ] Create `shift_overrides` table for one-off changes
- [ ] Create supporting enums and types
- [ ] Implement RLS policies for security
- [ ] Create database functions for schedule resolution
- [ ] Generate TypeScript types from database

### Phase 2: API Routes & Types
- [ ] Create TypeScript type definitions
- [ ] Implement CRUD API routes for roster rules
- [ ] Implement CRUD API routes for shift overrides
- [ ] Create schedule resolution API endpoint
- [ ] Add request/response validation schemas

### Phase 3: Documentation & Testing
- [ ] Document API endpoints
- [ ] Test database functions
- [ ] Verify RLS policies work correctly

---

## Database Schema Design

### 1. Roster Rules Table (`roster_rules`)
Stores recurring weekly availability patterns for instructors.

```sql
CREATE TABLE roster_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE NULL, -- NULL means "forever"
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT roster_rules_time_check CHECK (end_time > start_time),
  CONSTRAINT roster_rules_unique_instructor_day_time 
    UNIQUE (instructor_id, day_of_week, start_time, end_time)
);
```

### 2. Shift Overrides Table (`shift_overrides`)
Stores one-off changes to the regular roster schedule.

```sql
-- Enum for override types
CREATE TYPE shift_override_type AS ENUM ('add', 'replace', 'cancel');

CREATE TABLE shift_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  override_type shift_override_type NOT NULL,
  start_time TIME NULL, -- NULL for 'cancel' type
  end_time TIME NULL,   -- NULL for 'cancel' type
  replaces_rule_id UUID NULL REFERENCES roster_rules(id), -- For 'replace' type
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT shift_overrides_time_check 
    CHECK (
      (override_type = 'cancel' AND start_time IS NULL AND end_time IS NULL) OR
      (override_type IN ('add', 'replace') AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),
  CONSTRAINT shift_overrides_replace_rule_check
    CHECK (
      (override_type = 'replace' AND replaces_rule_id IS NOT NULL) OR
      (override_type IN ('add', 'cancel') AND replaces_rule_id IS NULL)
    )
);
```

### 3. Supporting Database Objects

#### Indexes for Performance
```sql
-- Roster rules indexes
CREATE INDEX idx_roster_rules_instructor_day ON roster_rules(instructor_id, day_of_week);
CREATE INDEX idx_roster_rules_active ON roster_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_roster_rules_effective_dates ON roster_rules(effective_from, effective_until);

-- Shift overrides indexes  
CREATE INDEX idx_shift_overrides_instructor_date ON shift_overrides(instructor_id, override_date);
CREATE INDEX idx_shift_overrides_date ON shift_overrides(override_date);
```

#### RLS Policies
```sql
-- Enable RLS on both tables
ALTER TABLE roster_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roster_rules
CREATE POLICY "Users can view roster rules for instructors they can access" 
ON roster_rules FOR SELECT 
USING (
  instructor_id IN (
    SELECT i.id FROM instructors i 
    WHERE EXISTS (
      SELECT 1 FROM instructors i2 
      WHERE i2.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Instructors can manage their own roster rules" 
ON roster_rules FOR ALL 
USING (
  instructor_id IN (
    SELECT id FROM instructors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and owners can manage all roster rules"
ON roster_rules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND ur.is_active = true
    AND r.name IN ('admin', 'owner')
  )
);

-- RLS Policies for shift_overrides (similar structure)
CREATE POLICY "Users can view shift overrides for instructors they can access" 
ON shift_overrides FOR SELECT 
USING (
  instructor_id IN (
    SELECT i.id FROM instructors i 
    WHERE EXISTS (
      SELECT 1 FROM instructors i2 
      WHERE i2.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Instructors can manage their own shift overrides" 
ON shift_overrides FOR ALL 
USING (
  instructor_id IN (
    SELECT id FROM instructors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and owners can manage all shift overrides"
ON shift_overrides FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND ur.is_active = true
    AND r.name IN ('admin', 'owner')
  )
);
```

#### Database Functions

```sql
-- Function to get resolved schedule for an instructor for a specific week
CREATE OR REPLACE FUNCTION get_instructor_week_schedule(
  p_instructor_id UUID,
  p_week_start_date DATE
)
RETURNS TABLE (
  date DATE,
  day_of_week INTEGER,
  shifts JSONB
) LANGUAGE plpgsql AS $$
DECLARE
  week_end_date DATE := p_week_start_date + INTERVAL '6 days';
  current_date DATE;
  current_dow INTEGER;
BEGIN
  -- Loop through each day of the week
  FOR i IN 0..6 LOOP
    current_date := p_week_start_date + (i || ' days')::INTERVAL;
    current_dow := EXTRACT(DOW FROM current_date);
    
    RETURN QUERY
    WITH regular_shifts AS (
      SELECT 
        current_date as shift_date,
        current_dow as shift_dow,
        jsonb_agg(
          jsonb_build_object(
            'id', rr.id,
            'start_time', rr.start_time,
            'end_time', rr.end_time,
            'type', 'regular',
            'notes', rr.notes
          ) ORDER BY rr.start_time
        ) as shifts
      FROM roster_rules rr
      WHERE rr.instructor_id = p_instructor_id
        AND rr.day_of_week = current_dow
        AND rr.is_active = true
        AND (rr.effective_from <= current_date)
        AND (rr.effective_until IS NULL OR rr.effective_until >= current_date)
        AND NOT EXISTS (
          -- Exclude if there's a 'replace' or 'cancel' override for this rule on this date
          SELECT 1 FROM shift_overrides so
          WHERE so.instructor_id = p_instructor_id
            AND so.override_date = current_date
            AND so.override_type IN ('replace', 'cancel')
            AND (so.replaces_rule_id = rr.id OR so.override_type = 'cancel')
        )
    ),
    override_shifts AS (
      SELECT 
        current_date as shift_date,
        current_dow as shift_dow,
        jsonb_agg(
          jsonb_build_object(
            'id', so.id,
            'start_time', so.start_time,
            'end_time', so.end_time,
            'type', so.override_type::text,
            'notes', so.notes,
            'replaces_rule_id', so.replaces_rule_id
          ) ORDER BY so.start_time
        ) as shifts
      FROM shift_overrides so
      WHERE so.instructor_id = p_instructor_id
        AND so.override_date = current_date
        AND so.override_type IN ('add', 'replace')
    ),
    combined_shifts AS (
      SELECT 
        shift_date,
        shift_dow,
        COALESCE(regular_shifts.shifts, '[]'::jsonb) || COALESCE(override_shifts.shifts, '[]'::jsonb) as all_shifts
      FROM regular_shifts
      FULL OUTER JOIN override_shifts ON regular_shifts.shift_date = override_shifts.shift_date
    )
    SELECT 
      COALESCE(combined_shifts.shift_date, current_date),
      COALESCE(combined_shifts.shift_dow, current_dow),
      COALESCE(combined_shifts.all_shifts, '[]'::jsonb)
    FROM combined_shifts;
  END LOOP;
END;
$$;

-- Function to check for schedule conflicts
CREATE OR REPLACE FUNCTION check_schedule_conflict(
  p_instructor_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_rule_id UUID DEFAULT NULL,
  p_exclude_override_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  conflict_exists BOOLEAN := FALSE;
  dow INTEGER := EXTRACT(DOW FROM p_date);
BEGIN
  -- Check conflicts with roster rules
  SELECT EXISTS (
    SELECT 1 FROM roster_rules rr
    WHERE rr.instructor_id = p_instructor_id
      AND rr.day_of_week = dow
      AND rr.is_active = true
      AND (rr.effective_from <= p_date)
      AND (rr.effective_until IS NULL OR rr.effective_until >= p_date)
      AND (p_exclude_rule_id IS NULL OR rr.id != p_exclude_rule_id)
      AND (
        (p_start_time < rr.end_time AND p_end_time > rr.start_time)
      )
  ) INTO conflict_exists;
  
  IF conflict_exists THEN
    RETURN TRUE;
  END IF;
  
  -- Check conflicts with shift overrides
  SELECT EXISTS (
    SELECT 1 FROM shift_overrides so
    WHERE so.instructor_id = p_instructor_id
      AND so.override_date = p_date
      AND so.override_type IN ('add', 'replace')
      AND (p_exclude_override_id IS NULL OR so.id != p_exclude_override_id)
      AND (
        (p_start_time < so.end_time AND p_end_time > so.start_time)
      )
  ) INTO conflict_exists;
  
  RETURN conflict_exists;
END;
$$;
```

---

## TypeScript Types

### Core Types (`src/types/roster.ts`)
```typescript
export interface RosterRule {
  id: string;
  instructor_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  is_active: boolean;
  effective_from: string; // ISO date
  effective_until: string | null; // ISO date or null
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Optional joined data
  instructor?: Instructor;
}

export interface CreateRosterRuleRequest {
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from?: string;
  effective_until?: string | null;
  notes?: string | null;
}

export interface UpdateRosterRuleRequest {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
  effective_from?: string;
  effective_until?: string | null;
  notes?: string | null;
}
```

### Shift Override Types (`src/types/shift-overrides.ts`)
```typescript
export type ShiftOverrideType = 'add' | 'replace' | 'cancel';

export interface ShiftOverride {
  id: string;
  instructor_id: string;
  override_date: string; // ISO date
  override_type: ShiftOverrideType;
  start_time: string | null; // null for 'cancel' type
  end_time: string | null;   // null for 'cancel' type
  replaces_rule_id: string | null; // For 'replace' type
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Optional joined data
  instructor?: Instructor;
  replaces_rule?: RosterRule;
}

export interface CreateShiftOverrideRequest {
  instructor_id: string;
  override_date: string;
  override_type: ShiftOverrideType;
  start_time?: string | null;
  end_time?: string | null;
  replaces_rule_id?: string | null;
  notes?: string | null;
}

export interface UpdateShiftOverrideRequest {
  override_date?: string;
  override_type?: ShiftOverrideType;
  start_time?: string | null;
  end_time?: string | null;
  replaces_rule_id?: string | null;
  notes?: string | null;
}
```

### Schedule Resolution Types (`src/types/schedule.ts`)
```typescript
export interface ScheduleShift {
  id: string;
  start_time: string;
  end_time: string;
  type: 'regular' | 'add' | 'replace';
  notes: string | null;
  replaces_rule_id?: string | null;
}

export interface DaySchedule {
  date: string; // ISO date
  day_of_week: number;
  shifts: ScheduleShift[];
}

export interface WeekSchedule {
  week_start: string; // ISO date
  instructor_id: string;
  days: DaySchedule[];
}

export interface ScheduleConflict {
  has_conflict: boolean;
  conflicting_shifts?: ScheduleShift[];
}
```

---

## API Routes

### 1. Roster Rules API (`/api/roster-rules`)

**GET /api/roster-rules**
- Query params: `instructor_id`, `day_of_week`, `is_active`
- Returns: `{ roster_rules: RosterRule[] }`
- Includes joined instructor user data

**POST /api/roster-rules**
- Body: `CreateRosterRuleRequest`
- Returns: `{ roster_rule: RosterRule }` (201)
- Validates times and checks for conflicts
- Error responses: 400 (validation), 409 (conflict/duplicate), 500 (server)

**GET /api/roster-rules/[id]**
- Returns: `{ roster_rule: RosterRule }` or 404

**PATCH /api/roster-rules/[id]**
- Body: `UpdateRosterRuleRequest`
- Returns: `{ roster_rule: RosterRule }`
- Validates updates and checks conflicts
- Error responses: 400 (validation), 404 (not found), 409 (conflict), 500 (server)

**DELETE /api/roster-rules/[id]**
- Returns: `{ message: string }`

### 2. Shift Overrides API (`/api/shift-overrides`)

**GET /api/shift-overrides**
- Query params: `instructor_id`, `override_date`, `date_from`, `date_to`
- Returns: `{ shift_overrides: ShiftOverride[] }`
- Includes joined instructor and replaces_rule data

**POST /api/shift-overrides**
- Body: `CreateShiftOverrideRequest`
- Returns: `{ shift_override: ShiftOverride }` (201)
- Validates override type constraints and checks conflicts
- Error responses: 400 (validation), 409 (conflict), 500 (server)

**GET /api/shift-overrides/[id]**
- Returns: `{ shift_override: ShiftOverride }` or 404

**PATCH /api/shift-overrides/[id]**
- Body: `UpdateShiftOverrideRequest`
- Returns: `{ shift_override: ShiftOverride }`
- Validates updates and checks conflicts
- Error responses: 400 (validation), 404 (not found), 409 (conflict), 500 (server)

**DELETE /api/shift-overrides/[id]**
- Returns: `{ message: string }`

### 3. Schedule Resolution API (`/api/schedule`)

**GET /api/schedule/week**
- Query params: `instructor_id`, `week_start_date` (ISO date)
- Returns: `{ schedule: WeekSchedule }`
- Resolves roster rules + overrides for 7-day period
- week_start_date should be a Monday

**POST /api/schedule**
- Body: `ConflictCheckRequest`
- Returns: `{ has_conflict: boolean, conflicting_shifts?: ScheduleShift[] }`
- Checks for time conflicts with existing rules/overrides
- Optionally excludes specific rule/override IDs

---

## Implementation Status

### ✅ Completed
- [x] **Implementation plan created** - Comprehensive database design and API architecture
- [x] **Architecture analysis** - Confirmed single-tenant system structure
- [x] **Database schema implementation** - Created tables, enums, and indexes
- [x] **RLS policies setup** - Security implementation complete
- [x] **Database functions** - Schedule resolution and conflict checking functions
- [x] **TypeScript types** - Type definitions for frontend (`roster.ts`, `shift-overrides.ts`, `schedule.ts`)
- [x] **API routes** - CRUD endpoints implementation complete

### 🚧 In Progress
- [ ] **Documentation & testing** - Finalize documentation and validate implementation

### ⏳ Ready for Frontend Development
- [ ] **Frontend components** - Calendar view, forms, and management UI
- [ ] **Data fetching hooks** - React Query hooks for API integration
- [ ] **Testing & validation** - Comprehensive testing of the complete system

---

## Notes & Considerations

1. **Single-tenant architecture**: No organization_id fields needed based on existing codebase pattern
2. **Security**: RLS policies will ensure instructors can only access their own data, while admins/owners can access all
3. **Performance**: Proper indexing on commonly queried fields (instructor_id, day_of_week, override_date)
4. **Flexibility**: Support for effective date ranges on roster rules allows for scheduled changes
5. **Data integrity**: Database constraints ensure valid time ranges and override type consistency
6. **Conflict detection**: Database function to check for scheduling conflicts before allowing new rules/overrides

## Database Implementation Summary

### Tables Created
1. **`roster_rules`** - Recurring weekly availability patterns
2. **`shift_overrides`** - One-off schedule changes
3. **`shift_override_type`** (enum) - Types: add, replace, cancel

### Functions Created
1. **`get_instructor_week_schedule(instructor_id, week_start_date)`** - Returns resolved schedule
2. **`check_schedule_conflict(...)`** - Validates time conflicts

### Security (RLS Policies)
- Instructors can only manage their own rosters/overrides
- Admins/owners can manage all rosters/overrides
- Read access granted to authenticated users who can access instructor data

### Performance Optimizations
- Indexes on commonly queried fields
- Efficient query patterns in database functions
- Proper constraints for data integrity

## Frontend Integration Guide

### Basic Usage Examples

```typescript
// Fetch instructor's roster rules
const response = await fetch('/api/roster-rules?instructor_id=123&is_active=true');
const { roster_rules } = await response.json();

// Get resolved week schedule
const weekStart = '2025-01-06'; // Monday
const scheduleResponse = await fetch(`/api/schedule/week?instructor_id=123&week_start_date=${weekStart}`);
const { schedule } = await scheduleResponse.json();

// Check for conflicts before creating
const conflictResponse = await fetch('/api/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instructor_id: '123',
    date: '2025-01-07',
    start_time: '09:00',
    end_time: '17:00'
  })
});
const { has_conflict, conflicting_shifts } = await conflictResponse.json();
```

## Ready for Frontend Development

The complete backend infrastructure is now in place:

- ✅ Database schema with proper constraints and indexes
- ✅ Security via RLS policies
- ✅ Business logic in database functions
- ✅ RESTful API endpoints with validation
- ✅ TypeScript types for frontend integration
- ✅ Conflict detection and schedule resolution

Next steps involve building the frontend components for roster management and calendar display.
