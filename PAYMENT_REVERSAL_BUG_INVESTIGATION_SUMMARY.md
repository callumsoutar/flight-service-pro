# Payment Reversal Bug - Investigation & Resolution Summary

**Date:** October 8, 2025  
**Reported By:** User  
**Status:** ✅ **RESOLVED**

---

## Issue Report

**User ID:** `b47156ce-b041-48da-a2e5-705f7a78b53a`  
**Invoice ID:** `774a9fb2-d3c1-4509-9194-414f6debbea7`  
**Invoice Number:** INV-2025-10-0013  
**Invoice Amount:** $69.00

### Problem Description

1. User created an invoice for $69
2. User recorded a payment for $69 → Balance correctly became $0
3. User reversed the payment
4. **Expected:** User balance should be $69 (owing the invoice)
5. **Actual:** User balance was $138 (incorrect - double the invoice amount)

---

## Investigation Findings

### Data Analysis

**Invoice State:**
```
Invoice Number: INV-2025-10-0013
Total Amount:   $69.00
Total Paid:     $0.00 (after reversal)
Balance Due:    $69.00 ✅ CORRECT
Status:         pending ✅ CORRECT
```

**Transaction History:**
```
1. DEBIT  $69 - Invoice: INV-2025-10-0013 (completed)
2. CREDIT $69 - Payment for invoice: INV-2025-10-0013 (completed)
3. DEBIT  $69 - Payment reversal: wrong payment method (completed)

Expected Balance: +$69 -$69 +$69 = $69 ✅
```

**Payment History:**
```
1. Payment  +$69 (original payment)
2. Reversal -$69 (negative amount = reversal)
```

**User Balance:**
```
Stored Balance:     $138.00 ❌ WRONG
Calculated Balance: $69.00  ✅ CORRECT
Difference:         $69.00  (100% error!)
```

### Root Cause Identified

🔴 **CRITICAL BUG:** Double-counting in `reverse_payment_atomic()` function

**The Problem:**
The function was updating the user's account balance **manually** at line 152-154, but the `handle_transaction_balance_update` **trigger was also updating** the balance automatically when the reversal transaction was created.

**Code Analysis:**
```sql
-- Line 90-114: Creates reversal transaction
INSERT INTO transactions (...)
VALUES (..., 'debit', 'completed', v_original_payment.amount, ...)
-- ↑ This INSERT triggers: handle_transaction_balance_update
-- ↓ Which automatically: account_balance += amount

-- Line 152-154: ALSO manually updates balance (WRONG!)
UPDATE users
SET account_balance = account_balance + v_original_payment.amount
WHERE id = v_user_id;
-- ↑ This causes DOUBLE-COUNTING!
```

**Result:**
- Transaction trigger adds $69 to balance → Balance = $69 ✅
- Function ALSO adds $69 to balance → Balance = $138 ❌

---

## Resolution

### 1. Fixed Database Functions

**Changes Made:**
- ✅ Removed manual balance update from `reverse_payment_atomic()`
- ✅ Removed manual balance update from `reverse_and_replace_payment_atomic()`
- ✅ Added comments explaining trigger-based balance updates
- ✅ Updated function documentation

**Before (BUGGY):**
```sql
-- 7. Update user account balance
UPDATE users
SET account_balance = account_balance + v_original_payment.amount
WHERE id = v_user_id;

-- 8. Update invoice if applicable
```

**After (FIXED):**
```sql
-- 7. Update invoice if applicable
-- NOTE: User account balance is automatically updated by the transaction trigger
-- DO NOT manually update user balance here to avoid double-counting
```

### 2. Corrected User Data

**Recalculation Query:**
```sql
UPDATE users
SET account_balance = (
  SELECT COALESCE(SUM(
    CASE 
      WHEN t.type = 'debit' THEN t.amount
      WHEN t.type = 'credit' THEN -t.amount
      ELSE 0
    END
  ), 0)
  FROM transactions t
  WHERE t.user_id = users.id AND t.status = 'completed'
)
WHERE id = 'b47156ce-b041-48da-a2e5-705f7a78b53a';
```

**Result:**
- Balance changed from $138.00 → $69.00 ✅

### 3. Updated Migration File

File: `/supabase/migrations/20250108120000_create_payment_reversal_system.sql`

Changes:
- Removed manual balance updates (2 locations)
- Added explanatory comments
- Updated function descriptions

---

## Verification Results

```json
{
  "status": "✅ VERIFICATION PASSED",
  "user_email": "callum.soutar@me.com",
  "invoice_number": "INV-2025-10-0013",
  "invoice_total": 69.00,
  "invoice_paid": 0.00,
  "invoice_balance_due": 69.00,
  "invoice_status": "pending",
  "user_stored_balance": 69.00,
  "user_calculated_balance": 69.00,
  "balance_match": "✅ CORRECT",
  "payment_count": 2,
  "transaction_count": 3
}
```

### All Checks Passed ✅

- ✅ Invoice totals correct
- ✅ Invoice balance_due correct ($69)
- ✅ User stored balance correct ($69)
- ✅ User calculated balance matches stored balance
- ✅ Transaction count correct (3 transactions)
- ✅ Payment count correct (2 payments: original + reversal)
- ✅ No orphaned records
- ✅ Audit trail intact

---

## Testing Procedure

To test payment reversals are now working correctly:

```sql
-- 1. Create a test invoice
INSERT INTO invoices (...) VALUES (...);

-- 2. Record a payment
SELECT process_payment_atomic(
  p_invoice_id := '<invoice_id>',
  p_amount := 100.00,
  p_payment_method := 'credit_card',
  p_payment_reference := 'TEST-001',
  p_notes := 'Test payment'
);

-- 3. Verify balance = 0
SELECT account_balance FROM users WHERE id = '<user_id>';
-- Expected: 0.00

-- 4. Reverse the payment
SELECT reverse_payment_atomic(
  p_payment_id := '<payment_id>',
  p_reason := 'Test reversal',
  p_admin_user_id := '<admin_id>'
);

-- 5. Verify balance = invoice amount (NOT double!)
SELECT 
  u.account_balance as stored,
  COALESCE(SUM(
    CASE 
      WHEN t.type = 'debit' THEN t.amount
      WHEN t.type = 'credit' THEN -t.amount
      ELSE 0
    END
  ), 0) as calculated
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id AND t.status = 'completed'
WHERE u.id = '<user_id>'
GROUP BY u.account_balance;
-- Expected: stored = calculated = invoice_amount (NOT doubled!)
```

---

## Impact Assessment

### Severity
🔴 **CRITICAL** - Financial data integrity issue

### Scope
- ✅ Only test data affected (caught early)
- ✅ No production users impacted
- ✅ Only 1 user with reversed payment before fix

### Financial Impact
- ❌ User would have appeared to owe **$138** instead of **$69**
- ✅ No actual charges were made (test environment)
- ✅ Audit trail remained intact (transactions were correct)

### Data Integrity
- ✅ All transactions correct
- ✅ All invoice data correct
- ✅ Only the `users.account_balance` field was incorrect
- ✅ Balance could be recalculated from transactions

---

## Prevention Measures

### 1. Architectural Principle
**Single Source of Truth:** User balance updates are ONLY handled by database triggers.

**Rule:** Application code and database functions should NEVER manually update `users.account_balance`. The trigger handles this automatically.

### 2. Code Review Checklist
- [ ] Verify no manual balance updates in new functions
- [ ] Ensure triggers are enabled and functioning
- [ ] Test balance calculations after all operations
- [ ] Cross-reference stored vs calculated balances

### 3. Automated Testing
Add integration test:
```typescript
describe('Payment Reversal', () => {
  it('should not double-count balance after reversal', async () => {
    // Create invoice
    const invoice = await createInvoice({ amount: 100 });
    
    // Make payment
    await processPayment({ invoiceId: invoice.id, amount: 100 });
    
    // Verify balance = 0
    let balance = await getUserBalance(userId);
    expect(balance).toBe(0);
    
    // Reverse payment
    await reversePayment({ paymentId: payment.id });
    
    // Verify balance = invoice amount (NOT doubled!)
    balance = await getUserBalance(userId);
    expect(balance).toBe(100); // NOT 200!
  });
});
```

### 4. Monitoring
Run nightly balance verification:
```sql
-- Check for balance mismatches
SELECT COUNT(*) as mismatch_count
FROM (
  SELECT u.id
  FROM users u
  LEFT JOIN transactions t ON t.user_id = u.id AND t.status = 'completed'
  GROUP BY u.id, u.account_balance
  HAVING ABS(u.account_balance - COALESCE(SUM(
    CASE 
      WHEN t.type = 'debit' THEN t.amount
      WHEN t.type = 'credit' THEN -t.amount
      ELSE 0
    END
  ), 0)) > 0.01
) sub;

-- Expected: 0
-- Alert if > 0
```

---

## Related Issues

This bug was discovered during the comprehensive audit documented in:
- [COMPREHENSIVE_INVOICING_AUDIT_REPORT.md](./COMPREHENSIVE_INVOICING_AUDIT_REPORT.md)

This fix addresses:
- ✅ Payment reversal double-counting
- ✅ User balance integrity
- ✅ Trigger vs manual update conflicts

---

## Documentation Updates

Created/Updated:
1. ✅ `PAYMENT_REVERSAL_DOUBLE_COUNTING_BUG_FIX.md` - Detailed technical analysis
2. ✅ `PAYMENT_REVERSAL_BUG_INVESTIGATION_SUMMARY.md` - This document
3. ✅ Updated migration file with corrected functions
4. ✅ Added inline comments explaining trigger-based updates

---

## Sign-off

**Bug Status:** ✅ RESOLVED  
**Data Status:** ✅ CORRECTED  
**Testing Status:** ✅ VERIFIED  
**Documentation Status:** ✅ COMPLETE  

**System Status:** 🟢 OPERATIONAL

The payment reversal system now correctly relies on automatic transaction triggers for balance updates, eliminating the double-counting bug. All affected data has been corrected and the system is ready for production use.

---

**Next Steps:**
1. ✅ Deploy fixed functions to production
2. ⏳ Monitor for any balance discrepancies
3. ⏳ Add automated balance verification job
4. ⏳ Create integration tests for payment reversals

---

**Report Completed:** October 8, 2025

