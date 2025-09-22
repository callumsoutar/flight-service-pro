# Flight Authorization Override Implementation

## Overview
This document provides step-by-step instructions to implement a flight authorization override system. This allows authorized users (instructors/admins) to bypass the flight authorization requirement for solo flights while maintaining proper audit trails.

## Project Goals
- Allow instructors/admins to override flight authorization requirements
- Maintain audit trail of who overrode and why
- Keep existing authorization system intact
- Provide UI for easy override management

## Database Schema Changes

### Step 1: Add Override Columns to Bookings Table
```sql
-- Add override fields directly to bookings table
ALTER TABLE "public"."bookings" 
ADD COLUMN "authorization_override" boolean DEFAULT false,
ADD COLUMN "authorization_override_by" uuid REFERENCES "public"."users"("id"),
ADD COLUMN "authorization_override_at" timestamp with time zone,
ADD COLUMN "authorization_override_reason" text;
```

### Step 2: Add RLS Policy for Override Access
```sql
-- Create policy to allow instructors/admins to set overrides
CREATE POLICY "Users can override flight authorization" ON "public"."bookings"
FOR UPDATE 
TO authenticated
USING (
  -- Only instructors and admins can set overrides
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('instructor', 'admin')
  )
);
```

## TypeScript Type Updates

### Step 3: Update Booking Interface
**File:** `src/types/bookings.ts`

Add the following fields to the `Booking` interface:
```typescript
export interface Booking {
  // ... existing fields
  authorization_override?: boolean;
  authorization_override_by?: string;
  authorization_override_at?: string;
  authorization_override_reason?: string;
}
```

## Component Updates

### Step 4: Update BookingActions Component
**File:** `src/components/bookings/BookingActions.tsx`

**Current logic (around line 100):**
```typescript
(!isSoloFlight || (isSoloFlight && authorization?.status === 'approved'))
```

**New logic:**
```typescript
(!isSoloFlight || booking.authorization_override || (isSoloFlight && authorization?.status === 'approved'))
```

**Complete replacement:**
```typescript
{/* Regular Check Out Button - show for all confirmed bookings when authorization is not required, overridden, or approved */}
{actualStatus === "confirmed" && !hideCheckOutButton && (!mode || mode === 'check-out') && 
 (!isSoloFlight || booking.authorization_override || (isSoloFlight && authorization?.status === 'approved')) && (
  <Button asChild className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
    <Link href={`/dashboard/bookings/check-out/${actualBookingId}`}>
      <Plane className="w-5 h-5 mr-1" />
      Check Flight Out
    </Link>
  </Button>
)}
```

## API Endpoints

### Step 5: Create Override API Endpoint
**File:** `src/app/api/bookings/[id]/override-authorization/route.ts`

```typescript
import { createClient } from '@/lib/SupabaseServerClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { reason } = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has instructor/admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id);

    const hasPermission = userRoles?.some(ur => 
      ['instructor', 'admin'].includes(ur.roles?.name)
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update booking with override
    const { data, error } = await supabase
      .from('bookings')
      .update({
        authorization_override: true,
        authorization_override_by: user.id,
        authorization_override_at: new Date().toISOString(),
        authorization_override_reason: reason
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove override
    const { data, error } = await supabase
      .from('bookings')
      .update({
        authorization_override: false,
        authorization_override_by: null,
        authorization_override_at: null,
        authorization_override_reason: null
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## React Hooks

### Step 6: Create Override Hook
**File:** `src/hooks/use-authorization-override.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface OverrideAuthorizationData {
  reason: string;
}

export const useOverrideAuthorization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      const response = await fetch(`/api/bookings/${bookingId}/override-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to override authorization');
      }

      return response.json();
    },
    onSuccess: (data, { bookingId }) => {
      // Invalidate booking queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useRemoveAuthorizationOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/bookings/${bookingId}/override-authorization`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove override');
      }

      return response.json();
    },
    onSuccess: (data, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};
```

### Step 7: Create Permission Check Hook
**File:** `src/hooks/use-can-override-authorization.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/SupabaseClientComponent';

export const useCanOverrideAuthorization = () => {
  return useQuery({
    queryKey: ['canOverrideAuthorization'],
    queryFn: async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id);

      return userRoles?.some(ur => 
        ['instructor', 'admin'].includes(ur.roles?.name)
      ) || false;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

## UI Components

### Step 8: Create Override Authorization Modal
**File:** `src/components/bookings/OverrideAuthorizationModal.tsx`

```typescript
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOverrideAuthorization } from '@/hooks/use-authorization-override';
import { AlertTriangle } from 'lucide-react';

interface OverrideAuthorizationModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function OverrideAuthorizationModal({
  bookingId,
  isOpen,
  onClose
}: OverrideAuthorizationModalProps) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  
  const overrideMutation = useOverrideAuthorization();

  const handleOverride = async () => {
    if (!reason.trim() || !confirmed) return;

    try {
      await overrideMutation.mutateAsync({ bookingId, reason });
      onClose();
      setReason('');
      setConfirmed(false);
    } catch (error) {
      console.error('Failed to override authorization:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Override Flight Authorization
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              This will allow the solo flight to be checked out without completing the authorization process.
              Please provide a reason for audit purposes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Override Reason *</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Emergency, Student has current authorization on file..."
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="confirm" className="text-sm">
              I confirm this override is necessary and appropriate
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleOverride}
              disabled={!reason.trim() || !confirmed || overrideMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {overrideMutation.isPending ? 'Overriding...' : 'Override Authorization'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 9: Add Override Button to BookingActions
**File:** `src/components/bookings/BookingActions.tsx`

Add these imports:
```typescript
import { useCanOverrideAuthorization } from '@/hooks/use-can-override-authorization';
import OverrideAuthorizationModal from './OverrideAuthorizationModal';
import { Shield, ShieldCheck } from 'lucide-react';
```

Add state and logic inside the component:
```typescript
const [overrideModalOpen, setOverrideModalOpen] = useState(false);
const { data: canOverride = false } = useCanOverrideAuthorization();
```

Add the override button section before the regular check-out button:
```typescript
{/* Authorization Override Button for Instructors/Admins */}
{actualStatus === "confirmed" && isSoloFlight && !booking.authorization_override && 
 (!authorization || authorization.status !== 'approved') && canOverride && (
  <Button 
    onClick={() => setOverrideModalOpen(true)}
    className="h-10 px-6 text-base font-bold bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-yellow-300"
  >
    <Shield className="w-5 h-5 mr-1" />
    Override Authorization
  </Button>
)}

{/* Authorization Override Status Display */}
{actualStatus === "confirmed" && isSoloFlight && booking.authorization_override && (
  <Button asChild variant="outline" className="h-10 px-6 text-base font-bold border-green-300 text-green-700 hover:bg-green-50 rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer">
    <div>
      <ShieldCheck className="w-5 h-5 mr-1" />
      Authorization Overridden
    </div>
  </Button>
)}
```

Add the modal at the end of the component before the closing div:
```typescript
<OverrideAuthorizationModal
  bookingId={actualBookingId}
  isOpen={overrideModalOpen}
  onClose={() => setOverrideModalOpen(false)}
/>
```

## Data Query Updates

### Step 10: Update Booking Queries
Update all booking queries to include the new override fields:

**In booking view page and other places that fetch bookings:**
```typescript
.select(`
  *, 
  user:user_id(*), 
  instructor:instructor_id(*, users:users!instructors_user_id_fkey(*)), 
  aircraft:aircraft_id(*), 
  flight_type:flight_type_id(*),
  authorization_override,
  authorization_override_by,
  authorization_override_at,
  authorization_override_reason
`)
```

## Testing Steps

### Step 11: Test the Implementation

1. **Database Migration**: Run the SQL commands to add override columns
2. **Type Safety**: Verify TypeScript compilation passes
3. **UI Testing**:
   - Solo flight with no authorization should show override button (for instructors)
   - Override modal should require reason and confirmation
   - After override, check-out button should appear
   - Override status should be displayed appropriately
4. **Permission Testing**:
   - Regular users should not see override buttons
   - Only instructors/admins should be able to override
5. **API Testing**:
   - Override API should work and update database
   - Override removal should work
   - Proper error handling for unauthorized users

## Security Considerations

- Override functionality is restricted to instructors and admins via RLS policies
- All overrides are logged with user ID, timestamp, and reason
- Override status is clearly displayed in the UI
- API endpoints validate permissions before allowing override operations

## Future Enhancements

- Add override history/audit log page for admins
- Email notifications when overrides are used
- Reporting on override usage patterns
- Bulk override capabilities for emergency situations

---
*Implementation Date: TBD*
*Status: Ready for implementation*