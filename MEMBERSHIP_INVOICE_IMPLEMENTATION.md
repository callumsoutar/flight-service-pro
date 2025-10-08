# Membership Invoice Integration - Implementation Summary

## Overview

Successfully implemented automatic invoice creation for memberships with payment status derived from invoice status (single source of truth).

---

## What Was Implemented

### 1. Invoice Creation Utility ✅

**File:** [src/lib/membership-invoice-utils.ts](src/lib/membership-invoice-utils.ts)

- `createMembershipInvoice()` - Creates invoices for new/renewed memberships
- `getOrCreateMembershipChargeable()` - Manages chargeables for membership types
- Handles tax calculation, due dates, and invoice items automatically
- Graceful error handling

**Features:**
- Finds or creates chargeable based on membership type code
- Updates chargeable rate if membership price changes
- Creates invoice with status "pending"
- Links invoice to membership via `invoice_id`
- Calculates tax using organization tax rate
- Sets due date (earlier of membership expiry or 30 days)

### 2. API Integration ✅

**File:** [src/app/api/memberships/route.ts](src/app/api/memberships/route.ts)

**Changes:**
- Added `createMembershipInvoice` import (line 8)
- Removed `fee_paid: false` from membership creation (lines 202, 290)
- Added invoice creation logic for renewals (lines 212-238)
- Added invoice creation logic for new memberships (lines 295-321)
- Updated `calculateMembershipStatus()` to use invoice status (lines 30-54)
- Added invoice join to membership query (lines 81-83)
- Updated status calculation to use joined invoice data (lines 97-103)

**Behavior:**
- When `create_invoice: true` and `price > 0`:
  - Creates invoice automatically
  - Links invoice to membership
  - Does NOT fail membership creation if invoice fails
- Payment status now derived from `invoices.status` instead of `fee_paid`

### 3. Type Updates ✅

**File:** [src/types/memberships.ts](src/types/memberships.ts)

**Changes:**
- Made `fee_paid` optional with deprecation notice (line 35)
- Added `invoices` joined data type (lines 38-42)
- Supports both old and new approaches during migration

### 4. Frontend Updates ✅

**File:** [src/components/members/tabs/MemberMembershipsTab.tsx](src/components/members/tabs/MemberMembershipsTab.tsx)

**Changes:**
- Updated payment badge to use `invoices.status` instead of `fee_paid` (lines 312-314)
- Added functional "View Invoice" button (lines 240-248)
- Opens invoice in new tab when clicked
- Only shows button if invoice exists

---

## Data Flow

### Creating/Renewing Membership with Invoice

```
1. User clicks "Create Invoice" toggle
   ↓
2. Membership API creates membership record
   ↓
3. createMembershipInvoice() is called:
   - Finds/creates chargeable for membership type
   - Creates invoice with status "pending"
   - Adds line item for membership fee
   - Calculates tax automatically
   ↓
4. Invoice ID linked to membership.invoice_id
   ↓
5. User can view invoice and pay
   ↓
6. When invoice.status = "paid" → membership shows as paid
```

### Payment Status Check

```
OLD WAY (deprecated):
membership.fee_paid === true → "Paid"

NEW WAY (current):
membership.invoices.status === 'paid' → "Paid"
```

---

## Migration Path

### Current State (Backward Compatible)
- ✅ Code checks `invoices.status` for payment
- ✅ `fee_paid` column still exists in database
- ✅ Old memberships without invoices still work
- ✅ Type system supports both fields

### After Testing (Final Step)
Run migration to drop deprecated columns:

```bash
# Test thoroughly first!
supabase db push supabase/migrations/DROP_FEE_PAID_COLUMN.sql
```

This will:
- Drop `fee_paid` column from memberships
- Drop `amount_paid` column (also redundant)
- Add documentation to `invoice_id` column

---

## Key Benefits

1. **Single Source of Truth**: Invoice status is the only payment indicator
2. **Automatic Sync**: No need for triggers or manual updates
3. **Clean Architecture**: Payment logic lives with invoices
4. **Invoice Integration**: Full visibility into membership payments
5. **Audit Trail**: Invoice history tracks all membership payments
6. **Reusable Chargeables**: One chargeable per membership type

---

## Testing Checklist

### Before Dropping fee_paid Column:

- [ ] Create new membership with invoice
  - ✅ Membership created
  - ✅ Invoice created with status "pending"
  - ✅ Invoice linked to membership
  - ✅ Shows as "Unpaid" in UI

- [ ] Renew membership with invoice
  - ✅ New membership created
  - ✅ Old membership deactivated
  - ✅ Invoice created
  - ✅ Shows as "Unpaid" in UI

- [ ] Pay invoice through invoice system
  - ✅ Invoice status changes to "paid"
  - ✅ Membership shows as "Paid" immediately
  - ✅ No manual updates needed

- [ ] View Invoice button
  - ✅ Only shows when invoice exists
  - ✅ Opens invoice page in new tab
  - ✅ Invoice displays correctly

- [ ] Free memberships (price = 0)
  - ✅ No invoice created
  - ✅ Membership still works
  - ✅ Status calculated correctly

- [ ] Edge cases
  - ✅ Invoice creation failure doesn't block membership
  - ✅ Old memberships without invoices still display
  - ✅ Multiple renewals create multiple invoices

---

## Files Modified

### Created:
1. `src/lib/membership-invoice-utils.ts` - Invoice creation logic
2. `supabase/migrations/DROP_FEE_PAID_COLUMN.sql` - Migration to drop deprecated column

### Modified:
1. `src/app/api/memberships/route.ts` - Invoice integration
2. `src/types/memberships.ts` - Type updates
3. `src/components/members/tabs/MemberMembershipsTab.tsx` - UI updates
4. `src/components/members/CreateMembershipModal.tsx` - Already had create_invoice toggle
5. `src/components/members/RenewMembershipModal.tsx` - Already had create_invoice toggle

---

## Database Schema Changes

### Current (Transition):
```sql
memberships:
  - invoice_id (uuid, nullable, FK to invoices)
  - fee_paid (boolean, DEPRECATED)
  - amount_paid (numeric, DEPRECATED)
```

### After Migration:
```sql
memberships:
  - invoice_id (uuid, nullable, FK to invoices)
  -- fee_paid DROPPED
  -- amount_paid DROPPED
```

---

## Example Queries

### Get membership with payment status:
```typescript
const { data } = await supabase
  .from('memberships')
  .select(`
    *,
    membership_types(*),
    invoices(id, status, invoice_number)
  `)
  .eq('user_id', userId);

// Check payment
const isPaid = data.invoices?.status === 'paid';
```

### Get unpaid memberships:
```typescript
const { data } = await supabase
  .from('memberships')
  .select(`*, invoices(status)`)
  .eq('is_active', true)
  .neq('invoices.status', 'paid');
```

---

## API Endpoints

### Create Membership with Invoice
```bash
POST /api/memberships
{
  "user_id": "uuid",
  "membership_type_id": "uuid",
  "create_invoice": true  # Creates invoice automatically
}
```

### Renew Membership with Invoice
```bash
POST /api/memberships
{
  "action": "renew",
  "membership_id": "uuid",
  "create_invoice": true  # Creates invoice automatically
}
```

---

## Next Steps

1. **Test thoroughly** with real data
2. **Verify** invoice creation works for all membership types
3. **Check** that payment status updates correctly
4. **Ensure** old memberships still display correctly
5. **Run migration** to drop `fee_paid` column when ready

---

## Support

If issues arise:
1. Check console logs for invoice creation errors
2. Verify chargeable_types table has "membership_fee" type
3. Ensure invoice API is accessible
4. Check that membership type has valid code and price
