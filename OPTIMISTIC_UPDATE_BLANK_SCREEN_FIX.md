# Optimistic Update Blank Screen Fix

## 🐛 Problem

When editing an invoice item (quantity or rate), the entire invoice div would go **blank** and require a page refresh to see the changes.

---

## 🔍 Root Cause

### **Issue 1: Manual Cache Reading**
The component was manually reading from the React Query cache using `queryClient.getQueryData()`:

```typescript
// ❌ Manual cache reading
const cachedInvoiceItems = invoiceId 
  ? (queryClient.getQueryData(checkInKeys.invoiceItems(invoiceId)) as any[] || null)
  : null;
```

**Problem**: When the cache is invalidated and refetched, there's a brief moment where the cache is empty or undefined, causing `invoiceItems = []` and a blank screen.

---

### **Issue 2: `invalidateQueries` vs `refetchQueries`**
The hook was using `invalidateQueries` which marks the cache as stale:

```typescript
// ❌ Invalidate causes blank screen during refetch
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: checkInKeys.invoiceItems(invoiceId) });
}
```

**Problem**: 
1. Optimistic update shows immediately ✅
2. API completes → `invalidateQueries` is called
3. Cache is marked stale and cleared
4. Component re-renders with empty cache → **blank screen** ❌
5. Background refetch completes
6. Component re-renders with data again

---

## ✅ Solution

### **Fix 1: Use `useQuery` Hook Instead of Manual Cache Reading**

Replaced manual cache reading with a proper `useQuery` hook:

```typescript
// ✅ Proper query hook with placeholder data
const { data: fetchedInvoiceItems, isLoading: itemsLoading } = useQuery({
  queryKey: checkInKeys.invoiceItems(invoiceId || ''),
  queryFn: async () => {
    if (!invoiceId) return [];
    
    const response = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
    if (!response.ok) throw new Error('Failed to fetch invoice items');
    const data = await response.json();
    return data.invoice_items || [];
  },
  enabled: !!invoiceId,
  staleTime: 0, // Always refetch to get latest
  placeholderData: (previousData) => previousData, // ✅ Keep previous data while refetching
});
```

**Benefits**:
- ✅ `placeholderData` keeps old data visible during refetch
- ✅ No blank screen during updates
- ✅ React Query manages loading states automatically

---

### **Fix 2: Use `refetchQueries` Instead of `invalidateQueries`**

Changed all `invalidateQueries` calls to `refetchQueries`:

```typescript
// ✅ Refetch in background (no loading state)
onSuccess: async (data, { invoiceId }) => {
  await queryClient.refetchQueries({ 
    queryKey: checkInKeys.invoiceItems(invoiceId),
    type: 'active' 
  });
}
```

**Benefits**:
- ✅ Refetches data in background
- ✅ Doesn't clear the cache first
- ✅ `placeholderData` keeps UI stable
- ✅ Smooth transition from optimistic → real data

---

## 🔄 Updated Data Flow

### **Before (Blank Screen Issue)**
```
1. User edits item → optimistic update (shows immediately) ✅
2. API completes → invalidateQueries()
3. Cache cleared → invoiceItems = [] → BLANK SCREEN ❌
4. Background refetch starts
5. Data returns → invoiceItems populated → shows again ✅
```

### **After (Smooth Updates)**
```
1. User edits item → optimistic update (shows immediately) ✅
2. API completes → refetchQueries()
3. useQuery keeps placeholderData → invoiceItems = [previous data] → NO BLANK SCREEN ✅
4. Background refetch completes
5. Data smoothly transitions optimistic → real ✅
```

---

## 🔧 Files Modified

### **1. `src/app/(auth)/dashboard/bookings/complete/[id]/BookingCompletionClient.tsx`**

**Before**:
```typescript
// ❌ Manual cache reading (no placeholder data)
const cachedInvoiceItems = invoiceId 
  ? (queryClient.getQueryData(checkInKeys.invoiceItems(invoiceId)) as any[] || null)
  : null;

const invoiceItems = cachedInvoiceItems || calculatedData?.invoiceItems || [];
```

**After**:
```typescript
// ✅ Proper useQuery hook with placeholderData
const { data: fetchedInvoiceItems, isLoading: itemsLoading } = useQuery({
  queryKey: checkInKeys.invoiceItems(invoiceId || ''),
  queryFn: async () => {
    if (!invoiceId) return [];
    const response = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
    if (!response.ok) throw new Error('Failed to fetch invoice items');
    const data = await response.json();
    return data.invoice_items || [];
  },
  enabled: !!invoiceId,
  staleTime: 0,
  placeholderData: (previousData) => previousData, // ✅ Key fix!
});

const invoiceItems = fetchedInvoiceItems || calculatedData?.invoiceItems || [];
```

---

### **2. `src/hooks/use-invoice-items.ts`**

**Before**:
```typescript
// ❌ invalidateQueries clears cache
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: checkInKeys.invoiceItems(invoiceId) });
}
```

**After**:
```typescript
// ✅ refetchQueries keeps data during refetch
onSuccess: async () => {
  await queryClient.refetchQueries({ 
    queryKey: checkInKeys.invoiceItems(invoiceId),
    type: 'active' 
  });
}
```

**Applied to all 3 mutations**:
- ✅ `addItemMutation.onSuccess`
- ✅ `updateItemMutation.onSuccess`
- ✅ `deleteItemMutation.onSuccess`

---

## 🧪 Test Scenarios

### **Test 1: Edit Item Quantity**
```
1. Click Edit on "Landing Fee - NZPP"
2. Change quantity from 1 → 2
3. Click Save

Expected:
  ✅ Item updates to quantity 2 immediately (optimistic)
  ✅ Total updates from $20.00 → $40.00 immediately
  ✅ NO blank screen during API call
  ✅ Values confirmed after API response
```

### **Test 2: Edit Item Rate**
```
1. Click Edit on "Landing Fee - NZPP"
2. Change rate from $20.00 → $25.00
3. Click Save

Expected:
  ✅ Item updates to $25.00 immediately (optimistic)
  ✅ Total updates to $25.00 immediately
  ✅ NO blank screen during API call
  ✅ Backend recalculates correctly (17.39 → 21.74 excl. tax)
```

### **Test 3: Add New Item**
```
1. Select "Landing Fees" tab
2. Choose an aerodrome
3. Click Add

Expected:
  ✅ Item appears immediately (optimistic)
  ✅ Total updates immediately
  ✅ NO blank screen during API call
```

### **Test 4: Delete Item**
```
1. Click Delete on an item
2. Item should disappear

Expected:
  ✅ Item disappears immediately (optimistic)
  ✅ Total updates immediately
  ✅ NO blank screen during API call
```

---

## 🎯 Key Changes

### **1. Placeholder Data** ✅
```typescript
placeholderData: (previousData) => previousData
```
- Keeps previous data visible during refetch
- Prevents blank screen
- Smooth user experience

### **2. Background Refetch** ✅
```typescript
refetchQueries({ queryKey: ..., type: 'active' })
```
- Refetches without clearing cache first
- Updates data in background
- No loading states or blank screens

### **3. Proper Query Hook** ✅
```typescript
useQuery({ queryKey, queryFn, enabled, staleTime, placeholderData })
```
- Handles loading states automatically
- Integrates with optimistic updates
- Standard React Query pattern

---

## ✅ Result

The invoice div now has **smooth, dynamic, optimistic updates** with:

- ✅ **Add items** → appears instantly, no blank screen
- ✅ **Edit items** → updates instantly, no blank screen
- ✅ **Delete items** → removes instantly, no blank screen
- ✅ **Totals** → recalculate instantly
- ✅ **Background validation** → server confirms changes seamlessly

**No more blank screens or page refreshes needed!** 🎉

---

## 📚 React Query Best Practices Applied

1. ✅ **Use `useQuery` for reading data** (not manual `getQueryData`)
2. ✅ **Use `placeholderData`** to prevent blank states during refetch
3. ✅ **Use `refetchQueries`** instead of `invalidateQueries` when you want smooth updates
4. ✅ **Optimistic updates in `onMutate`** for instant feedback
5. ✅ **Error rollback in `onError`** for resilience

**The Complete Flight page now follows React Query best practices!** ✅

