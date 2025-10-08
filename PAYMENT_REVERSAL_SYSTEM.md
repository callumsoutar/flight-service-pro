# Payment Reversal System Documentation

## Overview

The Payment Reversal System implements a **non-destructive, audit-compliant** approach to correcting payment errors in your flight school management system. Following accounting best practices, this system ensures that:

- ✅ **Original payment records are NEVER modified** (immutable for audit trail)
- ✅ **All corrections are made via reversal entries** (like accounting adjustments)
- ✅ **Complete audit trail is preserved** (who, what, when, why)
- ✅ **All operations are atomic** (database consistency guaranteed)
- ✅ **Account balances remain accurate** (automatic recalculation)

## Problem It Solves

### Scenario
An administrator accidentally records a payment of **$500** instead of **$50**.

### ❌ Wrong Approach (Editing Original Payment)
- Violates audit trail integrity
- Can corrupt account balances
- No record of the mistake
- Regulatory compliance issues
- Race conditions in multi-user environment

### ✅ Correct Approach (Reversal System)
1. **Original Payment: $500** (REMAINS UNCHANGED)
2. **Reversal Entry: -$500** (NEW - offsets original)
3. **Correct Payment: $50** (NEW - correct amount)

**Net Effect:** -$450 adjustment to account balance with full audit trail.

---

## Architecture

### Database Schema

#### Payments Table Enhancement
```sql
-- Added metadata column for tracking reversals
ALTER TABLE payments
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Index for efficient metadata queries
CREATE INDEX idx_payments_metadata ON payments USING gin (metadata);
```

#### Metadata Structure
```typescript
{
  // For reversed payments
  reversed_by_payment_id: "uuid",
  reversed_at: "timestamp",
  reversed_by_user_id: "uuid",
  reversal_reason: "string",
  
  // For reversal entries
  reverses_payment_id: "uuid",
  reversal_reason: "string",
  reversal_type: "payment_reversal",
  
  // For correcting payments
  corrects_payment_id: "uuid",
  correction_reason: "string",
  original_amount: number
}
```

---

## Database Functions

### 1. `reverse_payment_atomic()`

**Purpose:** Reverses a payment by creating a reversal transaction.

**Parameters:**
- `p_payment_id` (UUID) - Payment to reverse
- `p_reason` (TEXT) - Reason for reversal
- `p_admin_user_id` (UUID) - Admin performing the reversal

**Process:**
1. Validates payment exists and hasn't been reversed already
2. Creates reversal transaction (DEBIT to offset original CREDIT)
3. Creates reversal payment record (negative amount)
4. Updates original payment metadata to mark as reversed
5. Updates user account balance
6. Updates invoice totals and status (if applicable)

**Returns:** JSONB with success status and details

**Example:**
```sql
SELECT reverse_payment_atomic(
  'payment-uuid',
  'Incorrect amount entered',
  'admin-user-uuid'
);
```

**Response:**
```json
{
  "success": true,
  "reversal_payment_id": "new-uuid",
  "reversal_transaction_id": "transaction-uuid",
  "original_payment_id": "payment-uuid",
  "reversed_amount": 500.00,
  "invoice_id": "invoice-uuid",
  "new_total_paid": 0.00,
  "new_balance_due": 1000.00,
  "new_status": "pending",
  "message": "Payment reversed successfully..."
}
```

---

### 2. `reverse_and_replace_payment_atomic()`

**Purpose:** Reverses a payment AND creates the correct payment in one atomic operation (preferred method).

**Parameters:**
- `p_original_payment_id` (UUID) - Payment to reverse
- `p_correct_amount` (NUMERIC) - Correct payment amount
- `p_reason` (TEXT) - Reason for correction
- `p_admin_user_id` (UUID) - Admin performing the correction
- `p_notes` (TEXT, optional) - Additional notes

**Process:**
1. Validates correct amount is positive
2. Calls `reverse_payment_atomic()` to reverse original
3. Creates correct payment transaction (CREDIT)
4. Creates correct payment record
5. Links all records via metadata
6. Updates user account balance
7. Updates invoice totals and status

**Returns:** JSONB with complete details of both operations

**Example:**
```sql
SELECT reverse_and_replace_payment_atomic(
  'payment-uuid',
  50.00,
  'Incorrect amount - should be $50 not $500',
  'admin-user-uuid',
  'Customer confirmed correct amount'
);
```

**Response:**
```json
{
  "success": true,
  "reversal_payment_id": "reversal-uuid",
  "reversal_transaction_id": "reversal-trans-uuid",
  "correct_payment_id": "correct-payment-uuid",
  "correct_transaction_id": "correct-trans-uuid",
  "original_payment_id": "payment-uuid",
  "original_amount": 500.00,
  "correct_amount": 50.00,
  "amount_difference": -450.00,
  "invoice_id": "invoice-uuid",
  "new_total_paid": 50.00,
  "new_balance_due": 950.00,
  "new_status": "pending",
  "message": "Payment corrected successfully..."
}
```

---

## API Endpoints

### POST `/api/payments/[id]/reverse`

**Purpose:** Reverse a payment (with optional correction in one step)

**Authentication:** Required (Admin/Owner role)

**Request Body:**
```typescript
{
  reason: string;           // Required: Reason for reversal
  correct_amount?: number;  // Optional: If provided, creates correcting payment
  notes?: string;           // Optional: Additional notes
}
```

**Response:**
```typescript
{
  success: boolean;
  reversal_payment_id: string;
  reversal_transaction_id: string;
  original_payment_id: string;
  reversed_amount: number;
  invoice_id?: string;
  user_id: string;
  new_total_paid?: number;
  new_balance_due?: number;
  new_status?: string;
  message: string;
  // If correct_amount was provided:
  correct_payment_id?: string;
  correct_transaction_id?: string;
  correct_amount?: number;
  amount_difference?: number;
  reversed_by?: string;
}
```

**Example - Reverse Only:**
```bash
POST /api/payments/abc123/reverse
Content-Type: application/json

{
  "reason": "Duplicate payment entered by mistake"
}
```

**Example - Reverse and Correct:**
```bash
POST /api/payments/abc123/reverse
Content-Type: application/json

{
  "reason": "Incorrect amount - should be $50 not $500",
  "correct_amount": 50.00,
  "notes": "Customer confirmed via phone"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin/owner role
- `404 Not Found` - Payment doesn't exist
- `400 Bad Request` - Payment already reversed or invalid data
- `500 Internal Server Error` - Database error

---

## UI Components

### 1. ReversePaymentModal

**Location:** `src/components/payments/ReversePaymentModal.tsx`

**Features:**
- Clean, intuitive form for reversing payments
- Payment details display for verification
- Reason input (required)
- Optional correcting payment with amount input
- Net adjustment calculation
- Clear warning about what will happen
- Loading states and error handling
- Toast notification on success

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  onSuccess: () => void;
}
```

**Usage:**
```tsx
<ReversePaymentModal
  open={reverseModalOpen}
  onOpenChange={setReverseModalOpen}
  payment={selectedPayment}
  onSuccess={handleReverseSuccess}
/>
```

---

### 2. PaymentHistory (Enhanced)

**Location:** `src/components/invoices/PaymentHistory.tsx`

**Features:**
- Displays all payments with visual indicators
- **Badges** for payment types:
  - 🔄 **Reversal** (red) - Negative amount entries
  - ✅ **Correction** (blue) - Correcting payments
  - ⚠️ **Reversed** (orange) - Original payment that was reversed
- **Color-coded amounts:**
  - Green: Normal payments
  - Red: Reversal entries (negative)
  - Blue: Correction payments
- **Contextual information:**
  - Reversal reasons displayed inline
  - Original amounts shown for corrections
  - Visual styling (opacity, background colors)
- **Reverse button** for each payment (Admin/Owner only)
- **Automatic refresh** after reversal

**Props:**
```typescript
{
  invoiceId: string;
  userRole?: string; // For permission checks
}
```

---

## Payment Display Examples

### Normal Payment Flow
```
Payment #1: $50.00 (Cash) - Jan 1, 2025
└─ [Normal payment, no badges]
```

### Reversed Payment Flow
```
Payment #1: $500.00 (Cash) - Jan 1, 2025 ⚠️ Reversed
└─ ℹ️ Reversed: Incorrect amount entered
└─ [Grayed out, opacity 60%]

Payment #2: -$500.00 (Cash) - Jan 2, 2025 🔄 Reversal
└─ ℹ️ Reason: Incorrect amount entered
└─ [Red background tint]
```

### Corrected Payment Flow
```
Payment #1: $500.00 (Cash) - Jan 1, 2025 ⚠️ Reversed
└─ ℹ️ Reversed: Incorrect amount - should be $50 not $500

Payment #2: -$500.00 (Cash) - Jan 2, 2025 🔄 Reversal
└─ ℹ️ Reason: Incorrect amount - should be $50 not $500

Payment #3: $50.00 (Cash) - Jan 2, 2025 ✅ Correction
└─ ℹ️ Corrects previous payment: Incorrect amount - should be $50 not $500
└─ Original: $500.00
└─ [Blue background tint]
```

---

## User Workflow

### Scenario: Correcting an Incorrect Payment Amount

1. **Navigate to Invoice**
   - Go to Invoices → View Invoice
   - Scroll to "Payment History" section

2. **Identify Incorrect Payment**
   - Review payment list
   - Locate the payment with incorrect amount

3. **Click "Reverse" Button**
   - Button appears next to each payment (Admin/Owner only)
   - Opens ReversePaymentModal

4. **Fill Reversal Form**
   - **Reason:** "Incorrect amount entered - should be $50 not $500"
   - **Toggle:** "Create Correcting Payment" → ON
   - **Correct Amount:** 50.00
   - **Notes (optional):** "Verified with customer via phone"

5. **Review Warning**
   - Modal shows exactly what will happen
   - Net adjustment: -$450.00

6. **Confirm Reversal**
   - Click "Reverse Payment" button
   - System processes atomically

7. **Success**
   - Toast notification appears
   - Payment history refreshes automatically
   - Invoice totals update
   - Three entries now visible:
     - Original ($500) marked as "Reversed"
     - Reversal (-$500) marked as "Reversal"
     - Correction ($50) marked as "Correction"

---

## Security & Authorization

### Role Requirements
- **Reverse Payments:** Admin or Owner only
- **View Payment History:** Instructor and above

### Implementation
```typescript
// In API route
const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
  user_id: user.id
});

if (!userRole || !['admin', 'owner'].includes(userRole)) {
  return NextResponse.json({ 
    error: 'Forbidden: Payment reversal requires admin or owner role' 
  }, { status: 403 });
}
```

```typescript
// In UI component
const canReversePayments = userRole === 'admin' || userRole === 'owner';

{canReversePayments && !isReversed && !isReversal && (
  <Button onClick={() => handleReverseClick(p)}>
    Reverse
  </Button>
)}
```

---

## Audit Trail

### What Gets Recorded

1. **Original Payment Record** (unchanged):
   - All original fields preserved
   - Metadata updated with reversal info:
     - `reversed_by_payment_id`
     - `reversed_at`
     - `reversed_by_user_id`
     - `reversal_reason`

2. **Reversal Entry** (new):
   - Negative amount
   - Links to original via `reverses_payment_id`
   - Records `reversal_reason`
   - Records `reversed_by_user_id`

3. **Correcting Payment** (new, if applicable):
   - Positive amount (correct value)
   - Links to original via `corrects_payment_id`
   - Records `correction_reason`
   - Records `corrected_by_user_id`
   - Stores `original_amount` for reference

4. **Transaction Records:**
   - Original transaction (CREDIT) - unchanged
   - Reversal transaction (DEBIT) - new
   - Correction transaction (CREDIT) - new (if applicable)

### Querying Audit Trail

**Find all reversed payments:**
```sql
SELECT * FROM payments 
WHERE metadata ? 'reversed_by_payment_id';
```

**Find all reversal entries:**
```sql
SELECT * FROM payments 
WHERE metadata ? 'reverses_payment_id';
```

**Find who reversed payments:**
```sql
SELECT 
  p.*,
  u.email as reversed_by_email
FROM payments p
JOIN users u ON (p.metadata->>'reversed_by_user_id')::uuid = u.id
WHERE p.metadata ? 'reversed_by_payment_id';
```

**View for payment history with reversals:**
```sql
SELECT * FROM payment_history_with_reversals
WHERE invoice_id = 'your-invoice-id'
ORDER BY created_at DESC;
```

---

## Testing Checklist

### ✅ Database Functions
- [x] `reverse_payment_atomic()` successfully reverses payment
- [x] Cannot reverse same payment twice
- [x] Updates invoice balances correctly
- [x] Updates user account balance correctly
- [x] Creates proper audit trail

### ✅ Database Functions (continued)
- [x] `reverse_and_replace_payment_atomic()` reverses and creates correct payment
- [x] Validates correct amount is positive
- [x] Links all records properly via metadata
- [x] Calculates amount difference correctly

### ✅ API Endpoints
- [x] Requires authentication
- [x] Enforces Admin/Owner authorization
- [x] Validates request body
- [x] Returns proper error messages
- [x] Returns success with complete details

### ✅ UI Components
- [x] ReversePaymentModal displays correctly
- [x] Form validation works (required fields)
- [x] Toggle for correcting payment works
- [x] Net adjustment calculation displays
- [x] Loading states display during submission
- [x] Error messages display for failures
- [x] Success toast appears on completion

### ✅ PaymentHistory Component
- [x] Displays all payment types with badges
- [x] Shows reversal reasons inline
- [x] Applies proper styling (colors, opacity)
- [x] Reverse button only for Admin/Owner
- [x] Reverse button hidden for reversed/reversal entries
- [x] Refreshes after reversal

### 🔄 Manual Testing Scenarios

**Scenario 1: Simple Reversal**
1. Create invoice with payment
2. Reverse the payment (no correction)
3. Verify:
   - Original payment marked as "Reversed"
   - Reversal entry appears with negative amount
   - Invoice balance updated
   - User account balance updated

**Scenario 2: Reverse and Correct**
1. Create invoice with incorrect payment ($500)
2. Reverse and correct to $50
3. Verify:
   - Original payment marked as "Reversed"
   - Reversal entry appears (-$500)
   - Correction payment appears ($50)
   - Net adjustment is -$450
   - Invoice balance shows $50 paid
   - User account balance adjusted by -$450

**Scenario 3: Authorization**
1. Login as Instructor
2. Navigate to payment history
3. Verify "Reverse" buttons do not appear
4. Attempt direct API call (should fail with 403)

**Scenario 4: Duplicate Reversal Prevention**
1. Reverse a payment successfully
2. Attempt to reverse the same payment again
3. Verify error: "Payment has already been reversed"

---

## Best Practices

### DO ✅
- Always provide a clear, descriptive reason for reversals
- Use "Reverse and Correct" when you know the correct amount
- Review the warning message before confirming
- Verify invoice totals after reversal
- Keep notes for audit purposes

### DON'T ❌
- Never attempt to edit payment records directly in the database
- Don't reverse payments without a valid reason
- Don't bypass the API endpoints
- Don't reverse payments if you're unsure - consult first

---

## Troubleshooting

### "Payment has already been reversed"
**Cause:** Attempting to reverse a payment that was already reversed.
**Solution:** Check the payment history to see the existing reversal entry.

### "Payment not found"
**Cause:** Invalid payment ID or payment was deleted.
**Solution:** Verify the payment ID exists in the database.

### "Forbidden: Payment reversal requires admin or owner role"
**Cause:** User doesn't have sufficient permissions.
**Solution:** Login as Admin or Owner, or request permission elevation.

### Invoice balance not updating
**Cause:** Page cache or stale data.
**Solution:** The page refreshes automatically after reversal. If still incorrect, hard refresh (Cmd+Shift+R).

### Negative balance after reversal
**Cause:** User had account credits that offset the reversal.
**Solution:** This is expected behavior - the user's account balance reflects the reversal.

---

## Database Migration

The payment reversal system is implemented via migration:

**File:** `supabase/migrations/20250108120000_create_payment_reversal_system.sql`

### What It Creates
- Adds `metadata` JSONB column to `payments` table
- Creates GIN index on metadata for efficient queries
- Creates `reverse_payment_atomic()` function
- Creates `reverse_and_replace_payment_atomic()` function
- Creates `payment_history_with_reversals` view
- Grants execute permissions to authenticated users

### Rollback (if needed)
```sql
-- Remove functions
DROP FUNCTION IF EXISTS reverse_payment_atomic;
DROP FUNCTION IF EXISTS reverse_and_replace_payment_atomic;

-- Remove view
DROP VIEW IF EXISTS payment_history_with_reversals;

-- Remove metadata column (WARNING: This will delete all metadata)
ALTER TABLE payments DROP COLUMN IF EXISTS metadata;
```

---

## Future Enhancements

### Possible Improvements
1. **Email notifications** when payments are reversed
2. **Bulk reversal** for multiple payments
3. **Reversal templates** for common reasons
4. **Advanced filtering** in payment history (show/hide reversals)
5. **Export functionality** for audit reports
6. **Approval workflow** for reversals above certain amounts
7. **Reversal limits** (e.g., can't reverse payments older than 90 days)

---

## Support

For questions or issues with the payment reversal system:
1. Check this documentation
2. Review the troubleshooting section
3. Check the audit trail in the database
4. Contact the development team

---

## Summary

The Payment Reversal System provides a **secure, audit-compliant, and user-friendly** way to correct payment errors without compromising data integrity. By following accounting best practices and implementing atomic operations, it ensures that:

- ✅ All payment corrections are fully traceable
- ✅ Original records are preserved for compliance
- ✅ Account balances remain accurate
- ✅ Users have a simple, clear interface for corrections
- ✅ Administrators have full visibility into payment history

**Key Principle:** Never edit, always add. Corrections are new entries, not modifications.

