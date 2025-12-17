# Account Balance Discrepancy Investigation

## Executive Summary

**Issue Identified**: Member account balances show conflicting values:
- **Static Account Balance Display**: Shows `$600.00` (from `users.account_balance` column)
- **Transaction Table Balance**: Shows `$462.00` (correctly calculated from transactions)

**Root Cause**: The `users.account_balance` column is updated when credit payments are received but **NOT** updated when invoices are issued. This creates a desynchronized state where the stored balance becomes stale.

---

## Current State Analysis

### 1. Balance Display Locations

#### A. Static Account Balance Card (Incorrect)
**Location**: `src/components/members/tabs/MemberAccountTab.tsx:69`

```typescript
const balance = member?.account_balance ?? 0;
```

- **Source**: Directly reads `users.account_balance` column from Supabase
- **Behavior**: Does NOT update when invoices are issued
- **Current Value**: `$600.00` (reflects only the credit payment)

#### B. Transaction Table Balance (Correct)
**Location**: `src/components/members/tabs/MemberAccountTab.tsx:54`

```typescript
setClosingBalance(data.closing_balance || 0);
```

- **Source**: `/api/account-statement` endpoint which calculates from transactions
- **Behavior**: Correctly reflects all transactions (credits and debits)
- **Current Value**: `$462.00` (calculated: $600 payment - $138 invoice = $462)

**Note**: The API endpoint currently returns the stored `users.account_balance` as `closing_balance` (line 249), but the table correctly calculates running balances from transactions. This is a separate issue.

### 2. Payment Flow Analysis

#### Credit Payment Processing
**Location**: `src/app/api/payments/credit/route.ts:59`

```typescript
const { data: result, error } = await supabase.rpc('process_credit_payment_atomic', {
  p_user_id: user_id,
  p_amount: Number(amount),
  // ...
});
```

**What Happens**:
1. Database function `process_credit_payment_atomic` is called
2. Creates transaction record (type: 'credit')
3. Creates payment record
4. **Likely updates `users.account_balance`** (needs verification)

**Result**: After receiving $600 credit payment, `users.account_balance` = `-$600.00` (credit/negative balance)

### 3. Invoice Flow Analysis

#### Invoice Creation
**Location**: `src/app/api/invoices/route.ts:108`

```typescript
const { data: result, error } = await supabase.rpc('create_invoice_with_transaction', {
  p_user_id: user_id,
  // ...
});
```

**What Happens**:
1. Database function `create_invoice_with_transaction` is called
2. Creates invoice record
3. Creates transaction record (type: 'debit') for $138
4. **Does NOT update `users.account_balance`** (needs verification but likely based on behavior)

**Result**: After issuing $138 invoice:
- Transaction table correctly shows: `-$462.00` (initial `-$600` + `$138` debit)
- `users.account_balance` still shows: `-$600.00` (unchanged)

### 4. Account Statement API

**Location**: `src/app/api/account-statement/route.ts`

**Current Implementation**:
- Lines 116-127: Fetches stored `users.account_balance`
- Lines 208-227: Calculates running balance from transactions (correct logic)
- Line 249: Returns stored `currentBalance` as `closing_balance` (should use calculated value)

**Issue**: The API correctly calculates balances from transactions but returns the stored value as closing_balance. However, the transaction table itself shows correct calculated balances.

### 5. Database Schema Understanding

**Tables Involved**:
- `users.account_balance` (numeric, not nullable, default 0.00)
- `transactions` (records all debit/credit entries)
- `invoices` (invoice records)
- `payments` (payment records)

**Database Functions**:
- `process_credit_payment_atomic` - Handles credit payments
- `create_invoice_with_transaction` - Creates invoices and debit transactions
- `get_account_balance` - Retrieves balance (likely calculates from transactions or reads stored value)

**Triggers**: Unknown - need to verify if triggers exist to sync `account_balance` with transactions

---

## Root Cause

The system uses a **hybrid approach** inconsistently:

1. **Credit payments** update `users.account_balance` (via database function)
2. **Invoice creation** creates debit transactions but **does NOT** update `users.account_balance`
3. **Balance display** uses stored value instead of calculated value

This creates a situation where:
- Stored balance (`users.account_balance`) = `-$600.00` (last updated by credit payment)
- Actual balance (from transactions) = `-$462.00` (correct: `-$600` + `$138`)
- UI shows both, causing confusion

---

## Recommendations

### Option A: Single Source of Truth (Stored Balance with Automatic Updates) ⭐ **RECOMMENDED**

**Approach**: Keep `users.account_balance` as the source of truth, but ensure it's updated by database triggers/functions for ALL transaction types.

**Implementation**:
1. Create/update database trigger on `transactions` table to automatically update `users.account_balance` on INSERT/UPDATE/DELETE
2. Ensure `create_invoice_with_transaction` function updates `account_balance`
3. Update existing data to sync stored balances with calculated balances
4. Use stored `account_balance` for all display purposes

**Pros**:
- ✅ Fast reads (single column lookup vs. transaction aggregation)
- ✅ Consistent with current payment flow architecture
- ✅ Easy to audit (can recalculate from transactions if needed)
- ✅ Minimal code changes

**Cons**:
- ⚠️ Requires database trigger maintenance
- ⚠️ Risk of desynchronization if triggers fail (mitigated by periodic validation)

**Performance**: ⭐⭐⭐⭐⭐ (Excellent - single column read)

**Data Integrity**: ⭐⭐⭐⭐ (High - with proper triggers)

---

### Option B: Calculated Balance (Dynamic Computation)

**Approach**: Remove dependency on `users.account_balance`, always calculate from transactions.

**Implementation**:
1. Remove `account_balance` column usage from UI
2. Always calculate balance by summing transactions: `SUM(CASE WHEN type='credit' THEN -amount ELSE amount END)`
3. Add database view or function: `get_account_balance(user_id)` that calculates dynamically
4. Update all balance displays to use calculated value

**Pros**:
- ✅ Always accurate (single source of truth: transactions)
- ✅ No risk of desynchronization
- ✅ Simpler mental model

**Cons**:
- ⚠️ Slower reads (requires transaction table scan/aggregation)
- ⚠️ More complex queries for balance checks
- ⚠️ May need indexing optimization for large transaction volumes

**Performance**: ⭐⭐⭐ (Good - but slower than stored value)

**Data Integrity**: ⭐⭐⭐⭐⭐ (Perfect - transactions are source of truth)

---

### Option C: Hybrid with Proper Synchronization ⚠️ **NOT RECOMMENDED**

**Approach**: Keep both stored and calculated, but ensure they always match.

**Implementation**:
1. Store `account_balance` for fast reads
2. Calculate from transactions for verification
3. Add validation to detect discrepancies
4. Background job to sync if mismatches found

**Pros**:
- ✅ Fast reads + data integrity verification

**Cons**:
- ❌ Complex to maintain
- ❌ Two sources of truth (confusing)
- ❌ More failure points
- ❌ Requires sync jobs

**Performance**: ⭐⭐⭐⭐ (Good)

**Data Integrity**: ⭐⭐⭐ (Medium - relies on sync jobs)

---

## Recommended Solution: Option A with Database Triggers

### Why Option A?

1. **Consistent with existing architecture**: Credit payments already update stored balance
2. **Performance**: Fast reads for dashboard displays and balance checks
3. **Maintainability**: Database triggers ensure consistency at the database level
4. **Auditability**: Can always recalculate from transactions if needed

### Implementation Plan

#### Phase 1: Database Fixes

1. **Create/Update Transaction Trigger**
   ```sql
   -- Trigger to automatically update users.account_balance when transactions are inserted/updated/deleted
   CREATE OR REPLACE FUNCTION update_user_account_balance()
   RETURNS TRIGGER AS $$
   BEGIN
     IF TG_OP = 'INSERT' THEN
       UPDATE users
       SET account_balance = account_balance + 
           CASE 
             WHEN NEW.type = 'credit' THEN -NEW.amount
             WHEN NEW.type = 'debit' THEN NEW.amount
             ELSE 0
           END
       WHERE id = NEW.user_id;
       RETURN NEW;
     ELSIF TG_OP = 'UPDATE' THEN
       -- Handle amount or type changes
       UPDATE users
       SET account_balance = account_balance - 
           CASE 
             WHEN OLD.type = 'credit' THEN -OLD.amount
             WHEN OLD.type = 'debit' THEN OLD.amount
             ELSE 0
           END +
           CASE 
             WHEN NEW.type = 'credit' THEN -NEW.amount
             WHEN NEW.type = 'debit' THEN NEW.amount
             ELSE 0
           END
       WHERE id = NEW.user_id;
       RETURN NEW;
     ELSIF TG_OP = 'DELETE' THEN
       UPDATE users
       SET account_balance = account_balance - 
           CASE 
             WHEN OLD.type = 'credit' THEN -OLD.amount
             WHEN OLD.type = 'debit' THEN OLD.amount
             ELSE 0
           END
       WHERE id = OLD.user_id;
       RETURN OLD;
     END IF;
   END;
   $$ LANGUAGE plpgsql;

   -- Create trigger
   DROP TRIGGER IF EXISTS transactions_account_balance_trigger ON transactions;
   CREATE TRIGGER transactions_account_balance_trigger
     AFTER INSERT OR UPDATE OR DELETE ON transactions
     FOR EACH ROW
     WHEN (status = 'completed')
     EXECUTE FUNCTION update_user_account_balance();
   ```

2. **Verify Database Functions Update Balance**
   - Review `create_invoice_with_transaction` to ensure it doesn't conflict with trigger
   - Review `process_credit_payment_atomic` to ensure it updates balance correctly
   - May need to modify functions if they manually update balance (to avoid double-updating)

3. **Data Migration Script**
   ```sql
   -- Recalculate and sync all account balances from transactions
   UPDATE users u
   SET account_balance = COALESCE((
     SELECT SUM(
       CASE 
         WHEN t.type = 'credit' THEN -t.amount
         WHEN t.type = 'debit' THEN t.amount
         ELSE 0
       END
     )
     FROM transactions t
     WHERE t.user_id = u.id
       AND t.status = 'completed'
   ), 0);
   ```

#### Phase 2: Code Updates

1. **Update Account Statement API**
   - Change `closing_balance` to use calculated value from transactions (for consistency)
   - Or keep using stored value (if we trust the trigger)

2. **No Changes Needed to MemberAccountTab**
   - Continue using `member?.account_balance` (will now be accurate)
   - Transaction table will also show correct balances (already calculated correctly)

3. **Add Validation Endpoint (Optional)**
   ```typescript
   // GET /api/admin/validate-balances
   // Compare stored vs calculated balances for all users
   // Flag discrepancies for investigation
   ```

#### Phase 3: Testing & Validation

1. **Test Credit Payment**: Verify balance updates correctly
2. **Test Invoice Creation**: Verify balance updates correctly (debits reduce credit)
3. **Test Invoice Payment**: Verify balance updates correctly
4. **Test Edge Cases**: 
   - Transaction updates
   - Transaction deletions
   - Multiple rapid transactions
   - Concurrent transactions

---

## Immediate Action Items

### Critical (Do First)
1. ✅ Query database to verify:
   - Current `users.account_balance` value for test user
   - Transaction records for test user
   - Whether `create_invoice_with_transaction` updates balance
   - Whether triggers exist

2. ✅ Fix immediate discrepancy:
   - Option A: Run migration script to sync balances
   - Option B: Update UI to use calculated balance until permanent fix

### High Priority
3. Implement database trigger (Phase 1)
4. Run data migration to sync existing data
5. Update account statement API to be consistent

### Medium Priority
6. Add validation endpoint for balance verification
7. Add monitoring/alerting for balance discrepancies
8. Document the balance calculation approach

---

## Questions to Answer (Database Verification Needed)

1. Does `create_invoice_with_transaction` update `users.account_balance`?
2. Does `process_credit_payment_atomic` update `users.account_balance`?
3. Do any triggers exist on the `transactions` table?
4. What does `get_account_balance` function do (calculate or read stored)?
5. Are there any other code paths that update `account_balance`?

---

## Data Integrity Considerations

**Current Risk**: High - Stored balance can become stale, leading to incorrect financial reporting

**After Fix**: Low - Database trigger ensures automatic synchronization

**Audit Trail**: Transaction table provides complete audit trail for all balance changes

**Recovery**: Can always recalculate balance from transactions if corruption occurs

---

## Testing Plan

### Unit Tests
- Test trigger logic with sample transactions
- Test balance calculation edge cases (negative, zero, large numbers)

### Integration Tests
- Test full payment flow (credit → invoice → payment)
- Test concurrent transaction handling
- Test transaction rollback scenarios

### Manual Testing
1. Receive credit payment → verify balance updates
2. Issue invoice → verify balance updates (debits credit)
3. Pay invoice → verify balance updates
4. Issue multiple invoices → verify balance accuracy
5. Check transaction table balances match stored balance

---

## Conclusion

The issue is clear: **inconsistent updating of stored account balance**. The recommended solution is **Option A** with database triggers to ensure `users.account_balance` stays synchronized with transaction records automatically. This maintains performance while ensuring data integrity.

**Next Step**: Query database to verify current state, then implement trigger-based solution.

---

## Summary & Quick Answers

### ✅ Database Investigation Results (VERIFIED)

**Database State**: ✅ **CORRECT**
- Stored `users.account_balance`: `-462.00` ✓
- Calculated from transactions: `-462.00` ✓
- Transactions: Credit $600, Debit $138 → Net: `-$462` ✓

**Triggers**: ✅ **WORKING**
- Triggers exist and are functioning correctly
- `transaction_balance_insert_trigger` fires on transaction INSERT
- Calls `handle_transaction_balance_update()` → `update_user_account_balance()`
- Recalculates balance from transactions and updates `users.account_balance`

**Root Cause Identified**: 🎯 **FRONTEND STALE DATA**

The database is actually correct! The issue is:
1. `MemberAccountTab` receives `member` prop with `account_balance` fetched at page load time
2. When invoice is created, the database balance updates correctly (via trigger)
3. But the React component still has the old `member.account_balance` value in its props
4. Component needs to refetch member data OR use the calculated balance from account statement API

### Why This Happens

**Database Level**: ✅ Working correctly
- Triggers automatically update `users.account_balance` when transactions are created
- `create_invoice_with_transaction` creates debit transactions → trigger fires → balance updates
- `process_credit_payment_atomic` creates credit transactions → trigger fires → balance updates

**Frontend Level**: ❌ Stale data issue
- `MemberAccountTab` receives `member` prop with stale `account_balance` from initial page load
- When invoice is created, database updates correctly but React component doesn't refetch
- Component needs to either:
  - Refetch member data after invoice creation, OR
  - Use the calculated balance from `/api/account-statement` (which is already fetched)

### Recommended Fix

**Implement database trigger** that automatically updates `users.account_balance` whenever a transaction is inserted/updated/deleted.

### Verification Needed

Before implementing, verify:
1. Does `create_invoice_with_transaction` manually update `account_balance`? (If yes, may cause double-update with trigger)
2. Does `process_credit_payment_atomic` manually update `account_balance`? (If yes, may need adjustment)
3. Do any existing triggers on `transactions` table exist?

### ✅ Fixes Implemented

**Fix 1: Frontend Balance Display** ✅ COMPLETED
- Updated `MemberAccountTab.tsx` to use calculated balance from account statement API instead of stale prop
- Added `useCallback` and `useEffect` hooks to refetch account statement data
- Added window focus listener to refresh data when user returns to tab
- Balance now updates correctly after invoice/payment creation

**Fix 2: Account Statement API** ✅ COMPLETED
- Updated `/api/account-statement` to calculate `closing_balance` from transactions instead of stored value
- Ensures consistency between transaction table display and closing balance
- More resilient if database triggers ever fail (uses transactions as source of truth)

**Database**: ✅ No changes needed - triggers are already working correctly!

