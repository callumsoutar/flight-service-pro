# Invoice System Implementation & Database Migration Guide

## 🎯 **PART 1: IMPLEMENTATION ACHIEVEMENTS & HOW THE CODE WORKS**

### **Overview of New Architecture**

The invoice system has been completely restructured to move all business logic from database triggers to application code, creating a more maintainable, testable, and secure invoicing system.

---

## 📊 **Frontend Invoice Calculation Flow**

### **1. New Invoice Creation Process**

**Route**: `/dashboard/invoices/edit/new`

**Step-by-Step Process**:

1. **User Lands on New Invoice Page**
   ```typescript
   // InvoiceEditClient.tsx - New Invoice Mode
   const isNewInvoice = mode === 'new' || !id;
   ```

2. **User Selects Member & Adds Items**
   - Member selection: Sets `selectedMember` state
   - Add items via `ChargeableSearchDropdown`
   - **NO DATABASE WRITES YET** - Everything stored in local state

3. **Real-Time Calculation on Frontend**
   ```typescript
   // When user adds an item
   onAdd={(item, quantity) => {
     try {
       // Use InvoiceCalculations for currency-safe calculations
       const calculatedAmounts = InvoiceCalculations.calculateItemAmounts({
         quantity,
         unit_price: item.rate,
         tax_rate: organizationTaxRate
       });

       setDraftItems((prev) => [
         ...prev,
         {
           // ... item details
           amount: calculatedAmounts.amount,           // Tax-exclusive amount
           tax_amount: calculatedAmounts.tax_amount,   // Tax portion
           line_total: calculatedAmounts.line_total,   // Total including tax
           rate_inclusive: calculatedAmounts.rate_inclusive, // Unit price + tax
         },
       ]);
     } catch (error) {
       toast.error('Failed to add item with calculations');
     }
   }}
   ```

4. **Live Totals Calculation**
   ```typescript
   // Calculates totals in real-time as user adds/modifies items
   const getDraftTotals = () => {
     try {
       return InvoiceCalculations.calculateInvoiceTotals(draftItems);
     } catch (error) {
       // Graceful fallback on calculation errors
       return { subtotal: 0, tax_total: 0, total_amount: 0 };
     }
   };

   const {
     subtotal: draftSubtotal,
     tax_total: draftTotalTax,
     total_amount: draftTotal
   } = getDraftTotals();
   ```

5. **Atomic Database Write on Save/Approve**
   ```typescript
   // Only when user clicks "Save Draft" or "Approve"
   const createInvoiceWithItems = async () => {
     const response = await fetch('/api/invoices', {
       method: 'POST',
       body: JSON.stringify({
         user_id: selectedMember.id,
         status: 'draft', // or 'pending' for approve
         items: draftItems.map(item => ({
           chargeable_id: item.chargeable_id,
           description: item.description,
           quantity: item.quantity,
           unit_price: item.unit_price,
           tax_rate: item.tax_rate
         }))
       })
     });
   };
   ```

---

## 🔧 **Backend Processing Flow**

### **API Endpoint**: `POST /api/invoices`

**Step-by-Step Backend Process**:

1. **Receive Invoice Creation Request**
   ```typescript
   const { user_id, status, items = [] } = body;
   ```

2. **Create Invoice Shell**
   ```typescript
   // Use atomic database function to create invoice and transaction
   const { data: result } = await supabase.rpc('create_invoice_with_transaction', {
     p_user_id: user_id,
     p_booking_id: booking_id || null,
     p_status: status,
     p_tax_rate: taxRate,
     p_due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
   });
   ```

3. **Process Items with Application Calculations**
   ```typescript
   if (items.length > 0) {
     const invoiceItems = items.map((item) => {
       // Use InvoiceService for currency-safe calculations
       const calculatedAmounts = InvoiceService.calculateItemAmounts({
         quantity: item.quantity,
         unit_price: item.unit_price,
         tax_rate: item.tax_rate ?? taxRate
       });

       return {
         invoice_id: result.invoice_id,
         chargeable_id: item.chargeable_id,
         description: item.description,
         quantity: item.quantity,
         unit_price: item.unit_price,
         tax_rate: item.tax_rate ?? taxRate,
         // Application-calculated values using currency-safe arithmetic
         amount: calculatedAmounts.amount,
         tax_amount: calculatedAmounts.tax_amount,
         line_total: calculatedAmounts.line_total,
         rate_inclusive: calculatedAmounts.rate_inclusive,
         notes: item.notes || null
       };
     });

     // Insert all items atomically
     await supabase.from('invoice_items').insert(invoiceItems);
   }
   ```

4. **Update Invoice Totals**
   ```typescript
   // Update invoice totals using application logic
   await InvoiceService.updateInvoiceTotalsWithTransactionSync(result.invoice_id);
   ```

---

## 💡 **Key Technical Improvements**

### **1. Currency-Safe Arithmetic**
```typescript
// Uses Decimal.js to eliminate floating-point errors
import { Decimal } from 'decimal.js';
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

// Example calculation
const amount = quantity.mul(unitPrice);
const taxAmount = amount.mul(taxRate);
const lineTotal = amount.add(taxAmount);
```

### **2. Client/Server Calculation Separation**
- **Client**: `InvoiceCalculations` - Pure calculation utility, no database dependencies
- **Server**: `InvoiceService` - Full service with database access and transaction management
- **Identical Logic**: Both use same Decimal.js-based calculations

### **3. Comprehensive Error Handling**
```typescript
// Input validation
if (quantity == null || isNaN(Number(quantity)) || quantity < 0) {
  throw new Error('Invalid quantity: must be a non-negative number');
}

// Result validation
Object.entries(result).forEach(([key, value]) => {
  if (!isFinite(value)) {
    throw new Error(`Calculation resulted in invalid ${key}: ${value}`);
  }
});
```

### **4. Real-Time UI Updates**
- Calculations happen instantly as user types
- No network requests for calculations
- Immediate feedback on totals
- Validation errors shown immediately

---

## 🗄️ **PART 2: DATABASE MIGRATION REQUIREMENTS**

### **⚠️ CRITICAL: Triggers & Functions That MUST BE REMOVED**

Your Supabase database currently has **12 triggers** and **9 functions** that will cause **dual-write conflicts** and **calculation inconsistencies** if not removed.

---

## 🔍 **What to Investigate in Supabase**

### **Step 1: Check Current Triggers**

**SQL Query to Run in Supabase SQL Editor**:
```sql
-- Check for invoice-related triggers
SELECT
    schemaname,
    tablename,
    triggername,
    definition
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND (
    triggername LIKE '%invoice%' OR
    tablename IN ('invoices', 'invoice_items', 'payments')
)
AND NOT tgisinternal
ORDER BY tablename, triggername;
```

### **Step 2: Check Current Functions**

**SQL Query to Run in Supabase SQL Editor**:
```sql
-- Check for invoice-related functions
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%invoice%' OR
    routine_name LIKE '%payment%'
)
ORDER BY routine_name;
```

---

## 🗑️ **Triggers That MUST BE REMOVED**

### **On `invoice_items` Table**:
1. `calculate_invoice_item_amounts_trigger` - Calculates line_total and tax_amount
2. `update_invoice_totals_on_item_change` - Updates parent invoice totals

### **On `invoices` Table**:
3. `ensure_invoice_number` - Generates sequential invoice numbers
4. `trg_invoice_approval` - Creates debit transactions
5. `trg_invoice_reverse_debit` - Removes debit transactions
6. `trg_invoice_reverse_debit_delete` - Removes debit transactions on delete
7. `trg_invoice_sync_debit` - Updates debit transaction amounts
8. `trg_update_invoice_balance_due` - Recalculates balance due
9. `update_invoice_status_on_payment` - Updates status based on payments

### **On `payments` Table**:
10. `trg_update_invoice_payment_totals_delete`
11. `trg_update_invoice_payment_totals_insert`
12. `trg_update_invoice_payment_totals_update`

---

## 🛠️ **Functions That MUST BE REMOVED**

1. `calculate_invoice_item_amounts()` - Now handled by `InvoiceCalculations.calculateItemAmounts()`
2. `update_invoice_totals()` - Now handled by `InvoiceService.updateInvoiceTotals()`
3. `set_invoice_number()` - Now handled by `InvoiceService.generateInvoiceNumber()`
4. `process_invoice_approval()` - Now handled by application logic
5. `reverse_invoice_debit_transaction()` - Now handled by TransactionService
6. `sync_invoice_debit_transaction()` - Now handled by application logic
7. `update_invoice_balance_due()` - Now handled by application logic
8. `update_invoice_payment_totals()` - Now handled by application logic
9. `update_invoice_status()` - Now handled by `InvoiceService.calculateInvoiceStatus()`

---

## 📋 **MIGRATION SCRIPT EXECUTION PLAN**

### **Step 1: Verify Current State**
```sql
-- Run this in Supabase SQL Editor to verify calculations work
\i verify-calculations-before-trigger-removal.sql
```

### **Step 2: Backup Database**
```bash
# Create backup before making changes
pg_dump -h your-supabase-host -U postgres -d your-database > invoice_backup_before_trigger_removal.sql
```

### **Step 3: Execute Trigger Removal**
```sql
-- Run this in Supabase SQL Editor
\i disable-invoice-triggers.sql
```

**The script will remove**:
- 12 triggers across 3 tables
- 9 functions related to invoice calculations
- Add audit log entry for the migration

### **Step 4: Verify Removal**
```sql
-- Verify triggers are gone
SELECT count(*) FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND triggername LIKE '%invoice%'
AND NOT tgisinternal;
-- Should return 0

-- Verify functions are gone
SELECT count(*) FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'calculate_invoice_item_amounts',
    'update_invoice_totals',
    'set_invoice_number',
    'process_invoice_approval',
    'reverse_invoice_debit_transaction',
    'sync_invoice_debit_transaction',
    'update_invoice_balance_due',
    'update_invoice_payment_totals',
    'update_invoice_status'
);
-- Should return 0
```

---

## ⚠️ **IMPORTANT: Functions to KEEP**

**DO NOT REMOVE these functions** (they're used by the application):

1. `generate_invoice_number()` - Used by `InvoiceService.generateInvoiceNumber()`
2. `generate_invoice_number_with_prefix()` - Used for configurable prefixes
3. `create_invoice_with_transaction()` - Used for atomic invoice creation
4. `process_payment_atomic()` - Used for payment processing
5. `update_invoice_status_atomic()` - Used for status updates
6. Any other functions not related to automatic calculation triggers

---

## 🔄 **ROLLBACK PLAN**

If issues arise after trigger removal:

### **Emergency Rollback Script**:
```sql
-- Restore from the rollback script (if needed)
\i rollback-invoice-triggers.sql
```

### **Monitoring After Migration**:
1. **Check for Calculation Errors**: Monitor logs for calculation exceptions
2. **Verify Invoice Totals**: Spot-check that invoice totals are correct
3. **Test New Invoice Creation**: Ensure the flow works end-to-end
4. **Test Invoice Editing**: Verify existing invoices can still be modified

---

## 📊 **POST-MIGRATION VERIFICATION**

### **Verification Queries**:
```sql
-- 1. Check for empty draft invoices (should be 0)
SELECT COUNT(*) FROM invoices
WHERE status = 'draft'
AND total_amount = 0
AND created_at > NOW() - INTERVAL '1 day';

-- 2. Check calculation consistency (should show no major discrepancies)
SELECT
    i.id,
    i.total_amount as invoice_total,
    SUM(ii.line_total) as calculated_total,
    ABS(i.total_amount - SUM(ii.line_total)) as difference
FROM invoices i
JOIN invoice_items ii ON ii.invoice_id = i.id
WHERE i.created_at > NOW() - INTERVAL '1 day'
GROUP BY i.id, i.total_amount
HAVING ABS(i.total_amount - SUM(ii.line_total)) > 0.01;

-- 3. Verify no triggers remain
SELECT COUNT(*) FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
WHERE c.relname IN ('invoices', 'invoice_items', 'payments')
AND t.tgname LIKE '%invoice%';
```

---

## ✅ **SUCCESS CRITERIA**

After migration, you should have:

1. **✅ Zero database triggers** related to invoice calculations
2. **✅ Application-only calculations** using currency-safe arithmetic
3. **✅ No empty draft invoices** being created
4. **✅ Consistent calculation results** between old and new system
5. **✅ Faster performance** due to elimination of trigger overhead
6. **✅ Better error handling** with user-friendly messages

The system will be more maintainable, testable, and reliable with all business logic properly located in the application layer rather than hidden in database triggers.