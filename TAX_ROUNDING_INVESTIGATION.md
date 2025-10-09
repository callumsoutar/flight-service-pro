# Tax Calculation & Rounding Investigation

## 🔍 Problem Statement

A landing fee with a base rate of **$17.39** (excl. tax) + **15% tax** should result in:
- **Rate inclusive**: $17.39 × 1.15 = **$20.00** (stored correctly ✅)
- **Line total**: $17.39 + ($17.39 × 0.15) = **$19.9985** (stored as-is ❌)

The issue: `line_total = 19.9985` is stored with 4 decimal places, but should be rounded to **$20.00** for payment purposes.

---

## 📊 Database Analysis

### Invoice: `86708160-a9c5-4bd7-a8c4-71ee32f6acd1`

#### Item 1: Aircraft Charge
```json
{
  "description": "Dual Aero Club Dual - ZK-KAZ",
  "quantity": "1.1",
  "unit_price": "295.6521739130435",
  "amount": "325.22",              // 1.1 × 295.65 = 325.217... → stored as 325.22
  "tax_amount": "48.7826087",      // 325.22 × 0.15 = 48.783 → stored as 48.7826087
  "line_total": "374",             // 325.22 + 48.78 = 374.00 → stored as 374
  "rate_inclusive": "340.00"       // 295.65 × 1.15 = 340.00
}
```

#### Item 2: Instructor Charge
```json
{
  "description": "Dual Aero Club Dual - Callum Soutar",
  "quantity": "1.1",
  "unit_price": "82.60869565217392",
  "amount": "90.87",               // 1.1 × 82.61 = 90.869... → stored as 90.87
  "tax_amount": "13.63043478",     // 90.87 × 0.15 = 13.6305 → stored as 13.63043478
  "line_total": "104.5",           // 90.87 + 13.63 = 104.50 → stored as 104.5
  "rate_inclusive": "95.00"        // 82.61 × 1.15 = 95.00
}
```

#### Item 3: Landing Fee (The Problem)
```json
{
  "description": "Landing Fee - NZPP Landing Fee",
  "quantity": "1",
  "unit_price": "17.39",
  "amount": "17.39",               // 1 × 17.39 = 17.39 ✅
  "tax_amount": "2.6085",          // 17.39 × 0.15 = 2.6085 ✅
  "line_total": "19.9985",         // 17.39 + 2.6085 = 19.9985 ❌ (should be 20.00)
  "rate_inclusive": "20.00"        // 17.39 × 1.15 = 20.0 ✅
}
```

#### Invoice Totals
```json
{
  "subtotal": "433.48",            // Sum of amounts
  "tax_total": "65.02154348",      // Sum of tax_amounts (not rounded!)
  "total_amount": "498.4985"       // subtotal + tax_total (not rounded!)
}
```

---

## 🐛 Root Causes

### **1. Individual Item Calculations (Not Rounding)**

**Current Logic** in `InvoiceService.calculateItemAmounts()`:
```typescript
const amount = quantity.mul(unitPrice);           // Decimal.js (precise)
const taxAmount = amount.mul(taxRate);            // Decimal.js (precise)
const lineTotal = amount.add(taxAmount);          // Decimal.js (precise)
const rateInclusive = unitPrice.mul(taxRate.add(1)); // Decimal.js (precise)

return {
  amount: amount.toNumber(),                      // ❌ No rounding
  tax_amount: taxAmount.toNumber(),               // ❌ No rounding
  line_total: lineTotal.toNumber(),               // ❌ No rounding
  rate_inclusive: rateInclusive.toNumber()        // ❌ No rounding
};
```

**Problem**: Precise decimal calculations result in values like `19.9985`, `2.6085`, etc.

---

### **2. Invoice Totals (Only Rounding at End)**

**Current Logic** in `InvoiceService.calculateInvoiceTotals()`:
```typescript
let subtotal = new Decimal(0);
let taxTotal = new Decimal(0);

for (const item of items) {
  subtotal = subtotal.add(item.amount);         // ❌ Adding un-rounded amounts
  taxTotal = taxTotal.add(item.tax_amount);     // ❌ Adding un-rounded tax_amounts
}

const totalAmount = subtotal.add(taxTotal);

return {
  subtotal: roundToTwoDecimals(subtotal.toNumber()),      // ✅ Rounds at end
  tax_total: roundToTwoDecimals(taxTotal.toNumber()),     // ✅ Rounds at end
  total_amount: roundToTwoDecimals(totalAmount.toNumber()) // ✅ Rounds at end
};
```

**Problem**: 
- Summing un-rounded values gives precise totals
- Final rounding can cause **discrepancies** between invoice total and sum of displayed line items

**Example**:
```
Item 1: line_total = 19.9985  (displays as $19.99 or $20.00?)
Item 2: line_total = 10.9985  (displays as $10.99 or $11.00?)
---
Sum of displayed = $30.99 or $31.00 (depending on display rounding)
Database total   = roundToTwoDecimals(19.9985 + 10.9985) = 30.997 → $31.00

User sees: $19.99 + $10.99 = $29.98 but invoice says $31.00! ❌
```

---

## 📐 Tax Calculation Standards

### **Industry Best Practices**

There are two common approaches:

#### **Approach 1: Round Each Line (Recommended for B2C)**
```
1. Calculate amount (excl. tax) → round to 2 decimals
2. Calculate tax_amount → round to 2 decimals
3. Calculate line_total = amount + tax_amount (already rounded)
4. Invoice total = sum of rounded line_totals
```

**Pros**:
- ✅ What you see is what you get
- ✅ Line items add up exactly to invoice total
- ✅ Customer-friendly (no "rounding errors")

**Cons**:
- ❌ Slight tax inaccuracy (rounding each line vs. rounding at end)
- ❌ May not comply with strict tax jurisdictions

#### **Approach 2: Round Only Invoice Total (Tax Compliance)**
```
1. Calculate all amounts precisely (no rounding)
2. Sum amounts → round subtotal to 2 decimals
3. Sum tax_amounts → round tax_total to 2 decimals
4. Total = subtotal + tax_total (both rounded)
```

**Pros**:
- ✅ Tax calculation is mathematically precise
- ✅ Complies with jurisdictions requiring exact tax calculation

**Cons**:
- ❌ Line items may not add up visually (due to display rounding)
- ❌ Customer confusion

---

## 🎯 Recommended Solution

### **Hybrid Approach: Round Line Items + Store Both Values**

Store **both precise and rounded values** in the database:

```sql
-- Precise values (for audit/tax compliance)
amount_precise NUMERIC(10,6)
tax_amount_precise NUMERIC(10,6)
line_total_precise NUMERIC(10,6)

-- Rounded values (for display/payment)
amount NUMERIC(10,2)
tax_amount NUMERIC(10,2)
line_total NUMERIC(10,2)
```

**Implementation**:
1. Calculate using Decimal.js (precise)
2. Round each field to 2 decimals for storage in main fields
3. Optionally store precise values in `*_precise` columns for audit
4. Invoice totals = sum of **rounded** line items

---

## 🔧 Proposed Changes

### **Option A: Round Each Line Item (Recommended)**

This is the **simplest** and most **user-friendly** approach.

#### **1. Update `InvoiceService.calculateItemAmounts()`**

```typescript
static calculateItemAmounts(item: InvoiceItemInput): InvoiceItemCalculated {
  const quantity = new Decimal(item.quantity);
  const unitPrice = new Decimal(item.unit_price);
  const taxRate = new Decimal(item.tax_rate || 0);
  
  // Calculate amount (before tax) - quantity * unit_price
  const amount = quantity.mul(unitPrice);
  
  // Calculate tax amount
  const taxAmount = amount.mul(taxRate);
  
  // Calculate line total (amount + tax_amount)
  const lineTotal = amount.add(taxAmount);
  
  // Calculate rate_inclusive (unit_price including tax)
  const rateInclusive = unitPrice.mul(taxRate.add(1));
  
  return {
    // ✅ Round each value to 2 decimals
    amount: roundToTwoDecimals(amount.toNumber()),
    tax_amount: roundToTwoDecimals(taxAmount.toNumber()),
    line_total: roundToTwoDecimals(lineTotal.toNumber()),
    rate_inclusive: roundToTwoDecimals(rateInclusive.toNumber())
  };
}
```

#### **2. Update `InvoiceService.calculateInvoiceTotals()`**

```typescript
static calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  let subtotal = new Decimal(0);
  let taxTotal = new Decimal(0);
  
  for (const item of items) {
    // ✅ Items are already rounded, so sum will be consistent
    subtotal = subtotal.add(item.amount);
    taxTotal = taxTotal.add(item.tax_amount);
  }
  
  const totalAmount = subtotal.add(taxTotal);
  
  return {
    // ✅ These should already be clean 2-decimal values
    subtotal: roundToTwoDecimals(subtotal.toNumber()),
    tax_total: roundToTwoDecimals(taxTotal.toNumber()),
    total_amount: roundToTwoDecimals(totalAmount.toNumber())
  };
}
```

#### **3. Update `InvoiceCalculations.calculateItemAmounts()` (Client-Side)**

Same changes as above to maintain consistency.

---

### **Option B: Add Precise Columns (Tax Compliance)**

If you need to maintain **exact tax calculation** for compliance:

#### **1. Add Migration**
```sql
ALTER TABLE invoice_items 
  ADD COLUMN amount_precise NUMERIC(10,6),
  ADD COLUMN tax_amount_precise NUMERIC(10,6),
  ADD COLUMN line_total_precise NUMERIC(10,6);

-- Backfill with current values
UPDATE invoice_items 
SET amount_precise = amount::numeric(10,6),
    tax_amount_precise = tax_amount::numeric(10,6),
    line_total_precise = line_total::numeric(10,6);
```

#### **2. Store Both Values**
```typescript
static calculateItemAmounts(item: InvoiceItemInput): InvoiceItemCalculated {
  // ... existing calculation logic
  
  return {
    // Precise values (for tax compliance)
    amount_precise: amount.toNumber(),
    tax_amount_precise: taxAmount.toNumber(),
    line_total_precise: lineTotal.toNumber(),
    
    // Rounded values (for display/payment)
    amount: roundToTwoDecimals(amount.toNumber()),
    tax_amount: roundToTwoDecimals(taxAmount.toNumber()),
    line_total: roundToTwoDecimals(lineTotal.toNumber()),
    rate_inclusive: roundToTwoDecimals(rateInclusive.toNumber())
  };
}
```

---

## 🧪 Test Cases

### **Test Case 1: Landing Fee**
```
Input:
  quantity = 1
  unit_price = 17.39
  tax_rate = 0.15

Expected Output (Option A):
  amount = 17.39
  tax_amount = 2.61  (17.39 × 0.15 = 2.6085 → round to 2.61)
  line_total = 20.00 (17.39 + 2.61 = 20.00)
  rate_inclusive = 20.00

Database:
  line_total = 20.00 ✅ (not 19.9985)
```

### **Test Case 2: Multiple Items**
```
Item 1: $17.39 + $2.61 tax = $20.00
Item 2: $10.00 + $1.50 tax = $11.50
---
Subtotal: $27.39
Tax: $4.11
Total: $31.50

User sees: $20.00 + $11.50 = $31.50 ✅
Invoice says: $31.50 ✅
```

### **Test Case 3: High-Precision Rates**
```
Input:
  quantity = 1.1
  unit_price = 295.6521739130435
  tax_rate = 0.15

Expected Output (Option A):
  amount = 325.22  (1.1 × 295.65 = 325.217... → round to 325.22)
  tax_amount = 48.78 (325.22 × 0.15 = 48.783 → round to 48.78)
  line_total = 374.00 (325.22 + 48.78 = 374.00)
  rate_inclusive = 340.00
```

---

## 📋 Implementation Checklist

### **For Option A (Recommended - Simple Rounding)**

- [ ] Update `src/lib/invoice-service.ts` → `calculateItemAmounts()` to round each field
- [ ] Update `src/lib/invoice-calculations.ts` → `calculateItemAmounts()` to round each field
- [ ] Run test suite to verify calculations
- [ ] Manually test with landing fees ($17.39 case)
- [ ] Verify invoice totals match sum of line items
- [ ] Update existing invoice items in DB (migration script)
- [ ] Document rounding policy

### **For Option B (Tax Compliance with Precise Columns)**

- [ ] Create migration to add `*_precise` columns
- [ ] Update TypeScript types for `InvoiceItem`
- [ ] Update `InvoiceService.calculateItemAmounts()` to return both values
- [ ] Update API endpoints to store both values
- [ ] Update UI to display rounded values
- [ ] Backfill existing data
- [ ] Test with real invoices

---

## 🎯 Recommendation

**Use Option A** (Round Each Line Item) because:

1. ✅ **Simpler implementation** - no schema changes needed
2. ✅ **User-friendly** - what you see is what you pay
3. ✅ **No visual discrepancies** - line items add up exactly
4. ✅ **Common industry practice** for B2C invoicing
5. ✅ **15% GST/VAT rounding** is standard practice in NZ/AU/UK

The rounding difference is **negligible**:
- Current: `19.9985` (4 decimal tax precision)
- Proposed: `20.00` (2 decimal tax precision)
- Difference: `0.0015` (0.15 cents)

For a flight school SaaS, **customer clarity** > **tax precision at 4 decimals**.

---

## 📊 Expected Impact

### **Before (Current)**
```sql
Landing Fee:
  amount: 17.39
  tax_amount: 2.6085        ❌ (displays as $2.61)
  line_total: 19.9985       ❌ (displays as $20.00)
  
Invoice Total: 498.4985     ❌ (displays as $498.50)
```

### **After (Option A)**
```sql
Landing Fee:
  amount: 17.39
  tax_amount: 2.61          ✅ (rounded, matches display)
  line_total: 20.00         ✅ (rounded, matches display)
  
Invoice Total: 498.50       ✅ (clean, matches sum of line items)
```

---

## ⚠️ Migration Considerations

If you choose Option A, you'll need to update existing invoice items:

```sql
-- Update existing invoice items to rounded values
UPDATE invoice_items 
SET 
  amount = ROUND(amount::numeric, 2),
  tax_amount = ROUND(tax_amount::numeric, 2),
  line_total = ROUND(line_total::numeric, 2),
  rate_inclusive = ROUND(rate_inclusive::numeric, 2)
WHERE deleted_at IS NULL;

-- Update invoice totals
UPDATE invoices i
SET 
  subtotal = (
    SELECT ROUND(SUM(amount)::numeric, 2) 
    FROM invoice_items 
    WHERE invoice_id = i.id AND deleted_at IS NULL
  ),
  tax_total = (
    SELECT ROUND(SUM(tax_amount)::numeric, 2) 
    FROM invoice_items 
    WHERE invoice_id = i.id AND deleted_at IS NULL
  ),
  total_amount = (
    SELECT ROUND(SUM(line_total)::numeric, 2) 
    FROM invoice_items 
    WHERE invoice_id = i.id AND deleted_at IS NULL
  );
```

---

## 🚀 Next Steps

1. **Decide on approach** (Option A recommended)
2. **Update calculation functions** in both services
3. **Test thoroughly** with real data
4. **Run migration** to clean existing data
5. **Monitor** for any edge cases
6. **Document** the rounding policy

**Goal**: Every invoice item and total should be clean 2-decimal values that match what the user sees! 🎯

