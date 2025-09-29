# Chargeables Tax Schema Migration Plan

## Overview

Migrate from hardcoded `tax_rate` column to organization-based tax system with `is_taxable` flag.

## Current Issues

1. **Hardcoded Tax Rates**: Items have fixed tax rates (0, 0.15) that don't adapt to organization changes
2. **Inconsistency**: Mix of hardcoded rates and organization rates
3. **Maintenance**: Tax rate changes require updating every chargeable item
4. **Data Integrity**: Confusion between item-specific and organization rates

## Recommended Schema Change

### Before (Current)
```sql
chargeables:
  - tax_rate: numeric (0, 0.15, etc.) -- PROBLEMATIC
```

### After (Proposed)
```sql
chargeables:
  - is_taxable: boolean (true/false) -- SIMPLE & FLEXIBLE
```

## Migration Steps

### Step 1: Create Migration
```sql
-- Add new column
ALTER TABLE chargeables ADD COLUMN is_taxable BOOLEAN DEFAULT true;

-- Migrate existing data
UPDATE chargeables SET is_taxable = false WHERE tax_rate = 0;
UPDATE chargeables SET is_taxable = true WHERE tax_rate > 0;

-- Verify migration
SELECT name, type, rate, tax_rate, is_taxable FROM chargeables;
```

### Step 2: Update Application Logic
```typescript
// OLD: Item-specific tax rates
const taxAmount = chargeable.rate * chargeable.tax_rate;

// NEW: Organization-based tax calculation
const organizationTaxRate = await getOrganizationTaxRate();
const taxAmount = chargeable.is_taxable 
  ? chargeable.rate * organizationTaxRate 
  : 0;
```

### Step 3: Update Types
```typescript
export type Chargeable = {
  id: string;
  name: string;
  description: string | null;
  type: ChargeableType;
  rate: number;
  is_taxable: boolean; // NEW
  is_active: boolean | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
  // tax_rate: number; // REMOVED
};
```

### Step 4: Drop Old Column
```sql
-- After verifying everything works
ALTER TABLE chargeables DROP COLUMN tax_rate;
```

## Business Logic Examples

### Tax-Exempt Items (is_taxable = false)
- Landing fees (government fees)
- Certain educational materials
- Membership fees (may vary by organization)

### Taxable Items (is_taxable = true)
- Aircraft rental
- Instructor fees
- Product sales
- Service fees

## Benefits

1. **Future-Proof**: Tax rate changes apply automatically to all taxable items
2. **Consistent**: All taxable items use organization tax rate
3. **Simple**: Boolean flag instead of numeric rates
4. **Flexible**: Easy to exempt specific items
5. **Aligned**: Matches aircraft_charge_rates pattern (tax-exclusive amounts)

## Migration Verification

```sql
-- Check current data
SELECT 
  name,
  type,
  rate,
  tax_rate,
  CASE 
    WHEN tax_rate = 0 THEN false 
    WHEN tax_rate > 0 THEN true 
  END as should_be_taxable
FROM chargeables 
WHERE is_active = true;

-- Expected results:
-- NZPP Landing Fee: is_taxable = false (currently tax_rate = 0)
-- CAA Pilots Logbook: is_taxable = true (currently tax_rate = 0.15)
-- VNC C4/C5: is_taxable = false (currently tax_rate = 0)
```

## Rollback Plan

If issues occur:
```sql
-- Restore tax_rate column
ALTER TABLE chargeables ADD COLUMN tax_rate NUMERIC DEFAULT 0;

-- Restore original values
UPDATE chargeables SET tax_rate = 0 WHERE is_taxable = false;
UPDATE chargeables SET tax_rate = 0.15 WHERE is_taxable = true;

-- Drop is_taxable column
ALTER TABLE chargeables DROP COLUMN is_taxable;
```

## Files to Update

1. **Database**: Migration script
2. **Types**: `src/types/chargeables.ts`
3. **Components**: Any UI that displays/edits chargeables
4. **API**: Endpoints that create/update chargeables
5. **Business Logic**: Tax calculation functions
6. **Tests**: Update test data and expectations
