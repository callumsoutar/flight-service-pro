# Existing Invoice Data Display Fix

## 🐛 **Issue**

When opening the booking completion page (`/dashboard/bookings/complete/[id]`), if an invoice and invoice items already existed from a previous "Calculate" action, they were **not being displayed** in the UI.

The page appeared blank/empty even though the data existed in the database.

---

## 🔍 **Root Cause**

The issue was in the data fetching and initialization flow:

### **Problem 1: Server Component Not Fetching Invoice Data**

**File**: `src/app/(auth)/dashboard/bookings/complete/[id]/page.tsx`

The server component was only fetching:
- ✅ Booking data
- ✅ Aircraft data
- ✅ Flight types
- ✅ Instructors
- ✅ Rates

But **NOT fetching**:
- ❌ Existing invoice
- ❌ Existing invoice items

### **Problem 2: Client Component Had No Initial Data**

**File**: `src/app/(auth)/dashboard/bookings/complete/[id]/BookingCompletionClient.tsx`

The client component's `calculatedData` state was only populated when:
- User clicks "Calculate Charges" button
- New data comes back from the API

It had **no logic** to initialize with existing data on mount.

---

## ✅ **The Fix**

### **1. Server Component - Fetch Existing Data**

Added queries to fetch existing invoice and invoice items:

```typescript
// Fetch existing invoice and invoice items (if any)
const { data: existingInvoice } = await supabase
  .from("invoices")
  .select("*")
  .eq("booking_id", bookingId)
  .maybeSingle();

let existingInvoiceItems = [];
if (existingInvoice) {
  const { data: itemsData } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", existingInvoice.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  
  existingInvoiceItems = itemsData || [];
}

// Calculate totals from existing items
const existingTotals = existingInvoiceItems.length > 0 ? {
  subtotal: existingInvoiceItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0),
  tax: existingInvoiceItems.reduce((sum: number, item: any) => sum + (item.tax_amount || 0), 0),
  total: existingInvoiceItems.reduce((sum: number, item: any) => sum + (item.line_total || 0), 0),
} : null;
```

Pass these as props to client component:

```typescript
<BookingCompletionClient
  // ... existing props
  existingInvoice={existingInvoice || null}
  existingInvoiceItems={existingInvoiceItems}
  existingTotals={existingTotals}
/>
```

---

### **2. Client Component - Initialize State with Existing Data**

Added `useEffect` to initialize `calculatedData` on mount:

```typescript
// Initialize with existing invoice data on mount
useEffect(() => {
  if (existingInvoice && existingInvoiceItems.length > 0 && !calculatedData) {
    initializeWithExistingData({
      booking,
      invoice: existingInvoice,
      invoiceItems: existingInvoiceItems,
      totals: existingTotals || { subtotal: 0, tax: 0, total: 0 },
      flightLog: booking.flight_logs?.[0],
      aircraft,
    });
  }
}, [existingInvoice, existingInvoiceItems, existingTotals, calculatedData, initializeWithExistingData, booking, aircraft]);
```

---

### **3. Hook - Add Initialization Function**

Added `initializeWithExistingData` function to `useBookingCompletion` hook:

```typescript
return {
  // Actions
  calculateCharges: calculateMutation.mutate,
  completeBooking: completeMutation.mutate,
  initializeWithExistingData: (data: CalculatedData) => setCalculatedData(data), // ✅ New
  
  // ... rest of hook
};
```

---

## 🎯 **How It Works Now**

### **Flow 1: First Visit (No Invoice Yet)**
1. User opens `/dashboard/bookings/complete/[id]`
2. Server fetches booking, aircraft, rates
3. Server finds **no existing invoice** → passes `null`
4. Client component renders with empty invoice preview
5. User enters meter readings and clicks "Calculate"
6. API creates invoice + items
7. Data displayed ✅

### **Flow 2: Return Visit (Invoice Already Exists)**
1. User opens `/dashboard/bookings/complete/[id]`
2. Server fetches booking, aircraft, rates
3. Server **finds existing invoice + items** ✅
4. Server calculates totals from items
5. Server passes invoice data as props to client
6. Client component initializes `calculatedData` with existing data
7. **Invoice items displayed immediately** ✅

### **Flow 3: Recalculate (Modify Existing Invoice)**
1. User opens page → existing invoice displayed
2. User changes meter readings and clicks "Calculate"
3. API updates invoice items with new calculations
4. New data overwrites `calculatedData` state
5. Updated invoice displayed ✅

---

## 📊 **Data Flow Diagram**

```
Server Component (page.tsx)
  │
  ├─ Fetch booking ✅
  ├─ Fetch aircraft ✅
  ├─ Fetch flight types ✅
  ├─ Fetch instructors ✅
  ├─ Fetch rates ✅
  ├─ Fetch existing invoice ✅ (NEW)
  └─ Fetch existing invoice items ✅ (NEW)
  │
  │ Props passed to client ▼
  │
Client Component (BookingCompletionClient.tsx)
  │
  ├─ useEffect on mount
  │    │
  │    ├─ Check if existing invoice/items exist
  │    │
  │    └─ If yes → initializeWithExistingData()
  │         └─ Sets calculatedData state
  │
  ├─ Display InvoicePreviewCard
  │    └─ Shows invoice items from calculatedData ✅
  │
  └─ User can:
       ├─ View existing items ✅
       ├─ Add more items (chargeables, landing fees) ✅
       ├─ Delete items ✅
       ├─ Recalculate (overwrites calculatedData) ✅
       └─ Complete booking ✅
```

---

## 🧪 **Testing**

To verify the fix:

1. **Create a booking and calculate charges:**
   ```
   1. Navigate to /dashboard/bookings/complete/[id]
   2. Enter meter readings
   3. Click "Calculate Charges"
   4. Verify invoice items appear
   5. DO NOT complete the booking yet
   ```

2. **Close and reopen the page:**
   ```
   1. Navigate away (e.g., back to bookings list)
   2. Return to /dashboard/bookings/complete/[id]
   3. ✅ Invoice items should still be visible
   4. ✅ Totals should be displayed
   5. ✅ "Complete Flight" button should be enabled
   ```

3. **Verify can modify existing invoice:**
   ```
   1. With existing invoice displayed
   2. Add a chargeable item
   3. Verify it appears in the list
   4. Delete an item
   5. Verify it's removed
   6. Complete the booking
   7. Verify success
   ```

---

## ✅ **Files Changed**

1. **`src/app/(auth)/dashboard/bookings/complete/[id]/page.tsx`**
   - Added invoice fetching
   - Added invoice items fetching
   - Added totals calculation
   - Passed new props to client component

2. **`src/app/(auth)/dashboard/bookings/complete/[id]/BookingCompletionClient.tsx`**
   - Added new props to interface
   - Added `useEffect` to initialize with existing data
   - Called `initializeWithExistingData` on mount

3. **`src/hooks/use-booking-completion.ts`**
   - Added `initializeWithExistingData` function
   - Exposed function in return object

---

## 🎉 **Result**

- ✅ Existing invoice data now loads on page open
- ✅ Users can see previously calculated charges
- ✅ Users can modify existing invoices (add/delete items)
- ✅ Users can recalculate if needed
- ✅ Consistent with old check-in page behavior
- ✅ No data loss when navigating away and back

---

**Consistent with old check-in flow where invoice data was always visible!**

