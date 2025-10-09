# Check-In Page Requirements Document

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Business Logic](#business-logic)
4. [User Interface](#user-interface)
5. [API Endpoints](#api-endpoints)
6. [React Hooks](#react-hooks)
7. [Invoice Management](#invoice-management)
8. [Aircraft Meter Updates](#aircraft-meter-updates)
9. [Data Flow](#data-flow)
10. [Validation Rules](#validation-rules)
11. [Edge Cases](#edge-cases)

---

## Overview

The Check-In page allows instructors to complete a flight booking by:
1. Recording meter readings (Hobbs, Tach)
2. Selecting flight type and instructor
3. Calculating flight charges
4. Adding landing fees and other charges
5. Reviewing and confirming the invoice
6. Updating aircraft meters

### User Roles
- **Access**: Instructors and above
- **Permissions**: Can check in any booking (RLS policies apply)

---

## Database Schema

### Tables Involved

#### 1. `bookings`
```typescript
{
  id: string;
  aircraft_id: string;
  user_id: string | null;
  instructor_id: string | null; // FK to instructors.id
  start_time: string;
  end_time: string;
  status: 'unconfirmed' | 'confirmed' | 'complete' | 'cancelled';
  flight_type_id: string | null;
  // Joined relations
  flight_type?: FlightType;
  flight_logs?: FlightLog[];
}
```

#### 2. `flight_logs`
```typescript
{
  id: string;
  booking_id: string;
  checked_out_aircraft_id: string | null; // ⚠️ Use this, not booking.aircraft_id
  checked_out_instructor_id: string | null; // ⚠️ Use this, not booking.instructor_id
  hobbs_start: number | null;
  hobbs_end: number | null;
  tach_start: number | null;
  tach_end: number | null;
  solo_end_hobbs: number | null; // For dual->solo transitions
  flight_time_hobbs: number | null; // hobbs_end - hobbs_start
  flight_time_tach: number | null; // tach_end - tach_start
  flight_time: number | null; // Chargeable time
  dual_time: number | null; // Time with instructor
  solo_time: number | null; // Time solo (continuation)
  total_hours_start: number | null; // Aircraft total hours at start
  total_hours_end: number | null; // Aircraft total hours at end
  created_at: string;
  updated_at: string;
}
```

#### 3. `aircraft`
```typescript
{
  id: string;
  registration: string;
  current_hobbs: number | null; // Current Hobbs reading
  current_tach: number | null; // Current Tach reading
  total_hours: number | null; // Cumulative maintenance hours
  total_time_method: TotalTimeMethod | null; // How to calculate total_hours
  record_hobbs: boolean; // Whether to record Hobbs
  record_tacho: boolean; // Whether to record Tach
  aircraft_type_id: string | null;
}
```

**`total_time_method` Options:**
- `'hobbs'`: Use Hobbs time
- `'tacho'`: Use Tach time
- `'airswitch'`: Use airswitch (not implemented, falls back to Hobbs)
- `'hobbs less 5%'`: Hobbs time * 0.95
- `'hobbs less 10%'`: Hobbs time * 0.90
- `'tacho less 5%'`: Tach time * 0.95
- `'tacho less 10%'`: Tach time * 0.90

#### 4. `aircraft_charge_rates`
```typescript
{
  id: string;
  aircraft_id: string;
  flight_type_id: string;
  rate_per_hour: number;
  charge_hobbs: boolean; // Charge by Hobbs time
  charge_tacho: boolean; // Charge by Tach time
  charge_airswitch: boolean; // Charge by airswitch (not implemented)
}
```

#### 5. `invoices`
```typescript
{
  id: string;
  user_id: string;
  booking_id: string;
  invoice_number: string | null; // Generated on completion
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  subtotal: number;
  tax_rate: number; // e.g., 0.15 for 15%
  tax_total: number;
  total_amount: number;
  issue_date: string | null;
  due_date: string | null;
}
```

#### 6. `invoice_items`
```typescript
{
  id: string;
  invoice_id: string;
  chargeable_id: string | null; // FK to chargeables (for landing fees, etc.)
  description: string;
  quantity: number; // Flight hours or item count
  unit_price: number; // Exclusive rate
  rate_inclusive: number | null; // Inclusive rate (with tax)
  amount: number; // quantity * unit_price
  tax_rate: number;
  tax_amount: number;
  line_total: number; // amount + tax_amount
  deleted_at: string | null; // Soft delete
  deleted_by: string | null;
}
```

#### 7. `flight_types`
```typescript
{
  id: string;
  name: string;
  instruction_type: 'dual' | 'solo' | 'trial' | null;
  is_default_solo: boolean; // Auto-selected for solo continuation
}
```

#### 8. `chargeables`
```typescript
{
  id: string;
  name: string; // e.g., "Tauranga Airport"
  description: string | null;
  chargeable_type_id: string; // FK to chargeable_types
  rate: number; // Default rate
  is_taxable: boolean;
  // For landing fees, rate varies by aircraft type (see landing_fee_rates)
}
```

#### 9. `landing_fee_rates`
```typescript
{
  id: string;
  chargeable_id: string; // FK to chargeables
  aircraft_type_id: string; // FK to aircraft_types
  rate: number; // Landing fee for this aircraft type
}
```

---

## Business Logic

### 1. Meter Reading Logic

#### Start Values
- **Source**: `flight_logs.hobbs_start` and `flight_logs.tach_start`
- **Set at**: Check-out time (when booking is confirmed)
- **Read-only on check-in**: Yes (cannot be edited)

#### End Values
- **Source**: User input
- **Validation**: Must be greater than start values
- **Rounding**: Round to 1 decimal place

#### Flight Time Calculations
```typescript
flight_time_hobbs = round(hobbs_end - hobbs_start, 1);
flight_time_tach = round(tach_end - tach_start, 1);
```

### 2. Dual/Solo Flight Logic

#### Flight Types
- **Solo**: Only aircraft charge, no instructor
- **Dual**: Aircraft + instructor for dual portion, aircraft-only for solo continuation
- **Trial**: Standard aircraft + instructor

#### Dual with Solo Continuation
```typescript
// User inputs:
hobbs_start = 100.0  // From check-out
hobbs_end = 101.5    // End of dual portion
solo_end_hobbs = 102.3 // End of solo portion

// Calculations:
dual_time = round(hobbs_end - hobbs_start, 1) = 1.5
solo_time = round(solo_end_hobbs - hobbs_end, 1) = 0.8
total_time = round(dual_time + solo_time, 1) = 2.3

// Invoice items:
// 1. Dual Flight - Aircraft: 1.5 hours @ aircraft_rate
// 2. Dual Flight - Instructor: 1.5 hours @ instructor_rate
// 3. Solo Flight - Aircraft: 0.8 hours @ solo_aircraft_rate
```

**Validation**: `solo_end_hobbs > hobbs_end`

### 3. Chargeable Time Determination

**Priority order**:
1. If `aircraft_charge_rate.charge_hobbs = true` → Use `flight_time_hobbs`
2. Else if `aircraft_charge_rate.charge_tacho = true` → Use `flight_time_tach`
3. Else if `aircraft_charge_rate.charge_airswitch = true` → Use airswitch (not implemented)

**Rounding**: Round to 1 decimal place at all calculation steps

### 4. Aircraft Total Hours Calculation

#### Historical vs. Current Flights

**CRITICAL**: Must determine baseline `total_hours` based on booking time, not current aircraft state.

```sql
-- Find most recent completed flight BEFORE this booking
SELECT total_hours_end 
FROM flight_logs
JOIN bookings ON bookings.id = flight_logs.booking_id
WHERE flight_logs.checked_out_aircraft_id = :aircraft_id
  AND bookings.status = 'complete'
  AND bookings.start_time < :current_booking_start_time
ORDER BY bookings.start_time DESC
LIMIT 1;
```

**Cases**:
- **Has prior flight**: `baseline = prior_flight.total_hours_end`
- **No prior flights**: `baseline = 0` (first flight for this aircraft)
- **Query fails**: `baseline = aircraft.total_hours` (fallback, may be inaccurate)

#### Credited Time Calculation
```typescript
const hobbsTime = hobbs_end - hobbs_start;
const tachoTime = tach_end - tach_start;

let creditedTime = 0;
switch (aircraft.total_time_method) {
  case 'hobbs':
    creditedTime = hobbsTime;
    break;
  case 'tacho':
    creditedTime = tachoTime;
    break;
  case 'airswitch':
    creditedTime = hobbsTime; // Fallback
    break;
  case 'hobbs less 5%':
    creditedTime = hobbsTime * 0.95;
    break;
  case 'hobbs less 10%':
    creditedTime = hobbsTime * 0.90;
    break;
  case 'tacho less 5%':
    creditedTime = tachoTime * 0.95;
    break;
  case 'tacho less 10%':
    creditedTime = tachoTime * 0.90;
    break;
  default:
    creditedTime = hobbsTime; // Fallback
}

// Store in flight_log
flight_log.total_hours_start = round(baseline, 1);
flight_log.total_hours_end = round(baseline + creditedTime, 1);
```

### 5. Invoice Item Matching (UPSERT Logic)

**Goal**: Update existing invoice items instead of creating duplicates when recalculating.

#### Description Patterns
```typescript
// Aircraft items
/^Solo .+ - [A-Z0-9-]+$/          // "Solo PPL Training - ZK-KAZ"
/^Dual .+ - [A-Z0-9-]+$/          // "Dual PPL Training - ZK-ABC"
/^PPL Training - [A-Z0-9-]+$/     // "PPL Training - ZK-ABC" (trial)

// Instructor items
/^Dual .+ - .+$/                  // "Dual PPL Training - John Smith"
/^PPL Training - .+$/             // "PPL Training - Jane Doe" (trial)
```

#### Matching Algorithm
```typescript
for (const required of requiredItems) {
  const existing = activeItems.find(item =>
    required.descriptionPattern.test(item.description) &&
    !alreadyMatched.has(item.id)
  );

  if (existing) {
    // UPDATE
    actions.push({ action: 'update', existingId: existing.id, data: required });
  } else {
    // INSERT
    actions.push({ action: 'insert', data: required });
  }
}

// SOFT DELETE items no longer needed
for (const existing of activeItems) {
  if (!matched.has(existing.id)) {
    actions.push({ action: 'delete', data: { id: existing.id } });
  }
}
```

### 6. Aircraft Meter Update Logic

**When**: After booking status changes to `'complete'`

#### Safety Check
```typescript
// Do NOT update aircraft meters if there are later completed flights
const laterFlights = await db
  .from('flight_logs')
  .join('bookings', 'bookings.id = flight_logs.booking_id')
  .where('flight_logs.checked_out_aircraft_id', aircraftId)
  .where('bookings.status', 'complete')
  .where('bookings.start_time', '>', currentBookingStartTime)
  .limit(1);

if (laterFlights.length > 0) {
  console.warn('Not updating aircraft - historical booking');
  return; // Skip update
}
```

#### Update
```typescript
await db
  .from('aircraft')
  .update({
    current_hobbs: flight_log.hobbs_end,
    current_tach: flight_log.tach_end,
    total_hours: flight_log.total_hours_end,
  })
  .eq('id', aircraftId);
```

---

## User Interface

### Layout
- **Two-column layout**:
  - **Left (40%)**: Check-In Details form
  - **Right (60%)**: Invoice preview

### Check-In Details Section

#### Aircraft Display
```
Checked-Out Aircraft: ZK-KAZ
```

#### Flight Configuration
- **Flight Type Dropdown**: All flight types, pre-selected from booking
- **Instructor Dropdown**: All active instructors (only for dual/trial flights)
- **Rate Display**: Shows tax-inclusive rates below dropdowns

#### Meter Inputs
- **Tacho Meter**:
  - Start Tacho (read-only, from check-out)
  - End Tacho (user input)
  - Total: `X.X hours`
  - Highlight if used for billing
  
- **Hobbs Meter**:
  - Start Hobbs (read-only, from check-out)
  - End Hobbs (user input)
  - Total: `X.X hours`
  - Highlight if used for billing

#### Solo Continuation (Conditional)
- **Show when**: `instruction_type === 'dual' && hobbs_end > hobbs_start`
- **Collapsible section**: Expand/collapse with chevron
- **Fields**:
  - Solo Flight Type dropdown (only solo flight types)
  - Solo End Hobbs input
  - Validation: Must be > dual end hobbs

#### Calculate Button
- **Text**: "Calculate Flight Charges"
- **Enabled when**: All required fields filled, rates loaded
- **Action**: Call `/api/bookings/[id]/calculate-charges`

### Invoice Section

#### Header
```
Invoice
```

#### Invoice Table
| Item | Qty | Rate | Total | Actions |
|------|-----|------|-------|---------|
| Dual PPL Training - ZK-ABC | 1.5 | $295.65 | $443.48 | ✏️ 🗑️ |
| Dual PPL Training - John Smith | 1.5 | $150.00 | $225.00 | ✏️ 🗑️ |
| Solo PPL Training - ZK-ABC | 0.8 | $250.00 | $200.00 | ✏️ 🗑️ |
| Landing Fee - Tauranga Airport | 1 | $45.00 | $45.00 | ✏️ 🗑️ |

**Actions**:
- Edit: Not implemented (disabled)
- Delete: Soft-delete invoice item

#### Add Extra Charges

**Tabs**:
1. **Landing Fees**: Search airports, shows aircraft-specific rates
2. **Airways Fees**: Standard airways charges
3. **Other**: All other chargeable items

**Landing Fee Selector**:
- Search by airport name
- Shows rate for current aircraft type
- Warning if no rate configured
- Quantity input (default 1)
- Add button

**Chargeable Search Dropdown**:
- Search by name
- Groups by category
- Shows tax-inclusive rate
- Quantity input (default 1)
- Add button

#### Invoice Footer
```
Subtotal (excl. Tax): $868.48
Tax (15%): $130.27
Total: $998.75
```

#### Action Buttons

**Before Completion**:
```
[Save and Confirm]
```

**After Completion (Dual Flights)**:
```
✅ Flight charges saved!
[Continue to Debrief] [View Invoice]
```

**After Completion (Solo Flights)**:
- Auto-redirect to invoice page

---

## API Endpoints

### 1. `POST /api/bookings/[id]/calculate-charges`

**Purpose**: Calculate flight charges and update flight log

**Request Body**:
```typescript
{
  chargeTime: number;
  aircraftRate: number;
  instructorRate: number;
  chargingBy: 'hobbs' | 'tacho' | null;
  selectedInstructor: string;
  selectedFlightType: string;
  instructionType?: 'dual' | 'solo' | 'trial' | null;
  hobbsStart?: number;
  hobbsEnd?: number;
  tachStart?: number;
  tachEnd?: number;
  flightTimeHobbs: number;
  flightTimeTach: number;
  soloEndHobbs?: number;
  dualTime: number;
  soloTime: number;
  soloFlightType?: string;
  soloAircraftRate?: number;
}
```

**Response**:
```typescript
{
  booking: Booking; // With joined flight_logs
  flight_log: FlightLog; // Updated/created flight log
  invoice: Invoice; // Created/existing invoice
  invoiceItems: InvoiceItem[]; // Active invoice items
  totals: {
    subtotal: number;
    totalTax: number;
    total: number;
  };
}
```

**Logic**:
1. Fetch booking with flight log
2. Fetch aircraft data for `total_time_method`
3. **Calculate `total_hours_start` and `total_hours_end`** (see Business Logic §4)
4. Update or create flight log with meter readings
5. Get or create invoice
6. Fetch flight type and instructor names
7. **Generate required invoice items** based on `instruction_type`
8. **Match existing items to required items** (UPSERT logic)
9. Execute database operations (update, insert, soft delete)
10. Calculate and return totals

**Validation**:
- `hobbsEnd > hobbsStart`
- `tachEnd > tachStart`
- `soloEndHobbs > hobbsEnd` (if provided)

### 2. `POST /api/bookings/[id]/complete`

**Purpose**: Complete booking, finalize invoice, update aircraft meters

**Request Body**:
```typescript
{
  invoiceItems?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    rate_inclusive?: number;
    amount: number;
    tax_rate?: number;
    tax_amount?: number;
    line_total?: number;
    description: string;
    chargeable_id?: string;
  }>;
}
```

**Response**:
```typescript
{
  booking: Booking; // Status = 'complete'
  invoice: Invoice; // Status = 'pending', invoice_number generated
  success: boolean;
}
```

**Logic**:
1. Fetch booking
2. Fetch invoice
3. **Update invoice items** (if provided in request)
4. **Calculate and update invoice totals**
5. **Generate invoice number** (if not already set)
6. **Update invoice**: Set status to `'pending'`, set `invoice_number`, `issue_date`
7. **Update booking**: Set status to `'complete'`
8. **Update aircraft meters** (see Business Logic §6)
9. Return completed booking and invoice

**Aircraft Update**:
- Calls `updateAircraftOnBookingCompletion()`
- Updates `current_hobbs`, `current_tach`, `total_hours`
- Only if this is the most recent flight (safety check)

### 3. `POST /api/invoice_items`

**Purpose**: Add chargeable item (landing fee, etc.) to invoice

**Request Body**:
```typescript
{
  invoice_id: string;
  chargeable_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  is_taxable: boolean;
}
```

**Response**:
```typescript
{
  invoice_item: InvoiceItem;
}
```

### 4. `DELETE /api/invoice_items/[id]`

**Purpose**: Soft-delete invoice item

**Logic**: Set `deleted_at` and `deleted_by`

---

## React Hooks

### 1. `useBookingCheckIn(bookingId: string)`

**Purpose**: Manage check-in state and mutations

**Returns**:
```typescript
{
  // Mutations
  calculateCharges: (params: CalculateChargesParams) => void;
  completeBooking: (params: CompleteBookingParams) => void;
  
  // States
  isCalculating: boolean;
  isCompleting: boolean;
  
  // Errors
  calculateError: string | undefined;
  completeError: string | undefined;
  
  // Success
  calculateSuccess: boolean;
  completeSuccess: boolean;
  
  // Data
  optimisticData: CheckInData | null;
  lastCalculateResult: CheckInData | undefined;
  lastCompleteResult: CompleteResult | undefined;
  
  // Reset
  resetCalculate: () => void;
  resetComplete: () => void;
}
```

**Optimistic Updates**:
- On `calculateCharges`:
  - Create optimistic invoice items based on `instruction_type`
  - Calculate optimistic `total_hours_start` and `total_hours_end`
  - Update UI immediately, rollback on error

### 2. `useInvoiceData(bookingId: string)`

**Purpose**: Fetch invoice for booking

**Query Key**: `['booking-check-in', 'invoice', bookingId]`

### 3. `useInvoiceItems(invoiceId: string | null)`

**Purpose**: Fetch active invoice items

**Query Key**: `['booking-check-in', 'invoice-items', invoiceId]`

**Filter**: Only non-deleted items (`deleted_at IS NULL`)

### 4. `useInvoiceItemsManagement(invoiceId: string | null)`

**Purpose**: Add/delete invoice items

**Returns**:
```typescript
{
  addItem: (params: { invoiceId: string; item: Chargeable; quantity: number }) => void;
  deleteItem: (params: { itemId: string; invoiceId: string }) => void;
  isAdding: boolean;
  isDeleting: boolean;
  addError: string | undefined;
}
```

### 5. `useOrganizationTaxRate()`

**Purpose**: Fetch organization tax rate

**Fallback**: 0.15 (15%)

---

## Invoice Management

### Tax Calculation

**Tax Rate**: From `organization.tax_rate`, fallback to 0.15

**Calculation**:
```typescript
amount = quantity * unit_price;
tax_amount = amount * tax_rate;
line_total = amount + tax_amount;
rate_inclusive = unit_price * (1 + tax_rate);
```

**Tax-Exempt Items**:
- If `chargeable.is_taxable = false`:
  - `tax_rate = 0`
  - `tax_amount = 0`
  - `line_total = amount`

### Invoice Totals

**Aggregation**:
```typescript
subtotal = SUM(invoice_items.amount WHERE deleted_at IS NULL);
tax_total = SUM(invoice_items.tax_amount WHERE deleted_at IS NULL);
total_amount = SUM(invoice_items.line_total WHERE deleted_at IS NULL);
```

**Update Trigger**: After any invoice item change

### Invoice Number Generation

**Format**: `INV-YYYYMMDD-XXXX` (e.g., `INV-20250108-0001`)

**Logic**:
```typescript
const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
const prefix = `INV-${today}-`;

// Find max invoice number for today
const maxInvoice = await db
  .from('invoices')
  .select('invoice_number')
  .like('invoice_number', `${prefix}%`)
  .order('invoice_number', { ascending: false })
  .limit(1);

const nextNumber = maxInvoice ? parseInt(maxInvoice.invoice_number.slice(-4)) + 1 : 1;
const invoiceNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
```

### Invoice Status Transitions

```
draft → pending → paid
  |        |
  ↓        ↓
cancelled  overdue → paid
           |
           ↓
         refunded
```

**On Check-In**:
- Created as `'draft'` when calculating charges
- Changed to `'pending'` on completion

---

## Aircraft Meter Updates

### Update Flow

```
User clicks "Save and Confirm"
  ↓
POST /api/bookings/[id]/complete
  ↓
Update booking.status = 'complete'
  ↓
Call updateAircraftOnBookingCompletion()
  ↓
Fetch flight_log (has hobbs_end, tach_end, total_hours_end)
  ↓
Safety check: Are there later completed flights?
  ↓ No
Update aircraft:
  - current_hobbs = flight_log.hobbs_end
  - current_tach = flight_log.tach_end
  - total_hours = flight_log.total_hours_end
```

### Safety Check Detail

**Purpose**: Prevent updating aircraft meters backwards when completing historical bookings

**Query**:
```sql
SELECT id 
FROM flight_logs
JOIN bookings ON bookings.id = flight_logs.booking_id
WHERE flight_logs.checked_out_aircraft_id = :aircraft_id
  AND bookings.status = 'complete'
  AND bookings.start_time > :current_booking_start_time
LIMIT 1;
```

**If later flights exist**:
- Log warning
- **Do NOT update aircraft meters**
- Booking still completes successfully
- Flight log still has correct `total_hours_end`

### Meter Correction Flow

**Scenario**: Instructor realizes they entered wrong meter reading after completion

**Process**:
1. Edit flight log meter values via PATCH `/api/bookings` (if implemented)
2. Backend detects meter correction
3. **Recalculate `total_hours_end`**
4. **Update aircraft meters** (only if still most recent flight)

---

## Data Flow

### Page Load
```
1. Server fetches booking with joined:
   - user
   - flight_type
   - flight_logs (with checked_out_aircraft, checked_out_instructor)

2. Client renders:
   - BookingCheckInClient component
   - CheckInDetails form (left column)
   - Invoice preview (right column)

3. Client fetches (via React Query):
   - Invoice (for this booking)
   - Invoice items (for this invoice)
   - Flight types (for dropdown)
   - Aircraft data (for checked_out_aircraft_id)
   - Instructor rate (for checked_out_instructor_id + flight_type_id)
```

### Calculate Charges Flow
```
1. User fills meter readings and clicks "Calculate Flight Charges"
   ↓
2. CheckInDetails validates inputs
   ↓
3. CheckInDetails calls onCalculateCharges callback
   ↓
4. BookingCheckInClient.handleCalculateCharges prepares params
   ↓
5. useBookingCheckIn.calculateCharges mutation fires
   ↓
6. Optimistic update:
   - Create optimistic invoice items
   - Fetch aircraft for total_hours calculation
   - Show loading spinner
   ↓
7. POST /api/bookings/[id]/calculate-charges
   ↓
8. Backend:
   - Calculate total_hours_start and total_hours_end
   - Update/create flight_log
   - Generate required invoice items
   - Match to existing items (UPSERT)
   - Execute updates/inserts/deletes
   ↓
9. Response:
   - booking (with updated flight_logs)
   - flight_log
   - invoice
   - invoiceItems (active only)
   - totals
   ↓
10. Client:
    - Update React Query cache
    - Clear optimistic data
    - Show invoice items
```

### Add Landing Fee Flow
```
1. User searches for airport in LandingFeeSelector
   ↓
2. Fetch landing fees with aircraft-specific rates
   ↓
3. User selects airport and quantity
   ↓
4. Click "Add Fee"
   ↓
5. handleAddLandingFee converts to Chargeable format
   ↓
6. useInvoiceItemsManagement.addItem mutation fires
   ↓
7. POST /api/invoice_items
   ↓
8. Backend:
   - Calculate amounts with tax
   - Insert invoice item
   ↓
9. Client:
   - Optimistic update (add to list immediately)
   - Refetch invoice items
   - Recalculate totals
```

### Complete Booking Flow
```
1. User clicks "Save and Confirm"
   ↓
2. handleConfirmAndSave prepares invoice items array
   ↓
3. useBookingCheckIn.completeBooking mutation fires
   ↓
4. POST /api/bookings/[id]/complete
   ↓
5. Backend:
   - Update invoice items (if provided)
   - Update invoice totals
   - Generate invoice number
   - Update invoice status to 'pending'
   - Update booking status to 'complete'
   - Call updateAircraftOnBookingCompletion()
     - Fetch flight_log
     - Safety check for later flights
     - Update aircraft.current_hobbs, current_tach, total_hours
   ↓
6. Response:
   - booking (status = 'complete')
   - invoice (status = 'pending', invoice_number set)
   ↓
7. Client:
   - Update React Query cache
   - Show success message
   - For dual flights: Show action buttons (Debrief / View Invoice)
   - For solo flights: Redirect to invoice page
```

---

## Validation Rules

### Frontend Validation

#### Meter Readings
- End Hobbs > Start Hobbs
- End Tach > Start Tach
- Solo End Hobbs > Dual End Hobbs (if provided)
- All values rounded to 1 decimal place

#### Flight Configuration
- Flight type must be selected
- For dual/trial flights: Instructor must be selected
- For solo flights: Instructor not required
- Aircraft rate must be loaded
- Instructor rate must be loaded (for dual/trial)
- Solo flight type must be selected (if solo time > 0)
- Solo aircraft rate must be loaded (if solo time > 0)

#### Invoice
- Must have at least 1 invoice item to complete
- Cannot complete if loading or errors

### Backend Validation

#### Request Validation
- All numeric values must be numbers (not strings)
- `hobbsEnd > hobbsStart` (400 error)
- `tachEnd > tachStart` (400 error)
- `soloEndHobbs > hobbsEnd` (400 error if provided)

#### Authorization
- User must be authenticated
- User must have instructor role or above
- For non-privileged users: Can only access own bookings

#### Data Integrity
- Booking must exist
- Flight type must exist
- Instructor must exist (for dual/trial)
- Aircraft must exist
- Invoice must exist before completion

---

## Edge Cases

### 1. Historical Booking Completion

**Scenario**: Instructor completes a booking from 3 days ago, but there are newer completed flights for the aircraft.

**Behavior**:
- ✅ Booking completes successfully
- ✅ Flight log gets correct `total_hours_start` and `total_hours_end` (based on historical baseline)
- ✅ Invoice is generated
- ❌ Aircraft meters are **NOT** updated (safety check prevents going backwards)
- ⚠️ Warning logged: "Not updating aircraft meters - historical booking"

**User Impact**: None. Aircraft meters remain at current state.

### 2. Missing Start Readings

**Scenario**: Flight log has `null` for `hobbs_start` or `tach_start` (bad check-out process).

**Behavior**:
- User must enter start values manually
- Backend accepts start values from request
- Validation: End > Start still applies

**Improvement**: Pre-fill from aircraft current values if flight log is missing data

### 3. Dual Flight Without Solo Continuation

**Scenario**: User enters dual end hobbs but doesn't want solo continuation.

**Behavior**:
- Solo section is collapsible
- If user doesn't expand or doesn't enter `solo_end_hobbs`, it remains `null`
- Only dual time is charged

### 4. Solo Flight With Instructor Selected

**Scenario**: Flight type is solo, but user accidentally selects an instructor.

**Behavior**:
- Frontend hides instructor dropdown for solo flights
- If somehow sent to backend: Instructor rate is ignored (set to 0)
- No instructor charge on invoice

### 5. Rate Not Found

**Scenario**: No `aircraft_charge_rate` exists for aircraft + flight type combination.

**Behavior**:
- Frontend: Rate displays as `null`, button disabled
- Backend: Would return 400 error if somehow triggered

**Resolution**: Admin must configure rate in system

### 6. Recalculating Multiple Times

**Scenario**: User calculates charges, adds landing fee, then changes meter readings and recalculates.

**Behavior**:
- First calculation: Creates invoice items (aircraft, instructor)
- Add landing fee: Adds new item
- Second calculation: **Updates** existing aircraft/instructor items (UPSERT logic), **preserves** landing fee
- Result: No duplicates, landing fee remains

### 7. Tax Rate Change Mid-Flight

**Scenario**: Organization tax rate changes while instructor is completing check-in.

**Behavior**:
- Tax rate is fetched at calculate time
- Stored in `invoice.tax_rate`
- Used for all item calculations
- Subsequent recalculations use the **same** invoice tax rate (not fetched again)

**Consistency**: Invoice tax rate is locked on first calculation

### 8. Network Failure During Completion

**Scenario**: Request to complete booking times out or fails.

**Behavior**:
- Frontend: Shows error message
- Backend: Transaction may have partially committed
- **Idempotency**: Re-clicking "Save and Confirm" should be safe
- Invoice items are already saved (from calculate step)
- Completion only updates statuses and aircraft meters

**Recovery**: User can retry. If booking already completed, endpoint returns success.

### 9. Aircraft `total_time_method` = `null`

**Scenario**: Aircraft has no `total_time_method` configured.

**Behavior**:
- Backend defaults to `'hobbs'`
- Warning logged: "Unknown total_time_method for aircraft - using hobbs time"
- Flight completes successfully

### 10. Solo Flight Type Not Configured

**Scenario**: No flight type has `instruction_type = 'solo'` or `is_default_solo = true`.

**Behavior**:
- User must manually select solo flight type
- If forgotten: Button disabled, error message shown

**Resolution**: Admin must create solo flight type

---

## Testing Checklist

### Unit Tests

#### `generateRequiredItems()`
- [ ] Solo flight generates 1 aircraft item
- [ ] Dual flight generates 2 items (aircraft + instructor)
- [ ] Dual with solo continuation generates 3 items
- [ ] Trial flight generates 2 items
- [ ] Quantities are rounded to 1 decimal
- [ ] Tax rate is applied correctly

#### `matchInvoiceItems()`
- [ ] Updates existing items by description pattern
- [ ] Inserts new items not found
- [ ] Soft-deletes items no longer needed
- [ ] Doesn't match already-matched items
- [ ] Handles empty existing items array
- [ ] Handles empty required items array

#### `roundToOneDecimal()`
- [ ] 1.234 → 1.2
- [ ] 1.999 → 2.0
- [ ] 0.05 → 0.1
- [ ] 0 → 0

#### `calculateTotalHours()`
- [ ] `hobbs` method uses hobbs time
- [ ] `tacho` method uses tach time
- [ ] `hobbs less 5%` applies 0.95 multiplier
- [ ] `tacho less 10%` applies 0.90 multiplier
- [ ] `null` method defaults to hobbs

### Integration Tests

#### Calculate Charges API
- [ ] Creates flight log on first calculation
- [ ] Updates flight log on recalculation
- [ ] Creates invoice on first calculation
- [ ] Uses existing invoice on recalculation
- [ ] Generates correct invoice items for solo flight
- [ ] Generates correct invoice items for dual flight
- [ ] Generates correct invoice items for dual+solo flight
- [ ] Updates existing items on recalculation
- [ ] Preserves manually-added items (landing fees)
- [ ] Returns correct totals
- [ ] Validates hobbs_end > hobbs_start
- [ ] Validates tach_end > tach_start
- [ ] Validates solo_end_hobbs > hobbs_end
- [ ] Calculates `total_hours_start` from prior flight
- [ ] Calculates `total_hours_start` as 0 for first flight
- [ ] Handles aircraft with different `total_time_method` values

#### Complete Booking API
- [ ] Updates invoice items from request
- [ ] Generates invoice number
- [ ] Sets invoice status to 'pending'
- [ ] Sets booking status to 'complete'
- [ ] Updates aircraft meters (current_hobbs, current_tach, total_hours)
- [ ] Skips aircraft update if later flights exist
- [ ] Returns completed booking and invoice
- [ ] Handles missing flight log gracefully

#### Aircraft Update Logic
- [ ] Updates aircraft for current booking
- [ ] Skips update for historical booking
- [ ] Uses `hobbs_end` from flight log
- [ ] Uses `total_hours_end` from flight log
- [ ] Logs warning when skipping update

### E2E Tests

#### Solo Flight Check-In
1. [ ] Navigate to check-in page for solo booking
2. [ ] Meter start values are pre-filled
3. [ ] Instructor dropdown is hidden
4. [ ] Enter end meter readings
5. [ ] Click "Calculate Flight Charges"
6. [ ] Invoice shows 1 aircraft item
7. [ ] Add landing fee
8. [ ] Invoice shows 2 items
9. [ ] Click "Save and Confirm"
10. [ ] Redirects to invoice page
11. [ ] Aircraft meters are updated

#### Dual Flight Check-In
1. [ ] Navigate to check-in page for dual booking
2. [ ] Meter start values are pre-filled
3. [ ] Select instructor
4. [ ] Enter end meter readings
5. [ ] Click "Calculate Flight Charges"
6. [ ] Invoice shows 2 items (aircraft + instructor)
7. [ ] Click "Save and Confirm"
8. [ ] Shows action buttons (Debrief / View Invoice)
9. [ ] Aircraft meters are updated

#### Dual with Solo Continuation
1. [ ] Navigate to check-in page for dual booking
2. [ ] Enter dual end hobbs
3. [ ] Expand solo section
4. [ ] Select solo flight type
5. [ ] Enter solo end hobbs
6. [ ] Click "Calculate Flight Charges"
7. [ ] Invoice shows 3 items (dual aircraft, dual instructor, solo aircraft)
8. [ ] Totals are correct
9. [ ] Click "Save and Confirm"
10. [ ] Shows action buttons
11. [ ] Aircraft meters use solo end values

#### Recalculation
1. [ ] Calculate charges
2. [ ] Add landing fee
3. [ ] Change meter readings
4. [ ] Recalculate charges
5. [ ] Invoice items are updated (not duplicated)
6. [ ] Landing fee is preserved
7. [ ] Totals are recalculated

#### Historical Booking
1. [ ] Complete a booking from 3 days ago
2. [ ] Aircraft has newer completed flights
3. [ ] Booking completes successfully
4. [ ] Flight log has correct `total_hours_start` and `total_hours_end`
5. [ ] Aircraft meters are NOT updated
6. [ ] No error shown to user

---

## Performance Considerations

### Query Optimization

#### Booking Fetch
```sql
-- Single query with joins
SELECT bookings.*, 
       users.first_name, users.last_name, users.email,
       flight_types.*,
       flight_logs.*,
       checked_out_aircraft.*,
       checked_out_instructor.*
FROM bookings
LEFT JOIN users ON users.id = bookings.user_id
LEFT JOIN flight_types ON flight_types.id = bookings.flight_type_id
LEFT JOIN flight_logs ON flight_logs.booking_id = bookings.id
LEFT JOIN aircraft AS checked_out_aircraft ON checked_out_aircraft.id = flight_logs.checked_out_aircraft_id
LEFT JOIN instructors AS checked_out_instructor ON checked_out_instructor.id = flight_logs.checked_out_instructor_id
WHERE bookings.id = :booking_id;
```

**Avoid**: Multiple round-trips to fetch relations

#### Invoice Items Fetch
```sql
-- Filter soft-deleted items in query
SELECT * FROM invoice_items 
WHERE invoice_id = :invoice_id 
  AND deleted_at IS NULL
ORDER BY created_at ASC;
```

**Avoid**: Fetching all items and filtering in code

### React Query Caching

**Stale Times**:
- Booking: 5 minutes
- Invoice: 2 minutes
- Invoice items: 2 minutes
- Flight types: 10 minutes
- Instructors: 10 minutes
- Aircraft: 5 minutes
- Instructor rate: 10 minutes

**Invalidation Strategy**:
- After `calculateCharges`: Invalidate booking, invoice, invoice items
- After `completeBooking`: Invalidate booking, invoice
- After `addItem`: Invalidate invoice items
- After `deleteItem`: Invalidate invoice items

### Optimistic Updates

**Benefits**:
- Instant UI feedback
- Better perceived performance
- Prevents accidental double-submissions

**Implementation**:
- Store optimistic data in mutation state
- Merge with actual data on success
- Rollback on error

---

## Security Considerations

### Authentication
- All endpoints require authenticated user
- JWT token passed via Supabase client

### Authorization
- RLS policies on all tables
- Instructors can access all bookings
- Students can only access own bookings
- Role-based access checked in API routes

### Data Validation
- All numeric inputs validated on backend
- SQL injection prevented by parameterized queries
- Soft deletes prevent accidental data loss

### Rate Limiting
- Consider implementing rate limiting on calculate endpoint
- Prevent abuse/spam recalculations

---

## Future Enhancements

### 1. Airswitch Meter Support
- Add `airswitch_start`, `airswitch_end` to `flight_logs`
- Update calculation logic to handle airswitch
- Add airswitch input fields to UI

### 2. Invoice Item Editing
- Add edit modal for invoice items
- Update quantity, unit price, description
- Recalculate totals

### 3. Bulk Check-In
- Allow checking in multiple bookings at once
- Useful for instructor with multiple students on same day

### 4. Mobile Optimization
- Simplify layout for mobile screens
- Stack columns vertically
- Larger touch targets

### 5. Offline Support
- Cache data for offline use
- Queue mutations when offline
- Sync when back online

### 6. Meter Reading Validation
- Check against aircraft maintenance schedule
- Warn if readings seem unusual (too high/low)
- Compare with previous flights

### 7. Invoice PDF Generation
- Generate PDF invoice on completion
- Email to student
- Attach to invoice record

### 8. Signature Capture
- Capture instructor signature on completion
- Store signature image
- Display on invoice

---

## Appendix

### Key Files

#### Frontend
- `src/app/(auth)/dashboard/bookings/check-in/[id]/page.tsx` - Server-side page
- `src/app/(auth)/dashboard/bookings/check-in/[id]/BookingCheckInClient.tsx` - Client component
- `src/components/bookings/CheckInDetails.tsx` - Check-in form
- `src/components/invoices/ChargeableSearchDropdown.tsx` - Chargeable search
- `src/components/invoices/LandingFeeSelector.tsx` - Landing fee search
- `src/hooks/use-booking-check-in.ts` - Check-in hook
- `src/hooks/use-invoice-items.ts` - Invoice item management hook

#### Backend
- `src/app/api/bookings/[id]/calculate-charges/route.ts` - Calculate charges endpoint
- `src/app/api/bookings/[id]/complete/route.ts` - Complete booking endpoint
- `src/app/api/bookings/route.ts` - Booking CRUD (PATCH for meter corrections)
- `src/app/api/invoice_items/route.ts` - Invoice item CRUD
- `src/lib/invoice-item-upsert.ts` - UPSERT matching logic
- `src/lib/aircraft-update.ts` - Aircraft meter update logic
- `src/lib/invoice-service.ts` - Invoice calculations
- `src/lib/tax-rates.ts` - Tax rate utilities

#### Types
- `src/types/bookings.ts`
- `src/types/flight_logs.ts`
- `src/types/aircraft.ts`
- `src/types/invoices.ts`
- `src/types/invoice_items.ts`
- `src/types/chargeables.ts`
- `src/types/flight_types.ts`

### Database Migrations

Key migrations for check-in functionality:
- `flight_logs` table creation
- `total_hours_start` and `total_hours_end` columns
- `dual_time` and `solo_time` columns
- `solo_end_hobbs` column
- `aircraft.total_time_method` column
- `invoice_items.deleted_at` and `deleted_by` columns
- `landing_fee_rates` table creation

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-08  
**Author**: AI Assistant (Claude)  
**Status**: Complete

