# Booking Cancellation System Improvements

## Problem with Original Design

The original booking cancellation system had several design issues:

1. **Poor Normalization**: Both `cancellation_category_id` and `cancellation_reason` were stored directly in the `bookings` table
2. **Redundant Data**: The `cancellation_reason` text field often duplicated information from the category
3. **Limited Audit Trail**: No tracking of who cancelled, when, or additional notes
4. **Inconsistent Design**: The `booking_status` enum included 'cancelled' but cancellation details were stored separately
5. **Limited Flexibility**: Couldn't handle multiple cancellation reasons or detailed tracking

## New Improved Design

### 1. New `booking_cancellations` Table

```sql
CREATE TABLE booking_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    cancelled_by_user_id UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancellation_category_id UUID REFERENCES cancellation_categories(id),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Benefits:**
- Proper normalization - cancellation data is separate from booking data
- Full audit trail - tracks who cancelled and when
- Flexible - supports category, reason, and additional notes
- Cascade deletion - if booking is deleted, cancellation record is also deleted

### 2. Enhanced `cancellation_categories` Table

Added comprehensive cancellation categories:
- Weather (below local solo minima)
- Weather (below dual minima)
- Aircraft Unserviceable
- Instructor Unavailable
- Student Request
- Medical Issue
- Operational Issue
- Airspace Restriction
- Fuel Shortage
- Scheduling Conflict
- Other

### 3. Database Function: `cancel_booking()`

```sql
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_cancellation_category_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
```

**Features:**
- Atomic operation - creates cancellation record and updates booking status
- Validation - prevents cancelling already cancelled or completed bookings
- Audit trail - automatically records who cancelled (using `auth.uid()`)
- Error handling - provides clear error messages

### 4. Database View: `booking_cancellations_view`

Provides a comprehensive view combining:
- Booking details (aircraft, user, instructor, times)
- Cancellation details (category, reason, notes)
- User information (who cancelled, booking user, instructor)
- Proper joins for easy querying

### 5. Row Level Security (RLS)

Implemented proper RLS policies:
- Users can see cancellations for their own bookings
- Instructors can see cancellations for their assigned bookings
- Admins can manage all cancellations

## API Endpoints

### 1. Cancel Booking: `POST /api/bookings/[id]/cancel`

```typescript
{
  cancellation_category_id?: string;
  reason?: string;
  notes?: string;
}
```

**Features:**
- Permission checking (user, instructor, admin)
- Validation of booking status
- Uses the `cancel_booking()` database function
- Returns updated booking with cancellation details

### 2. Get Cancellation Categories: `GET /api/cancellation-categories`

Returns all available cancellation categories for dropdowns/forms.

### 3. Get Booking Cancellations: `GET /api/booking-cancellations`

**Query Parameters:**
- `booking_id` - Filter by specific booking
- `from_date` / `to_date` - Date range filtering
- `category_id` - Filter by cancellation category
- `limit` / `offset` - Pagination

**Features:**
- Permission-based filtering
- Comprehensive filtering options
- Pagination support

## Frontend Implementation

### 1. TypeScript Types

Updated `src/types/bookings.ts` with:

```typescript
export interface BookingCancellation {
  id: string;
  booking_id: string;
  cancelled_by_user_id: string | null;
  cancelled_at: string;
  cancellation_category_id: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Optional joins
  cancellation_category?: CancellationCategory;
  cancelled_by_user?: User;
  booking?: Booking;
}

export interface BookingCancellationView {
  // Comprehensive view with all related data
  cancellation_id: string;
  booking_id: string;
  // ... booking details
  // ... cancellation details
  // ... user details
}
```

### 2. Custom Hooks

#### `useCancellationCategories()`
```typescript
import { useCancellationCategories } from '@/hooks/use-cancellation-categories';

function MyComponent() {
  const { data, isLoading, error } = useCancellationCategories();
  // data.categories contains all cancellation categories
}
```

#### `useCancelBooking()`
```typescript
import { useCancelBooking } from '@/hooks/use-cancel-booking';

function MyComponent() {
  const cancelBooking = useCancelBooking();
  
  const handleCancel = async () => {
    try {
      await cancelBooking.mutateAsync({
        bookingId: 'booking-id',
        data: {
          cancellation_category_id: 'category-id',
          reason: 'High winds',
          notes: 'Wind speed exceeded limits'
        }
      });
    } catch (error) {
      // Handle error
    }
  };
}
```

### 3. Updated CancelBookingModal Component

The `CancelBookingModal` has been completely updated to work with the new system:

**New Features:**
- Zod validation schema for form data
- Support for optional cancellation categories
- Additional notes field
- Better error handling and display
- Loading states and form submission feedback
- Category descriptions displayed when selected
- Proper TypeScript types

**Usage:**
```typescript
import { CancelBookingModal } from '@/components/bookings/CancelBookingModal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: categoriesData } = useCancellationCategories();
  const cancelBooking = useCancelBooking();

  const handleSubmit = async (data) => {
    await cancelBooking.mutateAsync({
      bookingId: 'booking-id',
      data
    });
  };

  return (
    <CancelBookingModal
      open={isOpen}
      onOpenChange={setIsOpen}
      onSubmit={handleSubmit}
      categories={categoriesData?.categories || []}
      loading={cancelBooking.isPending}
      error={cancelBooking.error?.message}
      bookingId="booking-id"
    />
  );
}
```

### 4. CancelBookingWrapper Component

A convenient wrapper component that handles all the complexity:

```typescript
import { CancelBookingWrapper } from '@/components/bookings/CancelBookingWrapper';

function MyComponent() {
  return (
    <CancelBookingWrapper
      bookingId="booking-id"
      bookingTitle="Flight Training Session"
      variant="destructive"
      size="sm"
    />
  );
}
```

**Features:**
- Automatic category fetching
- Error handling and toast notifications
- Loading states
- Customizable button appearance
- Complete integration with the new API

### 5. UI Components

Added new UI components to support the enhanced modal:

#### `Label` Component
```typescript
import { Label } from '@/components/ui/label';

<Label htmlFor="reason">Cancellation Reason *</Label>
```

#### `Alert` Component
```typescript
import { Alert, AlertDescription } from '@/components/ui/alert';

<Alert variant="destructive">
  <AlertDescription>Error message here</AlertDescription>
</Alert>
```

## Migration Summary

1. ✅ Created new `booking_cancellations` table
2. ✅ Migrated existing cancellation data
3. ✅ Removed old cancellation columns from `bookings` table
4. ✅ Enhanced `cancellation_categories` with comprehensive options
5. ✅ Created `cancel_booking()` database function
6. ✅ Created `booking_cancellations_view` for easy querying
7. ✅ Implemented RLS policies
8. ✅ Created API endpoints
9. ✅ Updated TypeScript types
10. ✅ Created custom hooks for data fetching and mutations
11. ✅ Updated CancelBookingModal with new features
12. ✅ Created CancelBookingWrapper for easy integration
13. ✅ Added required UI components (Label, Alert)

## Benefits of New Design

1. **Better Normalization**: Proper separation of concerns
2. **Full Audit Trail**: Track who, when, and why cancellations occurred
3. **Flexibility**: Support for categories, reasons, and additional notes
4. **Security**: Proper RLS policies and permission checking
5. **Performance**: Optimized queries with proper indexing
6. **Maintainability**: Clean, well-structured code and database design
7. **Scalability**: Easy to extend with additional cancellation features
8. **User Experience**: Better form validation, error handling, and feedback
9. **Developer Experience**: Type-safe hooks and components

## Usage Examples

### Basic Usage with Wrapper Component
```typescript
import { CancelBookingWrapper } from '@/components/bookings/CancelBookingWrapper';

function BookingCard({ booking }) {
  return (
    <div>
      <h3>Booking Details</h3>
      <CancelBookingWrapper 
        bookingId={booking.id}
        disabled={booking.status === 'cancelled'}
      />
    </div>
  );
}
```

### Advanced Usage with Custom Modal
```typescript
import { CancelBookingModal } from '@/components/bookings/CancelBookingModal';
import { useCancellationCategories } from '@/hooks/use-cancellation-categories';
import { useCancelBooking } from '@/hooks/use-cancel-booking';

function AdvancedBookingManager({ bookingId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: categoriesData } = useCancellationCategories();
  const cancelBooking = useCancelBooking();

  const handleCancel = async (data) => {
    try {
      await cancelBooking.mutateAsync({ bookingId, data });
      // Custom success handling
      showCustomNotification('Booking cancelled successfully');
    } catch (error) {
      // Custom error handling
      showCustomError(error.message);
    }
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Cancel Booking
      </button>
      
      <CancelBookingModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCancel}
        categories={categoriesData?.categories || []}
        loading={cancelBooking.isPending}
        error={cancelBooking.error?.message}
        bookingId={bookingId}
      />
    </>
  );
}
```

### Fetching Cancellation History
```typescript
import { useQuery } from '@tanstack/react-query';

function CancellationHistory({ bookingId }) {
  const { data: cancellations } = useQuery({
    queryKey: ['booking-cancellations', { booking_id: bookingId }],
    queryFn: async () => {
      const response = await fetch(`/api/booking-cancellations?booking_id=${bookingId}`);
      return response.json();
    }
  });

  return (
    <div>
      {cancellations?.cancellations?.map(cancellation => (
        <div key={cancellation.cancellation_id}>
          <p>Category: {cancellation.cancellation_category}</p>
          <p>Reason: {cancellation.cancellation_reason}</p>
          <p>Cancelled by: {cancellation.cancelled_by_first_name} {cancellation.cancelled_by_last_name}</p>
          <p>Date: {new Date(cancellation.cancelled_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

This new design provides a much more robust, secure, and maintainable booking cancellation system that follows database best practices and provides excellent user experience.
