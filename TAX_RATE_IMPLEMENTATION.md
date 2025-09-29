# Tax Rate Implementation Documentation

## Overview

This document describes the comprehensive tax rate system implemented in the application, covering organization-wide tax configuration, user-specific tax rates, and how all components work together to provide dynamic tax calculations.

## Architecture

The tax rate system follows a hierarchical approach with fallback mechanisms to ensure reliable tax calculations across all invoice and booking operations.

### Priority Order
1. **User-Specific Tax Rates** - Location-based rates for international users
2. **Organization Default Tax Rate** - Centrally managed via `TaxRateManager.tsx`
3. **Hardcoded Fallback** - 15% (0.15) as final safety net

## Core Components

### 1. Database Schema

#### `tax_rates` Table
```sql
CREATE TABLE tax_rates (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  region_code VARCHAR(10) NULL,
  tax_name VARCHAR(100) NOT NULL,
  rate NUMERIC(5,4) NOT NULL,        -- Stored as decimal (0.15 = 15%)
  is_default BOOLEAN DEFAULT FALSE,   -- Organization default flag
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `rate`: Tax rate as decimal (0.15 = 15%, 0.20 = 20%)
- `is_default`: Marks the organization's default tax rate
- `country_code`: ISO country code for location-based rates
- `region_code`: State/province code for sub-national rates

### 2. Tax Rate Management

#### `TaxRateManager.tsx`
**Location**: `src/components/settings/TaxRateManager.tsx`

**Purpose**: Provides administrative interface for managing organization tax rates

**Key Features:**
- Lists all available tax rates
- Allows setting which rate is the organization default (`is_default = true`)
- Displays current default with percentage formatting
- Handles updating default tax rate selection

**Usage**: Accessible through settings panel for administrators

### 3. Tax Rate Utilities

#### `tax-rates.ts`
**Location**: `src/lib/tax-rates.ts`

**Core Functions:**

```typescript
// Get user-specific tax rate based on location
getTaxRateForUser(userId: string): Promise<number>

// Get organization default tax rate (is_default = true)
getDefaultTaxRate(): Promise<number>

// Get all active tax rates
getAllTaxRates(): Promise<TaxRate[]>

// Create new tax rate
createTaxRate(taxRate: Omit<TaxRate, 'id' | 'created_at' | 'updated_at'>): Promise<TaxRate | null>
```

### 4. React Hook System

#### `useTaxRate` Hook
**Location**: `src/hooks/use-tax-rate.ts`

**Purpose**: Provides dynamic tax rate resolution with caching and error handling

```typescript
interface UseTaxRateOptions {
  userId?: string;
  fallbackRate?: number;
}

interface UseTaxRateReturn {
  taxRate: number;
  isLoading: boolean;
  error: Error | null;
  source: 'user' | 'organization' | 'fallback';
}
```

**Resolution Logic:**
1. If `userId` provided → fetch user-specific rate
2. If no user rate → fetch organization default
3. If all fails → use fallback (0.15)

**Convenience Hooks:**
```typescript
// Organization tax rate only (better performance)
useOrganizationTaxRate(): UseTaxRateReturn

// With percentage formatting
useTaxRateFormatted(options?: UseTaxRateOptions): {
  taxRate: number;
  taxRatePercent: number;
  taxRateFormatted: string; // "15%"
  // ... other fields
}
```

## Implementation in Components

### 1. Invoice Components

#### New Invoice Form
**File**: `src/app/(auth)/dashboard/invoices/new/NewInvoiceForm.tsx`

```typescript
const { taxRate, isLoading: taxRateLoading } = useOrganizationTaxRate();
const { taxRateFormatted } = useTaxRateFormatted();

// Dynamic tax display
<div className="text-muted-foreground">
  Tax ({taxRateLoading ? '...' : taxRateFormatted}):
</div>
```

#### Invoice Edit Client
**File**: `src/app/(auth)/dashboard/invoices/edit/[id]/InvoiceEditClient.tsx`

```typescript
const { taxRate: organizationTaxRate } = useOrganizationTaxRate();

// Fallback to organization rate if invoice doesn't have specific rate
const effectiveTaxRate = invoice.tax_rate ?? organizationTaxRate;
```

### 2. Booking Components

#### Check-In Details
**File**: `src/components/bookings/CheckInDetails.tsx`

```typescript
const { taxRate, isLoading: taxRateLoading } = useOrganizationTaxRate();

// Tax-inclusive rate calculations
const aircraftRateInclusive = aircraftRateExclusive && !taxRateLoading
  ? (aircraftRateExclusive * (1 + taxRate))
  : null;
```

#### Booking Check-In Client
**File**: `src/app/(auth)/dashboard/bookings/check-in/[id]/BookingCheckInClient.tsx`

Uses organization tax rate for displaying totals and charging calculations.

### 3. Optimistic Updates

#### `use-booking-check-in.ts`
**File**: `src/hooks/use-booking-check-in.ts`

```typescript
// Fetches organization tax rate for optimistic invoice calculations
let currentTaxRate = 0.15; // Fallback
try {
  currentTaxRate = await getDefaultTaxRate();
} catch {
  // Use fallback if fetch fails
}

// Creates optimistic invoice items with correct tax calculations
const taxAmount = (amount * currentTaxRate);
const lineTotal = amount * (1 + currentTaxRate);
```

## Tax Calculation Examples

### Standard Calculation
```typescript
// Given: Aircraft rate $45/hour, Tax rate 15%
const unitPrice = 45.00;
const taxRate = 0.15;

const amount = unitPrice * quantity;           // $45.00
const taxAmount = amount * taxRate;            // $6.75
const lineTotal = amount + taxAmount;          // $51.75
const rateInclusive = unitPrice * (1 + taxRate); // $51.75
```

### Dual/Solo Flight Calculation
```typescript
// Dual time: 1.2 hours @ $45/hour + $35/hour instructor
// Solo time: 0.5 hours @ $40/hour (different solo rate)

// Dual aircraft
const dualAircraftAmount = 1.2 * 45;          // $54.00
const dualAircraftTax = 54.00 * 0.15;         // $8.10
const dualAircraftTotal = 54.00 + 8.10;       // $62.10

// Dual instructor
const dualInstructorAmount = 1.2 * 35;        // $42.00
const dualInstructorTax = 42.00 * 0.15;       // $6.30
const dualInstructorTotal = 42.00 + 6.30;     // $48.30

// Solo aircraft
const soloAircraftAmount = 0.5 * 40;          // $20.00
const soloAircraftTax = 20.00 * 0.15;         // $3.00
const soloAircraftTotal = 20.00 + 3.00;       // $23.00

// Invoice totals
const subtotal = 54.00 + 42.00 + 20.00;       // $116.00
const totalTax = 8.10 + 6.30 + 3.00;          // $17.40
const grandTotal = 116.00 + 17.40;            // $133.40
```

## Configuration Guide

### Setting Organization Default Tax Rate

1. **Access Tax Rate Manager**
   - Navigate to Settings → Tax Rates
   - Or access `TaxRateManager.tsx` component

2. **Select Default Rate**
   - View current default tax rate
   - Click "Edit" to change
   - Select new default from dropdown
   - Click "Save"

3. **Verification**
   - New invoices will use the updated tax rate
   - Existing invoices retain their original tax rate
   - Check-in calculations use new rate immediately

### Adding New Tax Rates

1. **Via API** (for administrators):
```typescript
POST /api/tax_rates
{
  "country_code": "CA",
  "region_code": "ON",
  "tax_name": "HST",
  "rate": 0.13,
  "is_default": false
}
```

2. **Setting as Default**:
```typescript
PATCH /api/tax_rates
{
  "id": "tax_rate_id",
  "is_default": true
}
```

### User-Specific Tax Rates

For international users or specific locations:

1. **User Profile Setup**
   - Ensure user has `country` and `state` fields populated
   - System will automatically lookup location-based tax rates

2. **Tax Rate Resolution**
   - User location checked first
   - Falls back to organization default
   - Displays rate source in hook response

## Error Handling

### Fallback Mechanisms

1. **Hook Level**
   - Network failures → use fallback rate (15%)
   - Invalid rates → use fallback rate
   - Loading states → show fallback rate temporarily

2. **Component Level**
   - Display loading indicators during tax rate fetch
   - Show percentage as "..." while loading
   - Graceful degradation if tax rate unavailable

3. **Database Level**
   - Triggers ensure calculated fields are always populated
   - Default rates prevent null tax calculations

### Logging and Monitoring

```typescript
// Hook warns about invalid rates
console.warn(`Invalid tax rate received: ${taxRate}, using fallback: ${fallbackRate}`);

// Utility functions log rate resolution
console.log(`Found region-specific tax rate: ${rate} for ${countryCode}-${regionCode}`);
console.warn(`No tax rate found for ${countryCode}, using default`);
```

## API Endpoints

### Tax Rates CRUD
- `GET /api/tax_rates` - List all active tax rates
- `POST /api/tax_rates` - Create new tax rate
- `PATCH /api/tax_rates` - Update existing tax rate
- `DELETE /api/tax_rates` - Soft delete (set is_active = false)

### Query Parameters
- `?is_default=true` - Get only default tax rate
- `?country_code=US` - Filter by country
- `?region_code=CA` - Filter by region

## Testing

### Unit Tests
```typescript
describe('useTaxRate', () => {
  it('should return organization default when no user specified', async () => {
    const { result } = renderHook(() => useOrganizationTaxRate());
    await waitFor(() => {
      expect(result.current.taxRate).toBe(0.15);
      expect(result.current.source).toBe('organization');
    });
  });
});
```

### Integration Tests
1. **Tax Rate Manager** - Verify UI updates tax rates correctly
2. **Invoice Creation** - Ensure new invoices use current default rate
3. **Check-in Process** - Verify optimistic updates use correct tax rate
4. **Rate Changes** - Test that rate changes apply to new transactions

## Best Practices

### Development
1. **Always use hooks** - Never hardcode tax rates in components
2. **Handle loading states** - Show appropriate UI during tax rate fetch
3. **Validate rates** - Ensure rates are between 0 and 1
4. **Use organization rate** - Most components should use `useOrganizationTaxRate()`

### Administration
1. **Test rate changes** - Verify new rates apply correctly before going live
2. **Backup before changes** - Tax rate changes affect all new transactions
3. **Communication** - Notify users of tax rate changes
4. **Audit trail** - Monitor tax rate changes via database logs

### Performance
1. **Cache effectively** - Hook uses React Query caching (15 min for defaults)
2. **Minimize queries** - Use organization rate hook when user rate not needed
3. **Optimize loading** - Components gracefully handle loading states

## Troubleshooting

### Common Issues

1. **"Tax showing as 0%" or incorrect percentage**
   - Check if organization has default tax rate set
   - Verify rate is stored as decimal (0.15) not percentage (15)
   - Use TaxRateManager to set/verify default rate

2. **"Loading..." never resolves**
   - Check network connectivity to `/api/tax_rates`
   - Verify database has active tax rates
   - Check browser console for API errors

3. **Different rates showing in different components**
   - Ensure all components use same hook (`useOrganizationTaxRate`)
   - Check if component is using cached vs fresh data
   - Verify no hardcoded tax rates remain

### Debugging Tools

```typescript
// Enable hook debugging
const { taxRate, source, error } = useTaxRate();
console.log('Tax rate:', taxRate, 'Source:', source, 'Error:', error);

// Check current default rate
fetch('/api/tax_rates?is_default=true')
  .then(res => res.json())
  .then(data => console.log('Current default:', data.tax_rates));
```

## Migration Notes

### From Hardcoded Rates

If migrating from hardcoded rates (0.15):

1. **Database Setup** - Ensure default tax rate exists with `is_default = true`
2. **Component Updates** - Replace hardcoded values with `useOrganizationTaxRate()`
3. **Testing** - Verify all calculations match previous hardcoded results
4. **Gradual Rollout** - Components updated incrementally to use dynamic rates

### Data Migration Script

```sql
-- Ensure organization has a default tax rate
INSERT INTO tax_rates (country_code, region_code, tax_name, rate, is_default, is_active)
VALUES ('DEFAULT', NULL, 'Organization Default', 0.15, true, true)
ON CONFLICT DO NOTHING;
```

This comprehensive system provides flexible, maintainable tax rate management while ensuring reliable calculations across all financial operations in the application.