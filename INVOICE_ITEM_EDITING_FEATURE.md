# Invoice Item Editing - Complete Flight Page

## ✅ Feature Added

Users can now **edit the quantity and rate** of invoice items directly in the Complete Flight page, matching the functionality in `InvoiceEditClient.tsx`.

---

## 🎯 What Changed

### **1. InvoicePreviewCard Component**

Added inline editing with the same UX as the Invoice Edit page:

#### **New State Management**
```typescript
const [editingItemId, setEditingItemId] = useState<string | null>(null);
const [editRate, setEditRate] = useState<number>(0);
const [editQuantity, setEditQuantity] = useState<number>(1);
```

#### **New Functions**
```typescript
// Start editing an item
const startEditItem = (item: InvoiceItem) => {
  setEditingItemId(item.id);
  setEditRate(item.rate_inclusive || item.unit_price); // Tax-inclusive display
  setEditQuantity(item.quantity);
};

// Cancel editing
const cancelEditItem = () => {
  setEditingItemId(null);
};

// Save edited item
const saveEditItem = (item: InvoiceItem) => {
  // Convert tax-inclusive rate back to tax-exclusive unit_price
  const itemTaxRate = item.tax_rate || taxRate;
  const taxExclusiveUnitPrice = editRate / (1 + itemTaxRate);
  
  onUpdateItem(item.id, {
    quantity: editQuantity,
    unit_price: taxExclusiveUnitPrice,
  });
  
  setEditingItemId(null);
};
```

#### **Updated Table UI**
```typescript
{/* Quantity Column - Editable */}
{editingItemId === item.id ? (
  <input
    type="number"
    className="border rounded px-1 py-1 text-center w-14 font-mono"
    value={editQuantity}
    min={0.1}
    step={0.1}
    onChange={e => setEditQuantity(Number(e.target.value))}
    disabled={isUpdating}
  />
) : (
  <span className="font-mono">{item.quantity}</span>
)}

{/* Rate Column - Editable (Tax-Inclusive Display) */}
{editingItemId === item.id ? (
  <input
    type="number"
    className="border rounded px-2 py-1 text-right w-20 font-mono"
    value={editRate}
    min={0}
    step={0.01}
    onChange={e => setEditRate(Number(e.target.value))}
    disabled={isUpdating}
  />
) : (
  <span className="font-mono">
    ${roundToTwoDecimals(item.rate_inclusive || item.unit_price).toFixed(2)}
  </span>
)}

{/* Actions Column - Edit/Delete or Save/Cancel */}
{editingItemId === item.id ? (
  <>
    <Button onClick={() => saveEditItem(item)}>
      <Check className="h-4 w-4" />
    </Button>
    <Button onClick={cancelEditItem}>
      <X className="h-4 w-4" />
    </Button>
  </>
) : (
  <>
    <Button onClick={() => startEditItem(item)}>
      <Pencil className="h-4 w-4" />
    </Button>
    <Button onClick={() => onDeleteItem(item.id)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </>
)}
```

---

### **2. BookingCompletionClient Component**

#### **Added `updateItem` Hook**
```typescript
const {
  addItem,
  updateItem,    // ✅ Added
  deleteItem,
  isDeleting,
  isUpdating,    // ✅ Added
} = useInvoiceItems(invoiceId || null);
```

#### **New Handler Function**
```typescript
const handleUpdateItem = useCallback((itemId: string, updates: { quantity: number; unit_price: number }) => {
  if (!invoiceId) return;
  updateItem({ 
    itemId, 
    updates,
    taxRate // Pass taxRate for optimistic update calculations
  });
}, [invoiceId, updateItem, taxRate]);
```

#### **Passed to InvoicePreviewCard**
```typescript
<InvoicePreviewCard
  // ... existing props
  onUpdateItem={handleUpdateItem}  // ✅ Added
  isUpdating={isUpdating}           // ✅ Added
/>
```

---

## 🔄 Data Flow

### **When User Edits an Item**

```
1. User clicks Edit button (Pencil icon)
   └─> startEditItem(item)
   └─> State: editingItemId = item.id, editRate = 20.00 (tax-inclusive), editQuantity = 1

2. User changes quantity to 2 and rate to $25.00
   └─> State updates in real-time

3. User clicks Save button (Check icon)
   └─> saveEditItem(item)
   └─> Convert $25.00 (tax-inclusive) → $21.74 (tax-exclusive, assuming 15% tax)
   └─> onUpdateItem(itemId, { quantity: 2, unit_price: 21.74 })

4. BookingCompletionClient.handleUpdateItem()
   └─> updateItem({ itemId, updates: { quantity: 2, unit_price: 21.74 }, taxRate: 0.15 })

5. useInvoiceItems hook (onMutate)
   └─> Optimistic update: Recalculate using InvoiceCalculations
   └─> amount = 2 × 21.74 = 43.48
   └─> tax_amount = 43.48 × 0.15 = 6.52
   └─> line_total = 43.48 + 6.52 = 50.00 ✅
   └─> Update React Query cache immediately

6. Component re-renders
   └─> cachedInvoiceItems now includes updated item
   └─> totals recalculate with useMemo
   └─> User sees new values INSTANTLY ✅

7. API request completes
   └─> PATCH /api/invoice_items
   └─> Backend recalculates with InvoiceService (server-side validation)
   └─> Cache invalidated and refetched for accuracy
```

---

## 💡 Key Features

### **1. Tax-Inclusive Display** ✅
- User edits the **tax-inclusive rate** (what they see)
- Component converts to **tax-exclusive** for backend
- Backend recalculates all amounts consistently

**Example**:
```
User enters: $20.00 (tax-inclusive)
Tax rate: 15%
Backend receives: $17.39 (tax-exclusive)
Backend calculates:
  - amount = $17.39
  - tax_amount = $2.61
  - line_total = $20.00 ✅
```

### **2. Optimistic Updates** ✅
- Changes appear **immediately** in the UI
- Uses `InvoiceCalculations` for client-side preview
- Backend validates and corrects if needed

### **3. Consistent Calculations** ✅
- Uses same rounding logic (2 decimals)
- Matches `InvoiceEditClient.tsx` behavior
- Server-side recalculation ensures accuracy

### **4. UX Consistency** ✅
- Same icons (Pencil, Check, X, Trash)
- Same button styling and hover states
- Same input field styling
- Disabled during updates (loading state)

---

## 🧪 Example Usage

### **Scenario: Edit Landing Fee**

**Before Edit**:
```
Description: Landing Fee - NZPP
Quantity: 1
Rate (incl. tax): $20.00
Total: $20.00
```

**User Actions**:
1. Click **Edit** button (pencil icon)
2. Change quantity to **2**
3. Change rate to **$25.00**
4. Click **Save** button (check icon)

**After Edit** (Optimistic Update):
```
Description: Landing Fee - NZPP
Quantity: 2
Rate (incl. tax): $25.00
Total: $50.00  ← Updated immediately!
```

**Backend Calculation** (Server Validation):
```
Tax-exclusive unit_price: $25.00 / 1.15 = $21.74
amount: 2 × $21.74 = $43.48
tax_amount: $43.48 × 0.15 = $6.52
line_total: $43.48 + $6.52 = $50.00 ✅
```

---

## 📋 Files Modified

### **1. `src/components/bookings/InvoicePreviewCard.tsx`**
- Added `Pencil`, `Check`, `X` icons to imports
- Added `tax_rate` to `InvoiceItem` interface
- Added `onUpdateItem` and `isUpdating` to props
- Added state for editing (editingItemId, editRate, editQuantity)
- Added `startEditItem`, `cancelEditItem`, `saveEditItem` functions
- Updated table to show input fields when editing
- Updated table header to say "Rate (incl. tax)"
- Added Edit/Save/Cancel buttons in Actions column

### **2. `src/app/(auth)/dashboard/bookings/complete/[id]/BookingCompletionClient.tsx`**
- Destructured `updateItem` and `isUpdating` from `useInvoiceItems`
- Added `handleUpdateItem` callback function
- Passed `onUpdateItem` and `isUpdating` to `InvoicePreviewCard`

---

## ✅ Consistency Checks

| Feature | InvoiceEditClient | Complete Flight Page | Status |
|---------|-------------------|----------------------|--------|
| Edit quantity | ✅ | ✅ | ✅ Match |
| Edit rate (tax-inclusive) | ✅ | ✅ | ✅ Match |
| Convert to tax-exclusive | ✅ | ✅ | ✅ Match |
| Optimistic updates | ✅ | ✅ | ✅ Match |
| Save/Cancel buttons | ✅ | ✅ | ✅ Match |
| Loading state (disabled) | ✅ | ✅ | ✅ Match |
| Uses InvoiceCalculations | ✅ | ✅ | ✅ Match |
| Server-side recalculation | ✅ | ✅ | ✅ Match |
| 2-decimal rounding | ✅ | ✅ | ✅ Match |

**Perfect consistency with InvoiceEditClient!** ✅

---

## 🎨 UI Design

### **Normal State** (Not Editing)
```
┌─────────────────────────────────────────────────────────┐
│ Description          │ Qty │  Rate   │  Total  │ Actions│
├─────────────────────────────────────────────────────────┤
│ Landing Fee - NZPP   │  1  │ $20.00  │ $20.00  │ ✏️ 🗑️  │
└─────────────────────────────────────────────────────────┘
```

### **Editing State**
```
┌─────────────────────────────────────────────────────────┐
│ Description          │  Qty  │   Rate    │ Total │ Actions│
├─────────────────────────────────────────────────────────┤
│ Landing Fee - NZPP   │ [_1_] │ [_20.00_] │$20.00 │ ✓ ✗   │
└─────────────────────────────────────────────────────────┘
           ↑ editable      ↑ editable              ↑ Save Cancel
```

---

## 🚀 Benefits

### **1. User Efficiency** ✅
- No need to delete and re-add items
- Edit in-place for quick corrections
- Instant visual feedback

### **2. Accurate Invoicing** ✅
- Tax calculations handled automatically
- Backend validation ensures correctness
- Consistent 2-decimal rounding

### **3. Professional UX** ✅
- Matches industry-standard editing patterns
- Clear visual states (view vs. edit)
- Intuitive icons and button placement

### **4. Maintainability** ✅
- Reuses existing `useInvoiceItems` hook
- Same logic as `InvoiceEditClient`
- No code duplication

---

## 🎉 Result

Users can now **fully manage invoice items** in the Complete Flight page:

- ✅ Add items (chargeables, landing fees)
- ✅ **Edit quantity and rate** ← NEW!
- ✅ Delete items
- ✅ See optimistic updates immediately
- ✅ All calculations are consistent and accurate

**The Complete Flight page now has feature parity with the Invoice Edit page!** 🚀

