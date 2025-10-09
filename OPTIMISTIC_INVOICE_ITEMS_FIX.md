# Optimistic Invoice Items Fix - Complete Flight Page

## 🐛 Problem

When adding chargeables or landing fees in the Complete Flight page, the invoice items were **not appearing immediately** in the invoice preview. Users had to wait for the API response before seeing the new items.

The optimistic updates were working in the React Query cache, but the UI component wasn't reading from that cache.

---

## 🔍 Root Cause Analysis

### **Data Flow Issue**

1. **`useInvoiceItems` hook** performs optimistic updates:
   ```typescript
   // Updates React Query cache with key: ['check-in', 'invoice-items', invoiceId]
   queryClient.setQueryData(
     checkInKeys.invoiceItems(invoiceId),
     [...previousItems, optimisticItem]
   );
   ```

2. **`BookingCompletionClient` component** was only reading from state:
   ```typescript
   // ❌ Only reading from calculatedData state (not React Query cache)
   const invoiceItems = calculatedData?.invoiceItems || [];
   ```

3. **Result**: Optimistic updates were invisible to the component!

### **Why This Happened**

The Complete Flight page uses a different data flow than other pages:
- **Invoice Edit page**: Reads directly from `useQuery` hooks (sees optimistic updates automatically)
- **Complete Flight page**: Uses local state (`calculatedData`) to store calculated items
- **`useInvoiceItems`**: Updates React Query cache (not local state)

**The two data sources were disconnected!**

---

## ✅ Solution

### **1. Read from React Query Cache**

Updated `BookingCompletionClient` to check the React Query cache first, then fall back to local state:

```typescript
// ✅ Get invoice items from React Query cache (includes optimistic updates)
const cachedInvoiceItems = invoiceId 
  ? (queryClient.getQueryData(checkInKeys.invoiceItems(invoiceId)) as any[] || null)
  : null;

// Use cached items if available (for optimistic updates), otherwise fall back to calculatedData
const invoiceItems = cachedInvoiceItems || calculatedData?.invoiceItems || [];
```

**Benefits**:
- ✅ Sees optimistic updates immediately
- ✅ Falls back to `calculatedData` if cache is empty
- ✅ No breaking changes to existing flow

---

### **2. Sync Cache on Calculate**

Updated `useBookingCompletion` to populate the React Query cache when charges are calculated:

```typescript
// In calculateMutation.onSuccess
onSuccess: (data) => {
  setCalculatedData(data);
  
  // ✅ Update React Query cache with invoice items for optimistic updates to work
  if (data.invoice?.id && data.invoiceItems) {
    queryClient.setQueryData(
      ['check-in', 'invoice-items', data.invoice.id],
      data.invoiceItems
    );
  }
  
  // ... invalidate queries
}
```

**Benefits**:
- ✅ Cache is always in sync with `calculatedData`
- ✅ Subsequent optimistic updates work correctly
- ✅ Prevents stale cache issues

---

### **3. Recalculate Totals from Current Items**

Added a `useMemo` to recalculate totals whenever invoice items change:

```typescript
// ✅ Recalculate totals from current invoice items using InvoiceCalculations
const totals = useMemo(() => {
  if (invoiceItems.length === 0) {
    return { subtotal: 0, tax: 0, total: 0 };
  }
  
  try {
    const calculated = InvoiceCalculations.calculateInvoiceTotals(invoiceItems);
    return {
      subtotal: calculated.subtotal,
      tax: calculated.tax_total,
      total: calculated.total_amount,
    };
  } catch (error) {
    console.error('Error calculating totals:', error);
    return calculatedData?.totals || { subtotal: 0, tax: 0, total: 0 };
  }
}, [invoiceItems, calculatedData?.totals]);
```

**Benefits**:
- ✅ Totals update immediately when items are added/removed
- ✅ Uses `InvoiceCalculations` for consistency (Decimal.js rounding)
- ✅ Error handling with fallback to original totals

---

## 📊 Data Flow (After Fix)

### **Calculate Charges Flow**
```
1. User clicks "Calculate Flight Charges"
   └─> calculateMutation.mutate()

2. API returns calculated invoice items
   └─> onSuccess() handler

3. Update both state AND cache
   ├─> setCalculatedData(data)                    [Local state]
   └─> queryClient.setQueryData(...)              [React Query cache]

4. Component re-renders
   ├─> Reads from cache: cachedInvoiceItems
   └─> Recalculates totals with useMemo
```

### **Add Chargeable Flow (Optimistic)**
```
1. User adds chargeable item
   └─> addItem({ invoiceId, item, quantity, taxRate })

2. Hook updates cache optimistically (onMutate)
   └─> queryClient.setQueryData(checkInKeys.invoiceItems(invoiceId), [...items, optimisticItem])

3. Component re-renders IMMEDIATELY
   ├─> cachedInvoiceItems includes optimistic item ✅
   └─> totals recalculate with new item ✅

4. API request completes
   └─> Cache invalidated and refetched for accuracy
```

### **Delete Item Flow (Optimistic)**
```
1. User deletes item
   └─> deleteItem({ itemId, invoiceId })

2. Hook updates cache optimistically (onMutate)
   └─> queryClient.setQueryData(checkInKeys.invoiceItems(invoiceId), items.filter(...))

3. Component re-renders IMMEDIATELY
   ├─> cachedInvoiceItems excludes deleted item ✅
   └─> totals recalculate without item ✅

4. API request completes
   └─> Cache invalidated and refetched for accuracy
```

---

## 🔧 Files Modified

### **1. `src/app/(auth)/dashboard/bookings/complete/[id]/BookingCompletionClient.tsx`**
**Changes**:
- Added `useQueryClient` import
- Added `checkInKeys` import
- Added `InvoiceCalculations` import
- Added `useMemo` to component imports
- Added `queryClient` instance
- Added `cachedInvoiceItems` logic to read from React Query cache
- Changed `invoiceItems` to prefer cache over state
- Changed `totals` to be a `useMemo` that recalculates from items

**Lines Changed**: ~15 additions, ~2 modifications

---

### **2. `src/hooks/use-booking-completion.ts`**
**Changes**:
- Updated `calculateMutation.onSuccess` to populate React Query cache with invoice items

**Lines Changed**: ~6 additions

---

## 🧪 Testing

### **Manual Test Steps**

1. ✅ **Calculate Charges**
   - Enter meter readings
   - Click "Calculate Flight Charges"
   - Verify aircraft and instructor items appear in invoice

2. ✅ **Add Landing Fee (Optimistic)**
   - Click "Landing Fees" tab
   - Select an aerodrome
   - Click "Add"
   - **Expected**: Item appears IMMEDIATELY in invoice (no loading delay)
   - **Expected**: Totals update IMMEDIATELY

3. ✅ **Add Airways Fee (Optimistic)**
   - Click "Airways" tab
   - Select a fee
   - Click "Add"
   - **Expected**: Item appears IMMEDIATELY in invoice
   - **Expected**: Totals update IMMEDIATELY

4. ✅ **Add Other Chargeable (Optimistic)**
   - Click "Other" tab
   - Select a chargeable
   - Click "Add"
   - **Expected**: Item appears IMMEDIATELY in invoice
   - **Expected**: Totals update IMMEDIATELY

5. ✅ **Delete Item (Optimistic)**
   - Click trash icon on any item
   - **Expected**: Item disappears IMMEDIATELY
   - **Expected**: Totals update IMMEDIATELY

6. ✅ **Recalculate Charges**
   - Change meter readings
   - Click "Calculate Flight Charges"
   - **Expected**: Aircraft/instructor items update
   - **Expected**: Added chargeables remain visible
   - **Expected**: Totals recalculate correctly

---

## 🎯 Key Improvements

### **1. Immediate Visual Feedback** ✅
Users see changes instantly without waiting for API responses

### **2. Consistent with Invoice Edit Page** ✅
Same optimistic update behavior across all invoice management interfaces

### **3. Accurate Totals** ✅
Totals recalculate automatically using `InvoiceCalculations` (Decimal.js)

### **4. No Breaking Changes** ✅
Fallback to `calculatedData` ensures existing flow still works

### **5. Error Resilience** ✅
Try-catch in `useMemo` prevents crashes if calculation fails

---

## 📚 Related Documentation

- **Invoice Calculation Standardization**: `INVOICE_CALCULATION_STANDARDIZATION.md`
- **Optimistic Updates Pattern**: React Query docs on optimistic updates
- **React Query Cache Management**: `useQueryClient` API reference

---

## ✅ Result

The Complete Flight page now has **fully functional optimistic updates** for invoice items:

- ✅ Items appear immediately when added
- ✅ Items disappear immediately when deleted
- ✅ Totals recalculate automatically
- ✅ Uses proper Decimal.js calculations
- ✅ Consistent with rest of application
- ✅ Great user experience with instant feedback

**No more waiting for API responses to see invoice changes!** 🎉

