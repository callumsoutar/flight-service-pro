# Invoice Calculation Standardization - Complete Flight Page

## 📋 Summary

All invoice and invoice_items calculations in the **Complete Flight** page now match the logic used in `InvoiceEditClient.tsx` and `invoice-service.ts`. This ensures:

- ✅ **Currency-safe arithmetic** using `Decimal.js` throughout
- ✅ **Consistent rounding** to 2 decimal places using `roundToTwoDecimals()`
- ✅ **Tax calculations** properly applied via `InvoiceService.calculateItemAmounts()`
- ✅ **No hardcoded multipliers** (removed `0.15`, `1.15`, etc.)
- ✅ **Unified calculation patterns** across all invoice management interfaces

---

## 🔧 Changes Made

### 1. **`src/hooks/use-invoice-items.ts`** - Invoice Item Hook
**Status**: ✅ Refactored

#### Before (Hardcoded Tax Calculations):
```typescript
// ❌ Hardcoded tax rate and manual calculations
const optimisticItem: InvoiceItem = {
  amount: quantity * item.rate,
  tax_rate: 0.15, // Hardcoded
  tax_amount: quantity * item.rate * 0.15, // Manual calc
  line_total: quantity * item.rate * 1.15, // Manual calc
  // ...
};
```

#### After (InvoiceCalculations with Decimal.js):
```typescript
// ✅ Currency-safe calculations using InvoiceCalculations
const calculatedAmounts = InvoiceCalculations.calculateItemAmounts({
  quantity,
  unit_price: item.rate,
  tax_rate: taxRate // Passed in from parent
});

const optimisticItem: InvoiceItem = {
  amount: calculatedAmounts.amount,
  tax_rate: taxRate,
  tax_amount: calculatedAmounts.tax_amount,
  line_total: calculatedAmounts.line_total,
  rate_inclusive: calculatedAmounts.rate_inclusive,
  // ...
};
```

#### Key Improvements:
- **Added `taxRate` parameter** to `AddItemParams` interface (required)
- **Added `taxRate` parameter** to `UpdateItemParams` interface (optional)
- **Replaced all manual calculations** with `InvoiceCalculations.calculateItemAmounts()`
- **Removed hardcoded `0.15` and `1.15`** multipliers
- **Added tax_rate to API calls** in both `addItemMutation` and `updateItemMutation`

---

### 2. **`src/app/(auth)/dashboard/bookings/complete/[id]/BookingCompletionClient.tsx`** - Client Component
**Status**: ✅ Updated

#### Changes:
- **`handleAddChargeable`**: Now passes `taxRate` based on `item.is_taxable`
- **`handleAddLandingFee`**: Now passes `taxRate` based on `item.is_taxable`

```typescript
// ✅ Tax rate determined by chargeable's is_taxable flag
const handleAddChargeable = useCallback((item: Chargeable, quantity: number) => {
  if (!invoiceId) return;
  const effectiveTaxRate = item.is_taxable ? taxRate : 0;
  addItem({ invoiceId, item, quantity, taxRate: effectiveTaxRate });
}, [invoiceId, addItem, taxRate]);
```

This matches the pattern in `InvoiceEditClient.tsx` where tax-exempt chargeables get `taxRate: 0`.

---

### 3. **`src/components/bookings/InvoicePreviewCard.tsx`** - Display Component
**Status**: ✅ Refactored

#### Before (Direct `.toFixed(2)`):
```typescript
// ❌ No rounding consistency
<td>${(item.rate_inclusive || item.unit_price).toFixed(2)}</td>
<td>${item.line_total.toFixed(2)}</td>
<span>${subtotal.toFixed(2)}</span>
```

#### After (With `roundToTwoDecimals`):
```typescript
// ✅ Consistent rounding using roundToTwoDecimals()
import { roundToTwoDecimals } from "@/lib/utils";

<td>${roundToTwoDecimals(item.rate_inclusive || item.unit_price).toFixed(2)}</td>
<td>${roundToTwoDecimals(item.line_total).toFixed(2)}</td>
<span>${roundToTwoDecimals(subtotal).toFixed(2)}</span>
<span>${roundToTwoDecimals(tax).toFixed(2)}</span>
<span>${roundToTwoDecimals(total).toFixed(2)}</span>
```

This ensures displayed amounts match the backend's rounding behavior.

---

### 4. **`src/app/api/bookings/[id]/complete-flight/route.ts`** - Backend API
**Status**: ✅ Refactored

#### Changes to `handleComplete` function:

**Before (Raw Value Passthrough)**:
```typescript
// ❌ Passing through raw values from frontend
await supabase.from('invoice_items').update({
  quantity: item.quantity,
  unit_price: item.unit_price,
  rate_inclusive: item.rate_inclusive,
  amount: item.amount, // Untrusted
  tax_rate: item.tax_rate,
  tax_amount: item.tax_amount, // Untrusted
  line_total: item.line_total, // Untrusted
  // ...
});
```

**After (Server-Side Recalculation)**:
```typescript
// ✅ Recalculate using InvoiceService for currency-safe calculations
const calculatedAmounts = InvoiceService.calculateItemAmounts({
  quantity: item.quantity,
  unit_price: item.unit_price,
  tax_rate: item.tax_rate || 0
});

await supabase.from('invoice_items').update({
  quantity: item.quantity,
  unit_price: item.unit_price,
  tax_rate: item.tax_rate,
  description: item.description,
  chargeable_id: item.chargeable_id || null,
  // Use calculated values from InvoiceService (Decimal.js + proper rounding)
  amount: calculatedAmounts.amount,
  tax_amount: calculatedAmounts.tax_amount,
  line_total: calculatedAmounts.line_total,
  rate_inclusive: calculatedAmounts.rate_inclusive,
});
```

#### Changes to `handleCalculate` function:

**Before (Manual Summation)**:
```typescript
// ❌ Manual summation without InvoiceService
const subtotal = updatedItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
const tax = updatedItems?.reduce((sum, item) => sum + item.tax_amount, 0) || 0;
const total = updatedItems?.reduce((sum, item) => sum + item.line_total, 0) || 0;
```

**After (InvoiceService Totals)**:
```typescript
// ✅ Use InvoiceService for consistent totals calculation with proper rounding
const totals = InvoiceService.calculateInvoiceTotals(updatedItems || []);

return NextResponse.json({
  // ...
  totals: {
    subtotal: totals.subtotal,
    tax: totals.tax_total,
    total: totals.total_amount
  },
});
```

**Key Security & Consistency Improvements**:
- **Never trust client-calculated amounts** - always recalculate on server
- **Use `InvoiceService.calculateItemAmounts()`** for all item-level calculations
- **Use `InvoiceService.calculateInvoiceTotals()`** for invoice-level totals
- **Consistent Decimal.js arithmetic** throughout

---

## 🔄 Calculation Flow Comparison

### **InvoiceEditClient.tsx** (Reference Implementation)
```typescript
// 1. User adds/edits item
// 2. Call InvoiceCalculations.calculateItemAmounts() client-side (optimistic)
const calculatedAmounts = InvoiceCalculations.calculateItemAmounts({
  quantity,
  unit_price: item.rate,
  tax_rate: organizationTaxRate
});

// 3. Send to API with tax_rate
await fetch("/api/invoice_items", {
  method: "POST",
  body: JSON.stringify({
    // ... quantity, unit_price, tax_rate
  })
});

// 4. API recalculates using InvoiceService.calculateItemAmounts()
// 5. API updates totals using InvoiceService.updateInvoiceTotalsWithTransactionSync()
```

### **Complete Flight Page** (Now Matches!)
```typescript
// 1. User calculates charges (handleCalculate)
//    - Backend uses InvoiceService.calculateItemAmounts() for each item
//    - Backend uses InvoiceService.calculateInvoiceTotals() for totals

// 2. User adds chargeable
//    - Client calls useInvoiceItems.addItem({ ..., taxRate })
//    - Hook uses InvoiceCalculations.calculateItemAmounts() (optimistic)
//    - API receives tax_rate and recalculates with InvoiceService.calculateItemAmounts()

// 3. User completes flight (handleComplete)
//    - Backend recalculates ALL items using InvoiceService.calculateItemAmounts()
//    - Backend updates totals using InvoiceService.updateInvoiceTotalsWithTransactionSync()
```

✅ **Both flows now use identical calculation logic!**

---

## 📊 Tax Rate Handling

### **Organization Tax Rate**
- Fetched via `useOrganizationTaxRate()` hook
- Used for **taxable** chargeables

### **Tax-Exempt Items**
- Chargeables with `is_taxable: false` use `taxRate: 0`
- Properly handled in both `handleAddChargeable` and `handleAddLandingFee`

### **Invoice-Specific Tax Rate**
- Invoice stores `tax_rate` at creation time
- All items on that invoice use the same tax rate (for consistency)
- Matches logic in `InvoiceEditClient.tsx` and `/api/invoice_items` endpoint

---

## 🧪 Testing Checklist

### ✅ Item Calculations
- [x] Aircraft time charges (dual time)
- [x] Instructor charges
- [x] Solo continuation charges
- [x] Landing fees (taxable & tax-exempt)
- [x] Airways fees
- [x] Other chargeables

### ✅ Totals Calculations
- [x] Subtotal matches sum of item amounts
- [x] Tax total matches sum of item tax_amounts
- [x] Total matches subtotal + tax

### ✅ Rounding Consistency
- [x] All displayed amounts use `roundToTwoDecimals()`
- [x] Backend calculations use `Decimal.js` via `InvoiceService`
- [x] Optimistic updates use `InvoiceCalculations` (client-safe)

### ✅ Tax Rate Application
- [x] Taxable items apply organization tax rate
- [x] Tax-exempt items use `taxRate: 0`
- [x] Invoice stores `tax_rate` at creation

### ✅ API Consistency
- [x] `POST /api/invoice_items` recalculates on server
- [x] `PATCH /api/invoice_items` recalculates on server
- [x] `POST /api/bookings/[id]/complete-flight` (calculate) uses InvoiceService
- [x] `POST /api/bookings/[id]/complete-flight` (complete) recalculates all items

---

## 📚 Related Files

### **Calculation Libraries**
- `src/lib/invoice-service.ts` - Server-side calculations (Decimal.js + Supabase)
- `src/lib/invoice-calculations.ts` - Client-side calculations (Decimal.js only)
- `src/lib/utils.ts` - Contains `roundToTwoDecimals()` utility

### **API Endpoints**
- `src/app/api/invoice_items/route.ts` - CRUD for invoice items
- `src/app/api/bookings/[id]/complete-flight/route.ts` - Complete flight workflow

### **UI Components**
- `src/app/(auth)/dashboard/bookings/complete/[id]/BookingCompletionClient.tsx`
- `src/components/bookings/InvoicePreviewCard.tsx`
- `src/components/bookings/MeterReadingCard.tsx`
- `src/app/(auth)/dashboard/invoices/edit/[id]/InvoiceEditClient.tsx` (reference)

### **Hooks**
- `src/hooks/use-invoice-items.ts` - Invoice item CRUD mutations
- `src/hooks/use-booking-completion.ts` - Complete flight workflow
- `src/hooks/use-tax-rate.ts` - Organization tax rate fetching

---

## 🎯 Key Principles Applied

1. **Never trust client calculations** - Always recalculate on server
2. **Use Decimal.js for all currency math** - Avoid floating-point errors
3. **Apply consistent rounding** - `roundToTwoDecimals()` everywhere
4. **Single source of truth** - `InvoiceService` / `InvoiceCalculations`
5. **Tax rate flexibility** - Support both taxable and tax-exempt items
6. **Match existing patterns** - Consistency with `InvoiceEditClient.tsx`

---

## ✅ Completion Status

All 6 tasks completed:

1. ✅ Audited complete-flight API route for InvoiceService usage
2. ✅ Fixed use-invoice-items.ts hardcoded tax calculations
3. ✅ Updated InvoicePreviewCard.tsx with roundToTwoDecimals()
4. ✅ Fixed handleComplete to recalculate items server-side
5. ✅ Added taxRate parameter to addItem calls
6. ✅ Verified calculations match InvoiceEditClient pattern

---

## 🚀 Result

The **Complete Flight** page now has **enterprise-grade invoice calculations** that:

- ✅ Match the reference implementation in `InvoiceEditClient.tsx`
- ✅ Use currency-safe arithmetic (Decimal.js)
- ✅ Apply consistent rounding (roundToTwoDecimals)
- ✅ Never trust client-side calculations
- ✅ Support tax-exempt items correctly
- ✅ Follow single-tenant architecture principles

**No discrepancies in calculations between the Complete Flight page and Invoice Edit page!** 🎉

