# Invoice Logic Migration Plan: Database Triggers to Application Code

## Executive Summary

**Current Problem:** The invoicing system relies heavily on PostgreSQL triggers and functions for business logic calculations (tax amounts, totals, status updates, payment tracking). This creates several issues:
- Difficult to test business logic in isolation
- Complex debugging when calculations are wrong
- Hard to version control business rules
- Concurrency issues with trigger execution order
- Limited visibility into calculation steps

**Recommended Strategy:** Migrate all invoice calculation logic from database triggers/functions to TypeScript application code while maintaining data integrity through database constraints and atomic transactions.

## Inventory of Files Inspected

### Database Schema Files
- `/single_tenant_schema.sql` - Current single-tenant schema with triggers/functions
- `/complete_schema.sql` - Alternative schema version
- `/invoicing.txt` - Design documentation and business logic explanation

### API Endpoints
- `/src/app/api/invoices/route.ts` - Invoice CRUD operations
- `/src/app/api/invoices/[id]/route.ts` - Individual invoice operations
- `/src/app/api/invoice_items/route.ts` - Invoice item CRUD operations
- `/src/app/api/payments/route.ts` - Payment processing

### Frontend Components
- `/src/app/(auth)/dashboard/invoices/edit/[id]/InvoiceEditClient.tsx` - Invoice editing UI
- `/src/app/(auth)/dashboard/invoices/new/NewInvoiceForm.tsx` - Invoice creation UI
- `/src/components/invoices/InvoicesTable.tsx` - Invoice listing
- `/src/components/invoices/RecordPaymentModal.tsx` - Payment recording UI

### Types
- `/src/types/invoices.ts` - Invoice type definitions
- `/src/types/invoice_items.ts` - Invoice item type definitions

## Current Database Setup

### Invoice Tables Schema

```sql
-- invoices table (from Supabase)
CREATE TABLE "public"."invoices" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "invoice_number" text,
    "user_id" uuid NOT NULL,
    "status" invoice_status DEFAULT 'draft'::invoice_status NOT NULL,
    "issue_date" timestamp with time zone DEFAULT now() NOT NULL,
    "due_date" timestamp with time zone,
    "paid_date" timestamp with time zone,
    "subtotal" numeric DEFAULT 0,
    "tax_total" numeric DEFAULT 0,
    "total_amount" numeric DEFAULT 0,
    "total_paid" numeric DEFAULT 0,
    "balance_due" numeric DEFAULT 0,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "booking_id" uuid,
    "reference" text,
    "payment_method" payment_method,
    "payment_reference" text,
    "tax_rate" numeric DEFAULT 0.15 NOT NULL CHECK (tax_rate >= 0)
);

-- invoice_items table (from Supabase)
CREATE TABLE "public"."invoice_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "invoice_id" uuid NOT NULL,
    "chargeable_id" uuid,
    "description" text NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "unit_price" numeric NOT NULL,
    "line_total" numeric,
    "tax_rate" numeric DEFAULT 0,
    "tax_amount" numeric,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "rate_inclusive" numeric,
    "amount" numeric DEFAULT 0 NOT NULL
);

-- invoice_sequences table (for invoice numbering)
CREATE TABLE "public"."invoice_sequences" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "year_month" text NOT NULL,
    "last_sequence" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY ("year_month")
);
```

### Current Triggers and Functions

The system currently has **8 triggers** and **9 functions** handling invoice business logic:

#### Triggers on `invoice_items`:
1. **`calculate_invoice_item_amounts_trigger`** (BEFORE INSERT/UPDATE)
   - Executes: `calculate_invoice_item_amounts()`
   - Calculates: `amount`, `tax_amount`, `line_total`, `rate_inclusive`

2. **`update_invoice_totals_on_item_change`** (AFTER INSERT/UPDATE/DELETE)
   - Executes: `update_invoice_totals()`
   - Updates parent invoice totals when items change

#### Triggers on `invoices`:
3. **`ensure_invoice_number`** (BEFORE INSERT)
   - Executes: `set_invoice_number()`
   - Generates sequential invoice numbers

4. **`trg_invoice_approval`** (AFTER UPDATE)
   - Executes: `process_invoice_approval()`
   - Creates debit transactions when status changes to pending/paid

5. **`trg_invoice_reverse_debit`** (AFTER UPDATE)
   - Executes: `reverse_invoice_debit_transaction()`
   - Removes debit transactions when status changes

6. **`trg_invoice_reverse_debit_delete`** (AFTER DELETE)
   - Executes: `reverse_invoice_debit_transaction()`
   - Removes debit transactions when invoice deleted

7. **`trg_invoice_sync_debit`** (AFTER UPDATE)
   - Executes: `sync_invoice_debit_transaction()`
   - Updates debit transaction amounts

8. **`trg_update_invoice_balance_due`** (AFTER UPDATE)
   - Executes: `update_invoice_balance_due()`
   - Recalculates balance due based on payments

9. **`update_invoice_status_on_payment`** (BEFORE UPDATE)
   - Executes: `update_invoice_status()`
   - Updates status based on payment state

#### Key Functions:

**`calculate_invoice_item_amounts()`**
- Calculates `amount = quantity * unit_price`
- Calculates `tax_amount = amount * tax_rate`
- Calculates `line_total = amount + tax_amount`
- Calculates `rate_inclusive = unit_price * (1 + tax_rate)`

**`update_invoice_totals()`**
- Sums all item amounts for `subtotal`
- Sums all item tax amounts for `tax_total`
- Calculates `total_amount = subtotal + tax_total`
- Updates `balance_due = total_amount - total_paid`

**`generate_invoice_number()`**
- Creates sequential invoice numbers: `INV-YYYY-MM-0001`
- Uses `invoice_sequences` table for atomicity

**Transaction Management Functions:**
- `process_invoice_approval()` - Creates debit transactions
- `sync_invoice_debit_transaction()` - Updates transaction amounts
- `reverse_invoice_debit_transaction()` - Removes transactions
- `update_invoice_balance_due()` - Recalculates balance
- `update_invoice_status()` - Updates status based on payments

## Problems & Risks with Database Trigger Approach

### 1. **Testing Complexity**
- Business logic embedded in database triggers cannot be unit tested in isolation
- Requires full database setup for testing calculations
- Difficult to mock or stub trigger behavior for edge case testing
- No way to test trigger logic without actual database operations

### 2. **Debugging Difficulties**
- Trigger execution is opaque - no visibility into calculation steps
- Hard to trace why specific totals are calculated incorrectly
- No logging or debugging capabilities within triggers
- Stack traces don't include trigger execution context

### 3. **Version Control & Deployment**
- Database functions are not easily version controlled with application code
- Schema migrations required for business logic changes
- Risk of schema/code version mismatches during deployments
- Rollback complexity when triggers need to be reverted

### 4. **Concurrency Issues**
- Multiple triggers firing in sequence can cause race conditions
- Trigger execution order is not guaranteed
- Potential for deadlocks with complex trigger chains
- No transaction isolation control within triggers

### 5. **Performance & Scalability**
- Triggers execute on every row operation, adding overhead
- Complex trigger logic can slow down bulk operations
- No ability to batch or optimize calculations
- Difficult to implement caching strategies

### 6. **Business Logic Visibility**
- Calculations happen "magically" without explicit application control
- Difficult for developers to understand invoice calculation flow
- No audit trail of calculation steps
- Hard to implement complex business rules (discounts, promotions, etc.)

### 7. **Error Handling**
- Limited error handling capabilities in PL/pgSQL
- Trigger failures can cause entire transactions to rollback
- No graceful degradation or retry mechanisms
- Difficult to provide user-friendly error messages

## Target Design (Application-Driven Business Logic)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  Invoice Service (TypeScript)                               │
│  ├── calculateInvoiceItemAmounts()                          │
│  ├── calculateInvoiceTotals()                               │
│  ├── generateInvoiceNumber()                                │
│  ├── updateInvoiceStatus()                                  │
│  ├── processPayments()                                      │
│  └── manageTransactions()                                   │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints                                              │
│  ├── POST /api/invoices                                     │
│  ├── PATCH /api/invoices/[id]                               │
│  ├── POST /api/invoice_items                                │
│  ├── PATCH /api/invoice_items/[id]                          │
│  └── POST /api/payments                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  Responsibilities:                                          │
│  ├── Data integrity constraints                             │
│  ├── Foreign key relationships                              │
│  ├── Row Level Security (RLS)                               │
│  ├── Indexes for performance                                │
│  ├── Audit logging                                          │
│  └── Basic validations (NOT NULL, CHECK constraints)       │
├─────────────────────────────────────────────────────────────┤
│  NO Business Logic:                                         │
│  ├── ❌ No calculation triggers                             │
│  ├── ❌ No status update triggers                           │
│  ├── ❌ No automatic total updates                          │
│  └── ❌ No transaction management triggers                  │
└─────────────────────────────────────────────────────────────┘
```

### Responsibility Separation

#### **Application Layer Responsibilities:**
- **All Business Calculations**: Tax amounts, totals, discounts, rounding
- **Invoice Number Generation**: Sequential numbering with proper locking
- **Status Management**: Draft → Pending → Paid → Overdue transitions
- **Payment Processing**: Recording payments and updating balances
- **Transaction Management**: Creating/updating debit transactions
- **Validation**: Complex business rule validation
- **Error Handling**: User-friendly error messages and recovery
- **Audit Logging**: Detailed calculation audit trails
- **Currency Handling**: Proper decimal arithmetic and rounding

#### **Database Layer Responsibilities:**
- **Data Integrity**: Foreign key constraints, NOT NULL constraints
- **Security**: Row Level Security (RLS) policies
- **Performance**: Indexes, query optimization
- **Basic Validation**: CHECK constraints for simple rules
- **Concurrency**: Optimistic locking support via `updated_at`
- **Audit Trail**: Basic row-level change tracking

## Schema Changes

### Recommended Changes

**Option 1: Add Application-Calculated Flag (Recommended)**
```sql
-- Add flag to track calculation method
ALTER TABLE invoices ADD COLUMN calculated_by_app BOOLEAN DEFAULT FALSE;
ALTER TABLE invoice_items ADD COLUMN calculated_by_app BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX idx_invoices_calculated_by_app ON invoices(calculated_by_app);
CREATE INDEX idx_invoice_items_calculated_by_app ON invoice_items(calculated_by_app);
```

**Option 2: Keep Current Schema (Alternative)**
- No schema changes required
- Application will write to existing calculated columns
- Triggers will be disabled during migration

## Migration Plan

### Phase 1: Preparation (1-2 days)

#### Step 1.1: Create Invoice Service
```bash
# Create new service file
touch src/lib/invoice-service.ts
```

#### Step 1.2: Implement Core Calculation Functions
```typescript
// src/lib/invoice-service.ts - Basic structure
export class InvoiceService {
  static calculateItemAmounts(item: InvoiceItemInput): InvoiceItemCalculated {
    // Implementation details in Application Code Changes section
  }
  
  static calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
    // Implementation details in Application Code Changes section
  }
}
```

#### Step 1.3: Add Schema Changes (if using Option 1)
```sql
-- Execute via Supabase MCP or migration
ALTER TABLE invoices ADD COLUMN calculated_by_app BOOLEAN DEFAULT FALSE;
ALTER TABLE invoice_items ADD COLUMN calculated_by_app BOOLEAN DEFAULT FALSE;
```

### Phase 2: Dual-Write Implementation (2-3 days)

#### Step 2.1: Update API Endpoints to Use Application Logic
- Modify `/api/invoice_items` POST/PATCH to calculate amounts in application
- Modify `/api/invoices` POST/PATCH to calculate totals in application
- Keep triggers enabled for backward compatibility

#### Step 2.2: Implement Dual-Write Verification
```typescript
// Verification function to compare trigger vs app calculations
async function verifyCalculations(invoiceId: string) {
  // Disable triggers temporarily
  // Recalculate using application logic
  // Compare results
  // Log discrepancies
}
```

#### Step 2.3: Deploy and Monitor
- Deploy application changes
- Monitor for calculation discrepancies
- Fix any edge cases discovered

### Phase 3: Trigger Removal (1 day)

#### Step 3.1: Disable Triggers
```sql
-- Disable all invoice-related triggers
DROP TRIGGER IF EXISTS calculate_invoice_item_amounts_trigger ON invoice_items;
DROP TRIGGER IF EXISTS update_invoice_totals_on_item_change ON invoice_items;
DROP TRIGGER IF EXISTS ensure_invoice_number ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_approval ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_reverse_debit ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_reverse_debit_delete ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_sync_debit ON invoices;
DROP TRIGGER IF EXISTS trg_update_invoice_balance_due ON invoices;
DROP TRIGGER IF EXISTS update_invoice_status_on_payment ON invoices;
```

#### Step 3.2: Drop Functions
```sql
-- Drop all invoice-related functions
DROP FUNCTION IF EXISTS calculate_invoice_item_amounts();
DROP FUNCTION IF EXISTS update_invoice_totals();
DROP FUNCTION IF EXISTS set_invoice_number();
DROP FUNCTION IF EXISTS process_invoice_approval();
DROP FUNCTION IF EXISTS reverse_invoice_debit_transaction();
DROP FUNCTION IF EXISTS sync_invoice_debit_transaction();
DROP FUNCTION IF EXISTS update_invoice_balance_due();
DROP FUNCTION IF EXISTS update_invoice_status();
-- Keep generate_invoice_number() - will be moved to application
```

## Application Code Changes

### 1. Create Invoice Service (`src/lib/invoice-service.ts`)

```typescript
import { createClient } from '@/lib/SupabaseServerClient';
import { Decimal } from 'decimal.js';

// Configure Decimal.js for currency calculations
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

export interface InvoiceItemInput {
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface InvoiceItemCalculated {
  amount: number;
  tax_amount: number;
  line_total: number;
  rate_inclusive: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax_total: number;
  total_amount: number;
}

export class InvoiceService {
  /**
   * Calculate all amounts for an invoice item using currency-safe arithmetic
   */
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
      amount: amount.toNumber(),
      tax_amount: taxAmount.toNumber(),
      line_total: lineTotal.toNumber(),
      rate_inclusive: rateInclusive.toNumber()
    };
  }

  /**
   * Calculate invoice totals from items
   */
  static calculateInvoiceTotals(items: InvoiceItemCalculated[]): InvoiceTotals {
    let subtotal = new Decimal(0);
    let taxTotal = new Decimal(0);
    
    for (const item of items) {
      subtotal = subtotal.add(item.amount);
      taxTotal = taxTotal.add(item.tax_amount);
    }
    
    const totalAmount = subtotal.add(taxTotal);
    
    return {
      subtotal: subtotal.toNumber(),
      tax_total: taxTotal.toNumber(),
      total_amount: totalAmount.toNumber()
    };
  }

  /**
   * Generate sequential invoice number with proper locking
   */
  static async generateInvoiceNumber(): Promise<string> {
    const supabase = await createClient();
    const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Use transaction for atomicity
    const { data, error } = await supabase.rpc('generate_invoice_number_app');
    
    if (error) throw new Error(`Failed to generate invoice number: ${error.message}`);
    return data;
  }
}
```

### 2. Update API Endpoints

#### Update `src/app/api/invoice_items/route.ts` POST method:

```typescript
// Add import
import { InvoiceService } from '@/lib/invoice-service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { invoice_id, chargeable_id, description, quantity, unit_price, tax_rate } = body;
  
  if (!invoice_id || !description || !quantity || !unit_price) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  try {
    // Start transaction
    const { data: result, error: txError } = await supabase.rpc('begin_transaction');
    
    // Calculate amounts using application logic
    const calculatedAmounts = InvoiceService.calculateItemAmounts({
      quantity,
      unit_price,
      tax_rate: tax_rate || 0.15
    });
    
    // Insert with calculated values
    const { data, error } = await supabase
      .from('invoice_items')
      .insert([{
        invoice_id,
        chargeable_id,
        description,
        quantity,
        unit_price,
        tax_rate: tax_rate || 0.15,
        // Application-calculated values
        amount: calculatedAmounts.amount,
        tax_amount: calculatedAmounts.tax_amount,
        line_total: calculatedAmounts.line_total,
        rate_inclusive: calculatedAmounts.rate_inclusive,
        calculated_by_app: true
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    // Update parent invoice totals
    await updateInvoiceTotals(supabase, invoice_id);
    
    // Commit transaction
    await supabase.rpc('commit_transaction');
    
    return NextResponse.json({ invoice_item: data });
  } catch (error) {
    await supabase.rpc('rollback_transaction');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3. Testing Strategy

#### Unit Tests (`src/lib/__tests__/invoice-service.test.ts`)

```typescript
import { InvoiceService } from '../invoice-service';

describe('InvoiceService', () => {
  describe('calculateItemAmounts', () => {
    it('should calculate amounts correctly with tax', () => {
      const result = InvoiceService.calculateItemAmounts({
        quantity: 2,
        unit_price: 100,
        tax_rate: 0.15
      });
      
      expect(result.amount).toBe(200);
      expect(result.tax_amount).toBe(30);
      expect(result.line_total).toBe(230);
      expect(result.rate_inclusive).toBe(115);
    });
  });
});
```

### 4. Deployment Checklist

#### Pre-Deployment
- [ ] All unit tests passing
- [ ] Integration tests passing  
- [ ] Code review completed
- [ ] Database backup created
- [ ] Rollback plan documented

#### Deployment Steps
- [ ] Deploy application code (Phase 2)
- [ ] Monitor for 24-48 hours
- [ ] Verify calculation accuracy
- [ ] Disable triggers (Phase 3)
- [ ] Drop functions (Phase 3)
- [ ] Final verification

#### Rollback Procedure
```sql
-- If rollback needed, re-enable triggers
CREATE TRIGGER calculate_invoice_item_amounts_trigger 
  BEFORE INSERT OR UPDATE ON invoice_items 
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_item_amounts();
```

## Invoice Number Configuration Improvements

### Problem Identified
During the migration process, a critical issue was discovered with hardcoded invoice number patterns throughout the codebase:

- **Hardcoded "INV-" prefix** in database functions and application code
- **Inconsistent fallback logic** using `INV-${invoice.id}` format
- **Unused settings system** - `InvoicingSettings.invoice_prefix` existed but wasn't integrated
- **Poor separation of concerns** - invoice number patterns scattered across multiple files

### Solution Implemented

#### 1. Centralized Configuration (`src/constants/invoice.ts`)
```typescript
export const INVOICE_CONFIG = {
  DEFAULT_PREFIX: 'INV',
  FORMAT_PATTERN: '{PREFIX}-{YEAR_MONTH}-{SEQUENCE}',
  SEQUENCE_PADDING: 4,
  DATE_FORMAT: 'YYYY-MM',
  FALLBACK_PATTERN: '{PREFIX}-{ID}',
} as const;
```

#### 2. Configurable Database Functions
- `generate_invoice_number_with_prefix(p_prefix)` - accepts any prefix
- `generate_invoice_number_app()` - uses default "INV" prefix
- Maintains backward compatibility

#### 3. Settings Integration
- `InvoiceService.getInvoicePrefix()` - reads from settings
- Falls back to default if setting not found
- Validates prefix format (alphanumeric, uppercase)

#### 4. Consistent Fallback Logic
- Uses same prefix as sequential numbers
- Clear distinction between sequential and fallback formats
- Example: `INV-2025-09-0001` vs `INV-{uuid}`

### Benefits Achieved
1. **Maintainability**: Single source of truth for invoice number patterns
2. **Flexibility**: Can change prefix via settings without code changes
3. **Consistency**: All invoice numbers follow same pattern rules
4. **Backward Compatibility**: Existing invoices continue to work
5. **Validation**: Proper format validation and error handling

### Files Modified
- `src/constants/invoice.ts` - New centralized configuration
- `src/lib/invoice-service.ts` - Updated to use configurable patterns
- Database functions - Made configurable with prefix parameter
- Settings integration - Connected to existing `InvoicingSettings`

## Conclusion

This migration plan provides a safe, methodical approach to moving invoice business logic from database triggers to application code. The dual-write strategy ensures data consistency during the transition, while comprehensive testing validates accuracy. The result will be a more maintainable, testable, and debuggable invoicing system.

**Additional Achievement**: The migration process also revealed and fixed critical invoice number configuration issues, resulting in a more flexible and maintainable invoice numbering system that can be configured through the settings UI without requiring code changes.

