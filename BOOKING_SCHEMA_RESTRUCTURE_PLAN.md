# Booking Schema Restructure Plan

## Overview
This document outlines the comprehensive plan to restructure the booking system by separating general booking information from flight-specific data. The goal is to create a cleaner, more maintainable schema where bookings handle calendar/scheduling and flight_logs handle actual flight data.

## Current Problems
1. **Mixed Responsibilities**: The `bookings` table contains both general booking info AND flight-specific data
2. **Confusing Data Flow**: `booking_details` contains flight data but is created during checkout
3. **API Complexity**: Multiple endpoints need to handle overlapping data
4. **Type Confusion**: TypeScript types mix booking and flight concepts

## Target Architecture

### New `flight_logs` Table
```sql
CREATE TABLE flight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Aircraft & Instructor (actual vs booked)
  checked_out_aircraft_id uuid REFERENCES aircraft(id),
  checked_out_instructor_id uuid REFERENCES instructors(id),
  
  -- Flight timing
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  eta timestamp with time zone,
  
  -- Flight meter readings
  hobbs_start numeric,
  hobbs_end numeric,
  tach_start numeric,
  tach_end numeric,
  flight_time_hobbs numeric,
  flight_time_tach numeric,
  flight_time numeric,
  
  -- Flight details
  fuel_on_board integer,
  passengers text,
  route text,
  equipment jsonb,
  
  -- Flight status
  briefing_completed boolean DEFAULT false,
  authorization_completed boolean DEFAULT false,
  override_conflict boolean DEFAULT false,
  
  -- Notes
  flight_remarks text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Cleaned `bookings` Table
```sql
-- Remove these flight-specific columns:
-- hobbs_start, hobbs_end, tach_start, tach_end
-- flight_time_hobbs, flight_time_tach, flight_time
-- briefing_completed, checked_out_aircraft_id, checked_out_instructor_id

-- Keep only general booking info:
id, aircraft_id, user_id, flight_type_id, lesson_id, instructor_id
start_time, end_time, status, booking_type
purpose, notes, remarks
created_at, updated_at
```

## Implementation Plan

### Phase 1: Database Migration
- [ ] Create `flight_logs` table
- [ ] Migrate existing `booking_details` data to `flight_logs`
- [ ] Move flight-specific columns from `bookings` to `flight_logs`
- [ ] Update foreign key constraints
- [ ] Drop `booking_details` table
- [ ] Create indexes for performance

### Phase 2: TypeScript Types Update
- [ ] Create new `FlightLog` interface
- [ ] Update `Booking` interface (remove flight-specific fields)
- [ ] Update `BookingDetails` → `FlightLog` (rename and restructure)
- [ ] Update related types (invoices, etc.)

### Phase 3: API Endpoints Update
- [ ] Create `/api/flight-logs` endpoints (CRUD)
- [ ] Update `/api/bookings` endpoints
- [ ] Update `/api/bookings/[id]/calculate-charges`
- [ ] Update `/api/bookings/[id]/complete`
- [ ] Update booking cancellation endpoints

### Phase 4: Component Updates
- [ ] Update `CheckOutForm.tsx` to use `flight_logs`
- [ ] Update `CheckInDetails.tsx` to use `flight_logs`
- [ ] Update `use-booking-check-in.ts` hook
- [ ] Update `use-checkout.ts` hook
- [ ] Update all booking-related components

### Phase 5: Testing & Validation
- [ ] Test migration with sample data
- [ ] Test all booking workflows
- [ ] Test invoice generation
- [ ] Test booking cancellation
- [ ] Performance testing

## Detailed Implementation Steps

### Step 1: Database Migration Script
```sql
-- 1. Create flight_logs table
CREATE TABLE flight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  checked_out_aircraft_id uuid REFERENCES aircraft(id),
  checked_out_instructor_id uuid REFERENCES instructors(id),
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  eta timestamp with time zone,
  hobbs_start numeric,
  hobbs_end numeric,
  tach_start numeric,
  tach_end numeric,
  flight_time_hobbs numeric,
  flight_time_tach numeric,
  flight_time numeric,
  fuel_on_board integer,
  passengers text,
  route text,
  equipment jsonb,
  briefing_completed boolean DEFAULT false,
  authorization_completed boolean DEFAULT false,
  override_conflict boolean DEFAULT false,
  flight_remarks text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Migrate booking_details to flight_logs
INSERT INTO flight_logs (
  id, booking_id, checked_out_aircraft_id, checked_out_instructor_id,
  actual_start, actual_end, eta, fuel_on_board, passengers, route,
  equipment, authorization_completed, override_conflict, flight_remarks,
  created_at, updated_at
)
SELECT 
  id, booking_id, 
  NULL as checked_out_aircraft_id, -- Will be updated from bookings
  NULL as checked_out_instructor_id, -- Will be updated from bookings
  actual_start, actual_end, eta, fuel_on_board, passengers, route,
  equipment, authorization_completed, override_conflict, remarks as flight_remarks,
  created_at, updated_at
FROM booking_details;

-- 3. Update flight_logs with aircraft/instructor from bookings
UPDATE flight_logs 
SET 
  checked_out_aircraft_id = b.checked_out_aircraft_id,
  checked_out_instructor_id = b.checked_out_instructor_id,
  hobbs_start = b.hobbs_start,
  hobbs_end = b.hobbs_end,
  tach_start = b.tach_start,
  tach_end = b.tach_end,
  flight_time_hobbs = b.flight_time_hobbs,
  flight_time_tach = b.flight_time_tach,
  flight_time = b.flight_time,
  briefing_completed = b.briefing_completed
FROM bookings b
WHERE flight_logs.booking_id = b.id;

-- 4. Remove flight-specific columns from bookings
ALTER TABLE bookings 
DROP COLUMN IF EXISTS hobbs_start,
DROP COLUMN IF EXISTS hobbs_end,
DROP COLUMN IF EXISTS tach_start,
DROP COLUMN IF EXISTS tach_end,
DROP COLUMN IF EXISTS flight_time_hobbs,
DROP COLUMN IF EXISTS flight_time_tach,
DROP COLUMN IF EXISTS flight_time,
DROP COLUMN IF EXISTS briefing_completed,
DROP COLUMN IF EXISTS checked_out_aircraft_id,
DROP COLUMN IF EXISTS checked_out_instructor_id;

-- 5. Drop booking_details table
DROP TABLE booking_details;

-- 6. Create indexes
CREATE INDEX idx_flight_logs_booking_id ON flight_logs(booking_id);
CREATE INDEX idx_flight_logs_aircraft_id ON flight_logs(checked_out_aircraft_id);
CREATE INDEX idx_flight_logs_instructor_id ON flight_logs(checked_out_instructor_id);
```

### Step 2: TypeScript Types Update

#### New `src/types/flight_logs.ts`
```typescript
export interface FlightLog {
  id: string;
  booking_id: string;
  checked_out_aircraft_id?: string | null;
  checked_out_instructor_id?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  eta?: string | null;
  hobbs_start?: number | null;
  hobbs_end?: number | null;
  tach_start?: number | null;
  tach_end?: number | null;
  flight_time_hobbs?: number | null;
  flight_time_tach?: number | null;
  flight_time?: number | null;
  fuel_on_board?: number | null;
  passengers?: string | null;
  route?: string | null;
  equipment?: unknown | null;
  briefing_completed: boolean;
  authorization_completed: boolean;
  override_conflict: boolean;
  flight_remarks?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  checked_out_aircraft?: import("./aircraft").Aircraft;
  checked_out_instructor?: import("./instructors").Instructor;
}

export type FlightLogInsert = Omit<FlightLog, 'id' | 'created_at' | 'updated_at'>;
export type FlightLogUpdate = Partial<FlightLogInsert>;
```

#### Updated `src/types/bookings.ts`
```typescript
export interface Booking {
  id: string;
  aircraft_id: string;
  user_id: string | null;
  instructor_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string;
  remarks: string | null;
  lesson_id: string | null;
  flight_type_id: string | null;
  booking_type: BookingType | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: import("./users").User;
  instructor?: import("./instructors").Instructor;
  aircraft?: import("./aircraft").Aircraft;
  flight_logs?: FlightLog[];
  cancellation?: BookingCancellation;
}
```

### Step 3: API Endpoints Update

#### New `src/app/api/flight-logs/route.ts`
```typescript
export async function POST(req: NextRequest) {
  // Create flight log
}

export async function PATCH(req: NextRequest) {
  // Update flight log
}
```

#### Updated `src/app/api/bookings/[id]/calculate-charges/route.ts`
- Update to work with `flight_logs` instead of `booking_details`
- Move meter readings to `flight_logs`
- Update invoice generation logic

### Step 4: Component Updates

#### `CheckOutForm.tsx` Changes
- Update form to create/update `flight_logs` instead of `booking_details`
- Update API calls to use new endpoints
- Update form validation

#### `CheckInDetails.tsx` Changes
- Update to read meter readings from `flight_logs`
- Update charge calculation logic
- Update form submission

#### `use-booking-check-in.ts` Changes
- Update to work with `flight_logs`
- Update optimistic updates
- Update query keys

## Migration Strategy

### Pre-Migration Checklist
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify all existing data migrates correctly
- [ ] Test all booking workflows

### Migration Execution
1. **Maintenance Window**: Schedule during low-usage period
2. **Run Migration**: Execute database migration script
3. **Deploy Code**: Deploy updated application code
4. **Verify**: Test critical booking workflows
5. **Monitor**: Watch for errors and performance issues

### Rollback Plan
1. **Database Rollback**: Restore from backup
2. **Code Rollback**: Deploy previous version
3. **Data Recovery**: Restore any lost data

## Testing Strategy

### Unit Tests
- [ ] Test new `FlightLog` type definitions
- [ ] Test API endpoint updates
- [ ] Test hook updates

### Integration Tests
- [ ] Test booking creation workflow
- [ ] Test checkout process
- [ ] Test check-in process
- [ ] Test invoice generation

### End-to-End Tests
- [ ] Test complete booking lifecycle
- [ ] Test booking cancellation
- [ ] Test multiple flight logs per booking

## Risk Assessment

### High Risk
- **Data Loss**: Migration could lose data if not done carefully
- **API Breaking Changes**: Existing integrations might break
- **Performance Impact**: New queries might be slower

### Medium Risk
- **Type Errors**: TypeScript compilation errors
- **UI Issues**: Components might not work correctly
- **Testing Gaps**: Some edge cases might not be covered

### Low Risk
- **Naming Conflicts**: New table/field names
- **Documentation**: Need to update docs

## Success Criteria

### Functional
- [ ] All existing bookings work correctly
- [ ] New bookings can be created
- [ ] Checkout process works
- [ ] Check-in process works
- [ ] Invoice generation works
- [ ] Booking cancellation works

### Performance
- [ ] No significant performance degradation
- [ ] Database queries are optimized
- [ ] UI remains responsive

### Code Quality
- [ ] Clean separation of concerns
- [ ] Type safety maintained
- [ ] No breaking changes for external APIs

## Timeline

### Week 1: Planning & Preparation
- [ ] Finalize migration script
- [ ] Create comprehensive test suite
- [ ] Set up staging environment

### Week 2: Development
- [ ] Implement database migration
- [ ] Update TypeScript types
- [ ] Update API endpoints
- [ ] Update components and hooks

### Week 3: Testing
- [ ] Unit testing
- [ ] Integration testing
- [ ] End-to-end testing
- [ ] Performance testing

### Week 4: Deployment
- [ ] Staging deployment
- [ ] Production migration
- [ ] Monitoring and validation
- [ ] Documentation updates

## Post-Migration Tasks

### Immediate (Day 1)
- [ ] Monitor system performance
- [ ] Check error logs
- [ ] Verify critical workflows

### Short-term (Week 1)
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] User feedback collection

### Long-term (Month 1)
- [ ] Documentation updates
- [ ] Training materials
- [ ] Process improvements

## Conclusion

This restructure will significantly improve the codebase by:
1. **Clear Separation**: Bookings handle scheduling, flight_logs handle flight data
2. **Better Maintainability**: Easier to understand and modify
3. **Improved Performance**: More efficient queries
4. **Enhanced Flexibility**: Support for multiple flight logs per booking
5. **Type Safety**: Better TypeScript support

The migration is complex but necessary for long-term maintainability and scalability.
