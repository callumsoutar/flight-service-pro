# Credit Note Invoice Balance Fix

**Date:** October 8, 2025  
**Issue:** Invoice balance_due not updated when credit notes applied  
**Status:** ✅ FIXED

---

## 🐛 The Bug

### **Problem:**
When a credit note was applied to an invoice, the invoice's `balance_due` field was not being updated. This caused the invoice to show an incorrect balance amount.

**Example:**
- Invoice INV-2025-10-0012: Total $69.00
- Credit Note CN-202510-001: $17.25 (applied)
- **Expected:** balance_due = $51.75
- **Actual:** balance_due = $69.00 ❌

### **Impact:**
- Invoice displayed incorrect "Balance Due" amount
- User's account balance was correct ($51.75)
- But invoice still showed $69.00 owed
- Confusing for users and accounting

---

## 🔍 Root Cause

The `apply_credit_note_atomic()` function was:
1. ✅ Creating credit transaction
2. ✅ Updating user's account balance
3. ✅ Updating credit note status to 'applied'
4. ❌ **NOT updating invoice's balance_due field**

---

## ✅ The Fix

### **What Was Changed:**

Updated `apply_credit_note_atomic()` function to:

1. Lock the invoice (FOR UPDATE)
2. Calculate new balance_due:
   ```sql
   balance_due = total_amount - total_paid - (sum of applied credit notes)
   ```
3. Update invoice record:
   ```sql
   UPDATE invoices
   SET balance_due = calculated_balance,
       updated_at = NOW()
   WHERE id = invoice_id;
   ```

### **Files Modified:**

1. ✅ Database function: `apply_credit_note_atomic()`
2. ✅ Migration file: `20250108000002_fix_credit_note_invoice_balance.sql`
3. ✅ Fixed existing invoice: INV-2025-10-0012

---

## 📊 How It Works Now

### **Invoice Display:**

```
┌─────────────────────────────────────┐
│ Invoice INV-2025-10-0012            │
├─────────────────────────────────────┤
│ Subtotal:              $60.00       │
│ Tax (15%):              $9.00       │
│ ────────────────────────────────    │
│ Total:                 $69.00  ← Original total (never changes)
│                                     │
│ Paid:                   $0.00  ← Payments made
│ Balance Due:           $51.75  ← Reflects credit note! ✅
└─────────────────────────────────────┘

Credit Notes:
┌─────────────────────────────────────┐
│ CN-202510-001         [Applied]     │
│ Did not take a VNC                  │
│                        -$17.25      │
└─────────────────────────────────────┘
```

### **Calculation:**
```
Total Amount:     $69.00
Minus Payments:   -$0.00
Minus Credits:    -$17.25
─────────────────────────
Balance Due:      $51.75 ✅
```

---

## 🧪 Testing

### **Before Fix:**
```sql
SELECT invoice_number, total_amount, total_paid, balance_due
FROM invoices
WHERE id = '2eae8eec-4500-432c-9052-60d631da74aa';

Result:
  total_amount: $69.00
  total_paid: $0.00
  balance_due: $69.00  ❌ WRONG!
```

### **After Fix:**
```sql
SELECT invoice_number, total_amount, total_paid, balance_due
FROM invoices
WHERE id = '2eae8eec-4500-432c-9052-60d631da74aa';

Result:
  total_amount: $69.00
  total_paid: $0.00
  balance_due: $51.75  ✅ CORRECT!
```

### **Verification Query:**
```sql
SELECT 
  i.invoice_number,
  i.total_amount as original_total,
  COALESCE(i.total_paid, 0) as payments,
  COALESCE(SUM(cn.total_amount), 0) as credits_applied,
  i.total_amount - COALESCE(i.total_paid, 0) - COALESCE(SUM(cn.total_amount), 0) as calculated_balance,
  i.balance_due as stored_balance,
  CASE 
    WHEN i.balance_due = (i.total_amount - COALESCE(i.total_paid, 0) - COALESCE(SUM(cn.total_amount), 0))
    THEN '✅ CORRECT'
    ELSE '❌ WRONG'
  END as status
FROM invoices i
LEFT JOIN credit_notes cn ON cn.original_invoice_id = i.id 
  AND cn.status = 'applied' 
  AND cn.deleted_at IS NULL
WHERE i.id = '2eae8eec-4500-432c-9052-60d631da74aa'
GROUP BY i.id;

Result:
  original_total: $69.00
  payments: $0.00
  credits_applied: $17.25
  calculated_balance: $51.75
  stored_balance: $51.75
  status: ✅ CORRECT
```

---

## 🔄 What Happens When You Apply a Credit Note

### **Step-by-Step:**

1. **Create Credit Note** (Draft)
   - No changes to anything yet

2. **Apply Credit Note**
   - ✅ Creates credit transaction
   - ✅ Updates user account_balance: $69.00 → $51.75
   - ✅ Updates credit note status: 'draft' → 'applied'
   - ✅ **Updates invoice balance_due: $69.00 → $51.75** ← NEW!

### **Database Changes:**

```sql
-- Transaction created
INSERT INTO transactions (
  type: 'credit',
  amount: $17.25,
  status: 'completed'
)

-- User balance updated
UPDATE users SET account_balance = $51.75  -- was $69.00

-- Credit note applied
UPDATE credit_notes SET status = 'applied'

-- Invoice balance updated (NEW!)
UPDATE invoices SET balance_due = $51.75  -- was $69.00
```

---

## 📋 Migration Details

### **Migration File:**
`supabase/migrations/20250108000002_fix_credit_note_invoice_balance.sql`

### **What It Does:**

1. **Updates Function:** `apply_credit_note_atomic()`
   - Adds invoice balance_due calculation
   - Locks invoice for update
   - Updates balance_due atomically

2. **Backfills Existing Data:**
   - Finds all invoices with applied credit notes
   - Recalculates and fixes their balance_due
   - Logs how many were fixed

3. **Verification:**
   - Counts affected invoices
   - Provides feedback on success

---

## ✅ Accounting Principles Followed

### **Invoice Immutability:**
- ✅ **Invoice total never changes** ($69.00 stays $69.00)
- ✅ **Credit notes are separate documents** (CN-202510-001)
- ✅ **Balance reflects actual amount owed** ($51.75)

### **Audit Trail:**
- ✅ Original invoice preserved with full amount
- ✅ Credit note shows correction separately
- ✅ Transaction history shows all changes
- ✅ Can trace exactly what happened and when

### **User Communication:**
```
Dear Customer,

Original Invoice: $69.00
Credit Applied:   -$17.25 (VNC not taken)
─────────────────────────
Amount Due:       $51.75

Credit Note: CN-202510-001
Reason: Did not take a VNC
```

---

## 🎯 Summary

### **Before Fix:**
- Invoice total: $69.00 ✅
- User balance: $51.75 ✅
- Invoice balance_due: $69.00 ❌ **WRONG**

### **After Fix:**
- Invoice total: $69.00 ✅
- User balance: $51.75 ✅
- Invoice balance_due: $51.75 ✅ **CORRECT!**

---

## 📝 To Answer Your Question:

> "Should the amount due still say the original 69 or should it reflect what it ACTUALLY is?"

**Answer: It should reflect what it ACTUALLY is!**

- **Invoice Total:** $69.00 (never changes - this is the original invoice)
- **Balance Due:** $51.75 (what the user ACTUALLY owes after credits)

This is now **FIXED** and working correctly! ✅

---

**Date Fixed:** October 8, 2025  
**Migration Applied:** ✅ Yes  
**Function Updated:** ✅ Yes  
**Existing Data Fixed:** ✅ Yes (1 invoice corrected)  
**Status:** 🟢 Production Ready

