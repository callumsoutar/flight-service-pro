# Booking Complete Page - Implementation Plan

## Overview
Building a new, modern booking completion page at `/dashboard/bookings/complete/[id]` with simplified UX and reliable aircraft meter updates.

## Design Improvements
1. **Cleaner Layout**: Card-based design with clear sections
2. **Better Spacing**: More whitespace, clearer visual hierarchy
3. **Modern Components**: Shadcn/UI consistent styling
4. **Simplified Flow**: Fewer steps, clearer actions
5. **Inline Validation**: Real-time feedback

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── dashboard/
│   │       └── bookings/
│   │           └── complete/
│   │               └── [id]/
│   │                   ├── page.tsx (Server Component)
│   │                   └── BookingCompletionClient.tsx (Client Component)
│   └── api/
│       └── bookings/
│           └── [id]/
│               └── complete-flight/
│                   └── route.ts (New API endpoint)
├── components/
│   └── bookings/
│       ├── MeterReadingCard.tsx (New)
│       ├── FlightChargesCard.tsx (New)
│       └── InvoicePreviewCard.tsx (New)
├── hooks/
│   └── use-booking-completion.ts (New)
└── lib/
    └── aircraft-meter-update.ts (Enhanced from existing)
```

## Component Architecture

### 1. Server Page (`page.tsx`)
- Fetch booking with all relations
- Fetch aircraft data
- Fetch invoice (if exists)
- Pass to client component

### 2. Client Component (`BookingCompletionClient.tsx`)
- Main orchestrator
- Manages state for entire flow
- Handles calculate and complete actions

### 3. MeterReadingCard
- Clean input for Hobbs/Tach readings
- Visual indicator of which meter is used for billing
- Solo continuation section (collapsible)
- Calculate button

### 4. FlightChargesCard
- Summary of flight times
- Selected flight type and instructor
- Quick edit capability

### 5. InvoicePreviewCard
- Clean invoice table
- Add chargeables/landing fees
- Totals summary
- Complete button

## Data Flow

```
Page Load
  ↓
Server fetches booking + aircraft + invoice
  ↓
Client receives data
  ↓
User enters meter readings
  ↓
User clicks "Calculate Charges"
  ↓
POST /api/bookings/[id]/complete-flight { action: 'calculate' }
  ↓
Backend:
  - Updates flight_log with meters
  - Calculates total_hours_start/end
  - Creates/updates invoice items
  - Returns updated data
  ↓
UI updates with invoice preview
  ↓
User adds landing fees (optional)
  ↓
User clicks "Complete Flight"
  ↓
POST /api/bookings/[id]/complete-flight { action: 'complete' }
  ↓
Backend:
  - Finalizes invoice
  - Sets booking status = 'complete'
  - Updates aircraft meters
  - Returns success
  ↓
Redirect to debrief or invoice
```

## API Endpoint Design

### POST `/api/bookings/[id]/complete-flight`

**Purpose**: Single endpoint for both calculate and complete actions

**Request**:
```typescript
{
  action: 'calculate' | 'complete';
  
  // For 'calculate' action:
  meterReadings?: {
    hobbsStart: number;
    hobbsEnd: number;
    tachStart: number;
    tachEnd: number;
    soloEndHobbs?: number;
  };
  flightTypeId?: string;
  instructorId?: string;
  soloFlightTypeId?: string;
  
  // For 'complete' action:
  invoiceItems?: InvoiceItem[];
}
```

**Response**:
```typescript
{
  booking: Booking;
  flightLog: FlightLog;
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  aircraft?: Aircraft; // Only on complete
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
}
```

## Hook Design

### `useBookingCompletion(bookingId: string)`

```typescript
{
  // State
  meterReadings: MeterReadings;
  setMeterReadings: (readings: MeterReadings) => void;
  
  // Mutations
  calculateCharges: UseMutationResult;
  completeBooking: UseMutationResult;
  
  // Status
  isCalculating: boolean;
  isCompleting: boolean;
  
  // Data
  calculatedData: CalculatedData | null;
  
  // Errors
  calculateError: string | null;
  completeError: string | null;
}
```

## UI Design Improvements

### Color Scheme
- Primary: Indigo/Blue for actions
- Success: Green for completion states
- Warning: Amber for validation
- Neutral: Gray for inactive states

### Typography
- Headings: font-semibold text-lg
- Body: text-sm
- Labels: text-xs font-medium text-gray-600
- Values: font-mono for numbers

### Spacing
- Card padding: p-6
- Section gaps: gap-6
- Form gaps: gap-4
- Input gaps: gap-2

### Components
- Cards with subtle shadows and borders
- Inputs with focus states
- Buttons with loading states
- Badges for status indicators
- Icons for visual cues

## Implementation Steps

### Phase 1: Core Infrastructure ✅
- [x] Create TODO list
- [x] Create implementation plan
- [ ] Create API endpoint
- [ ] Create hook

### Phase 2: Components 🔄
- [ ] MeterReadingCard
- [ ] FlightChargesCard
- [ ] InvoicePreviewCard
- [ ] BookingCompletionClient
- [ ] Server page

### Phase 3: Integration 📋
- [ ] Connect components to hook
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add validation

### Phase 4: Aircraft Updates 🚁
- [ ] Ensure aircraft meters update on complete
- [ ] Add safety checks for historical bookings
- [ ] Test with real data

### Phase 5: Polish ✨
- [ ] Add animations
- [ ] Add toast notifications
- [ ] Add keyboard shortcuts
- [ ] Mobile responsiveness

## Key Features

### Must Have
✅ Enter meter readings (Hobbs/Tach)
✅ Calculate charges
✅ Generate invoice items
✅ Add landing fees
✅ Complete booking
✅ Update aircraft meters

### Nice to Have
- Quick edit meter readings after calculation
- Undo calculate
- Save draft
- Print invoice preview
- Email invoice

## Testing Plan

1. **Solo Flight**: Enter meters → Calculate → Add landing fee → Complete
2. **Dual Flight**: Enter meters → Calculate → Complete → Verify debrief redirect
3. **Dual + Solo**: Enter dual meters → Enter solo meters → Calculate → Verify 3 items
4. **Historical Booking**: Complete old booking → Verify aircraft NOT updated
5. **Recalculation**: Calculate → Change meters → Recalculate → Verify updates
6. **Aircraft Update**: Complete booking → Verify aircraft.current_hobbs/tach/total_hours updated

## Success Criteria

- ✅ UI is cleaner and more modern than current page
- ✅ All meter readings captured correctly
- ✅ Invoice items generated correctly for solo/dual/trial
- ✅ Landing fees can be added
- ✅ Aircraft meters update reliably on completion
- ✅ Historical bookings don't break aircraft meters
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ Passes all validation rules from requirements doc

---

**Status**: In Progress
**Started**: 2025-01-08
**Target Completion**: 2025-01-08

