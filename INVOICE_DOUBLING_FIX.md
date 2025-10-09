# Invoice Doubling Bug - Fixed

## Issue Summary
When updating an existing invoice in the BookingCompletionClient, invoice items were being **duplicated** instead of updated, causing the invoice total to double.

**Example:**
- Invoice: `INV-2025-10-0021` (ID: `86708160-a9c5-4bd7-a8c4-71ee32f6acd1`)
- Expected total: **$669.00**
- Actual total before fix: **$1,398.00** (doubled)

## Root Causes

### 1. **Missing Upsert Logic in Complete Flight API**
The `/api/bookings/[id]/complete-flight` endpoint was **blindly inserting** all invoice items without checking if they already existed:

**Before:**
```typescript
// Always inserted items, creating duplicates
for (const item of invoiceItems) {
  await supabase.from('invoice_items').insert({...});
}
```

**After:**
```typescript
// Now checks if item exists and either updates or inserts
const existingItemIds = new Set(existingItems?.map(i => i.id) || []);

for (const item of invoiceItems) {
  const isExistingItem = !item.id.startsWith('temp-') && existingItemIds.has(item.id);
  
  if (isExistingItem) {
    await supabase.from('invoice_items').update(itemData).eq('id', item.id);
  } else {
    await supabase.from('invoice_items').insert(itemData);
  }
}

// Also deletes items that were removed from the list
```

### 2. **Missing Deleted Items Filter in Database Function**
The `update_invoice_totals_atomic()` function was including soft-deleted items in its calculations:

**Before:**
```sql
SELECT SUM(amount), SUM(tax_amount), SUM(line_total)
FROM invoice_items 
WHERE invoice_id = p_invoice_id;
-- ❌ Included deleted items!
```

**After:**
```sql
SELECT SUM(amount), SUM(tax_amount), SUM(line_total)
FROM invoice_items 
WHERE invoice_id = p_invoice_id
  AND deleted_at IS NULL;
-- ✅ Excludes deleted items
```

### 3. **Trigger Blocking Atomic Updates**
The `prevent_approved_invoice_modification()` trigger was blocking the atomic update function from recalculating totals, even though it runs with `SECURITY DEFINER`.

**Fix:** Added a special case to allow `SECURITY DEFINER` functions (where `auth.uid()` IS NULL) to update financial totals (`subtotal`, `tax_total`, `total_amount`) when no other critical fields are modified.

## Changes Made

### 1. `/src/app/api/bookings/[id]/complete-flight/route.ts`
- Added logic to fetch existing invoice items before processing
- Implemented proper upsert logic (update if exists, insert if new)
- Added deletion of items that were removed from the list
- Added `userId` parameter to `handleComplete()` function for audit trail

### 2. Database Function: `update_invoice_totals_atomic`
- Added `AND deleted_at IS NULL` filter when calculating totals
- Added `SECURITY DEFINER` to bypass RLS restrictions

### 3. Database Trigger: `prevent_approved_invoice_modification`
- Added exemption for atomic update functions to modify financial totals
- Allows `auth.uid() IS NULL` updates that change `subtotal`, `tax_total`, `total_amount` when other critical fields remain unchanged

## Data Cleanup Performed

For the affected invoice `INV-2025-10-0021`:

1. **Soft-deleted duplicate items:**
   - Duplicate aircraft charge (created at 02:17:44)
   - Duplicate instructor charge (created at 02:17:44)
   - Duplicate logbook charge (created at 02:17:44)

2. **Recalculated invoice totals:**
   - Before: $1,398.00
   - After: $669.00 ✅

3. **Updated transaction record:**
   - Transaction amount updated from $1,398.00 to $669.00

## Final State

**Active Invoice Items:**
1. Aircraft charge (ZK-KAZ): 1.3 hrs × $295.65 = $384.35 + $57.65 tax = **$442.00**
2. Instructor charge (Callum Soutar): 1.3 hrs × $82.61 = $107.39 + $16.11 tax = **$123.50**
3. CAA Pilots Logbook: 2 × $45.00 = $90.00 + $13.50 tax = **$103.50**

**Invoice Totals:**
- Subtotal: $581.74
- Tax (15%): $87.26
- **Total: $669.00** ✅

## Prevention
This bug is now prevented by:
1. ✅ Proper upsert logic in the completion endpoint
2. ✅ Deleted items excluded from total calculations
3. ✅ Atomic updates can now recalculate totals correctly
4. ✅ Future updates to existing invoices will modify items instead of duplicating them

