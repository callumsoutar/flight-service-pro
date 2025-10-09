# Optimistic State Refresh After Completion - Fixed

## Issue Summary
After clicking "Complete" on a booking, the UI would revert to old/stale invoice data instead of showing the updated state from the server. Users had to manually refresh the page to see the correct final invoice amounts.

## Symptoms
1. User makes changes to invoice (add/edit/delete items) - shows optimistically ✓
2. User clicks "Complete" button
3. Completion succeeds ✓
4. **UI reverts to old state from initial page load** ❌
5. User refreshes page manually
6. UI now shows correct final state ✓

## Root Cause
The `useBookingCompletion` hook was clearing `localData` after successful completion instead of updating it with the fresh data from the server:

**Before:**
```typescript
onSuccess: () => {
  setHasCompleted(true);
  setLocalData(null);  // ❌ Cleared local state!
  queryClient.invalidateQueries(...);
}
```

This caused the component to fall back to the stale `existingInvoiceItems` prop from the initial server-side render, which hadn't been updated yet.

## Solution
Updated the `onSuccess` callback to:
1. Fetch fresh invoice items from the server
2. Update `localData` with the new items and recalculated totals
3. Invalidate queries to refresh other dependent data

**After:**
```typescript
onSuccess: async (data) => {
  setHasCompleted(true);
  
  // Fetch fresh invoice items from server
  if (data.invoice?.id) {
    const itemsResponse = await fetch(`/api/invoice_items?invoice_id=${data.invoice.id}`);
    const itemsData = await itemsResponse.json();
    const freshItems = (itemsData.invoice_items || []).map(item => ({...}));
    
    const totals = InvoiceCalculations.calculateInvoiceTotals(freshItems);
    
    // Update local data with fresh server data
    setLocalData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        invoiceItems: freshItems,  // ✓ Fresh data from server
        totals: {
          subtotal: totals.subtotal,
          tax: totals.tax_total,
          total: totals.total_amount,
        },
      };
    });
  }
  
  queryClient.invalidateQueries(...);
}
```

## Key Implementation Details

### 1. Functional State Update
Used functional update `setLocalData((prev) => ...)` to avoid stale closure issues:
```typescript
// ❌ Bad - stale closure
setLocalData({ ...localData, invoiceItems: freshItems });

// ✓ Good - always gets current state
setLocalData((prev) => ({ ...prev, invoiceItems: freshItems }));
```

### 2. Preserve Other Local State
Only updates `invoiceItems` and `totals`, preserving other important state like `flightLog`, `flightTypeId`, and `instructorId`.

### 3. Error Handling
Wrapped the fetch in try-catch to gracefully handle any errors fetching updated data:
```typescript
try {
  const itemsResponse = await fetch(...);
  // update state
} catch (error) {
  console.error('Failed to fetch updated invoice items:', error);
  // Component will still show success state
}
```

## Data Flow After Fix

1. **User completes booking**
   - `completeMutation.mutate()` called with current `localData.invoiceItems`

2. **Server processes completion**
   - Updates/inserts invoice items (with proper upsert logic)
   - Recalculates invoice totals
   - Returns updated booking and invoice data

3. **onSuccess callback fires**
   - Fetches fresh invoice items from `/api/invoice_items`
   - Maps items to local format
   - Recalculates totals using `InvoiceCalculations`
   - Updates `localData` with fresh server state

4. **Component re-renders**
   - Uses `localData.invoiceItems` (now fresh from server)
   - Shows correct final totals immediately
   - No page refresh needed! ✓

## Testing Checklist

- [x] Complete a new booking (no existing invoice) → shows correct invoice
- [x] Complete an existing booking with invoice → updates existing items
- [x] Add items during completion → items persist after save
- [x] Edit item quantities → changes persist after save  
- [x] Delete items during completion → items removed after save
- [x] UI shows correct totals immediately after completion
- [x] No page refresh required to see final state

## Files Modified

1. `/src/hooks/use-booking-completion.ts`
   - Updated `completeMutation.onSuccess` to fetch and update fresh data
   - Added invoice items query invalidation
   - Used functional state update to avoid closure issues

## Related Fixes
This fix works together with the invoice doubling fix ([INVOICE_DOUBLING_FIX.md](./INVOICE_DOUBLING_FIX.md)):
- Invoice doubling fix ensures server data is correct (no duplicates)
- This fix ensures UI shows that correct server data immediately

