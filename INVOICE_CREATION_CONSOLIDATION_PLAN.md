# Invoice Creation Consolidation Plan

## Executive Summary

**Current Problem**: The invoice creation flow creates draft invoices immediately when a member is selected, leading to:
- Empty draft invoices cluttering the database
- Poor user experience with unnecessary redirects
- Inconsistent state management between new and edit pages
- Potential data integrity issues

**Proposed Solution**: Consolidate all invoice creation into a single edit page that handles both new and existing invoices, with proper state management and no premature database writes.

## Current State Analysis

### 1. Current Invoice Creation Flow

```mermaid
graph TD
    A[User clicks "New Invoice"] --> B[NewInvoiceForm loads]
    B --> C[User selects member]
    C --> D[Auto-creates draft invoice in DB]
    D --> E[Redirects to edit page]
    E --> F[User adds items and saves]
    
    style D fill:#ffcccc
    style E fill:#ffcccc
```

**Problems Identified**:
- ❌ **Premature Database Write**: Draft invoice created before user adds any items
- ❌ **Poor UX**: Unnecessary redirect and page reload
- ❌ **Data Pollution**: Empty draft invoices accumulate in database
- ❌ **State Loss**: Form state lost during redirect
- ❌ **Inconsistent Logic**: Different behavior for new vs edit

### 2. Current File Structure

```
src/app/(auth)/dashboard/invoices/
├── new/
│   ├── page.tsx                    # New invoice page wrapper
│   └── NewInvoiceForm.tsx         # Form with auto-creation logic
├── edit/[id]/
│   ├── page.tsx                   # Edit invoice page wrapper
│   └── InvoiceEditClient.tsx      # Edit form with full functionality
└── page.tsx                       # Main invoices listing
```

### 3. Current API Endpoints

- `POST /api/invoices` - Creates draft invoice immediately
- `PATCH /api/invoices/[id]` - Updates existing invoice
- `GET /api/invoices` - Lists all invoices
- `GET /api/invoice_items?invoice_id={id}` - Gets invoice items

## Proposed Solution Architecture

### 1. New Consolidated Flow

```mermaid
graph TD
    A[User clicks "New Invoice"] --> B[EditInvoiceClient loads with mode="new"]
    B --> C[User selects member]
    C --> D[Form state updated locally]
    D --> E[User adds items]
    E --> F[User clicks "Save Draft" or "Approve"]
    F --> G[Create invoice atomically with items]
    G --> H[Redirect to edit page with new ID]
    
    style G fill:#ccffcc
    style H fill:#ccffcc
```

### 2. New File Structure

```
src/app/(auth)/dashboard/invoices/
├── edit/
│   ├── [id]/
│   │   ├── page.tsx               # Edit existing invoice
│   │   └── InvoiceEditClient.tsx  # Consolidated edit component
│   └── new/
│       └── page.tsx               # Redirect to edit/new
├── page.tsx                       # Main invoices listing
└── (remove new/ directory)
```

### 3. New API Endpoints

- `POST /api/invoices` - **UPDATED**: Create invoice with items atomically
- `PATCH /api/invoices/[id]` - **UPDATED**: Update invoice and items
- `GET /api/invoices` - Lists all invoices
- `GET /api/invoice_items?invoice_id={id}` - Gets invoice items

## Detailed Implementation Plan

### Phase 1: Create Consolidated Edit Component (2-3 days)

#### 1.1 Update InvoiceEditClient.tsx

**New Props Interface**:
```typescript
interface InvoiceEditClientProps {
  id?: string;           // undefined for new invoices
  mode: 'new' | 'edit';  // determines behavior
}
```

**New State Management**:
```typescript
// Add new state for draft mode
const [isNewInvoice, setIsNewInvoice] = useState(!id);
const [draftInvoice, setDraftInvoice] = useState<Partial<Invoice>>({
  user_id: '',
  status: 'draft',
  issue_date: new Date(),
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  reference: '',
  notes: '',
  subtotal: 0,
  tax_total: 0,
  total_amount: 0,
  total_paid: 0,
  balance_due: 0
});
const [draftItems, setDraftItems] = useState<InvoiceItem[]>([]);
```

**New Methods**:
```typescript
// Create new invoice with items atomically
const createInvoiceWithItems = async () => {
  if (!selectedMember) {
    toast.error('Please select a member');
    return;
  }
  
  if (draftItems.length === 0) {
    toast.error('Please add at least one item');
    return;
  }
  
  setSaveLoading(true);
  try {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: selectedMember.id,
        status: 'draft',
        reference: draftInvoice.reference,
        issue_date: draftInvoice.issue_date?.toISOString(),
        due_date: draftInvoice.due_date?.toISOString(),
        notes: draftInvoice.notes,
        items: draftItems.map(item => ({
          chargeable_id: item.chargeable_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate
        }))
      })
    });
    
    const result = await response.json();
    if (result.id) {
      toast.success('Invoice created successfully');
      router.replace(`/dashboard/invoices/edit/${result.id}`);
    } else {
      throw new Error(result.error || 'Failed to create invoice');
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
  } finally {
    setSaveLoading(false);
  }
};

// Approve invoice (create as pending)
const approveInvoice = async () => {
  if (!selectedMember) {
    toast.error('Please select a member');
    return;
  }
  
  if (draftItems.length === 0) {
    toast.error('Please add at least one item');
    return;
  }
  
  setApproveLoading(true);
  try {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: selectedMember.id,
        status: 'pending',
        reference: draftInvoice.reference,
        issue_date: draftInvoice.issue_date?.toISOString(),
        due_date: draftInvoice.due_date?.toISOString(),
        notes: draftInvoice.notes,
        items: draftItems.map(item => ({
          chargeable_id: item.chargeable_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate
        }))
      })
    });
    
    const result = await response.json();
    if (result.id) {
      toast.success('Invoice approved and sent');
      router.replace(`/dashboard/invoices/edit/${result.id}`);
    } else {
      throw new Error(result.error || 'Failed to approve invoice');
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to approve invoice');
  } finally {
    setApproveLoading(false);
  }
};
```

#### 1.2 Update Component Logic

**Conditional Rendering**:
```typescript
// Show different UI based on mode
if (isNewInvoice) {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-4xl mx-auto">
      {/* New invoice header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/invoices" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
            &larr; Back to Invoices
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={createInvoiceWithItems}
            disabled={saveLoading || !selectedMember || draftItems.length === 0}
          >
            {saveLoading ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            onClick={approveInvoice}
            disabled={approveLoading || !selectedMember || draftItems.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {approveLoading ? 'Approving...' : 'Approve & Send'}
          </Button>
        </div>
      </div>
      
      {/* Invoice form with draft state */}
      <Card className="p-8 shadow-md">
        {/* Form fields using draftInvoice state */}
        {/* ... */}
      </Card>
    </div>
  );
}
```

### Phase 2: Update API Endpoints (1-2 days)

#### 2.1 Update POST /api/invoices

**New Request Body**:
```typescript
interface CreateInvoiceRequest {
  user_id: string;
  status: 'draft' | 'pending';
  reference?: string;
  issue_date?: string;
  due_date?: string;
  notes?: string;
  items?: Array<{
    chargeable_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>;
}
```

**New Implementation**:
```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // ... auth checks ...
  
  const body = await req.json();
  const { user_id, status, reference, issue_date, due_date, notes, items = [] } = body;
  
  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }
  
  try {
    // Get the organization tax rate
    const taxRate = await InvoiceService.getTaxRateForInvoice();
    
    // Use atomic database function to create invoice and transaction
    const { data: result, error } = await supabase.rpc('create_invoice_with_transaction', {
      p_user_id: user_id,
      p_booking_id: null,
      p_status: status,
      p_tax_rate: taxRate,
      p_due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    if (error) {
      console.error('Invoice creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!result.success) {
      console.error('Invoice creation failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    // Update invoice with additional fields
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        reference: reference || null,
        issue_date: issue_date || new Date().toISOString(),
        notes: notes || null
      })
      .eq('id', result.invoice_id);
    
    if (updateError) {
      console.error('Failed to update invoice details:', updateError);
      return NextResponse.json({ error: 'Failed to update invoice details' }, { status: 500 });
    }
    
    // Create invoice items if provided
    if (items.length > 0) {
      const invoiceItems = items.map(item => ({
        invoice_id: result.invoice_id,
        chargeable_id: item.chargeable_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        amount: item.quantity * item.unit_price,
        tax_amount: (item.quantity * item.unit_price) * item.tax_rate,
        line_total: (item.quantity * item.unit_price) * (1 + item.tax_rate)
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);
      
      if (itemsError) {
        console.error('Failed to create invoice items:', itemsError);
        return NextResponse.json({ error: 'Failed to create invoice items' }, { status: 500 });
      }
      
      // Update invoice totals
      await InvoiceService.updateInvoiceTotalsWithTransactionSync(result.invoice_id);
    }
    
    // Fetch the complete invoice to return
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", result.invoice_id)
      .single();
    
    if (fetchError) {
      console.error('Failed to fetch created invoice:', fetchError);
      return NextResponse.json({ error: 'Invoice created but failed to fetch details' }, { status: 500 });
    }
    
    console.log(`Invoice created atomically: ${result.invoice_number} (${result.status})`);
    if (result.transaction_id) {
      console.log(`Transaction created: ${result.transaction_id}`);
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
```

### Phase 3: Update Navigation and Routing (1 day)

#### 3.1 Create New Invoice Redirect Page

**File: `src/app/(auth)/dashboard/invoices/edit/new/page.tsx`**
```typescript
import { redirect } from 'next/navigation';
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

async function NewInvoiceRedirectPage({}: ProtectedPageProps) {
  // Redirect to edit page with new mode
  redirect('/dashboard/invoices/edit/new');
}

export default withRoleProtection(NewInvoiceRedirectPage, ROLE_CONFIGS.ADMIN_ONLY);
```

#### 3.2 Update Main Invoices Page

**File: `src/app/(auth)/dashboard/invoices/page.tsx`**
```typescript
// Update the "New Invoice" button link
<Link href="/dashboard/invoices/edit/new">
  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2">
    <Plus className="w-5 h-5" /> New Invoice
  </Button>
</Link>
```

#### 3.3 Update Edit Page to Handle New Mode

**File: `src/app/(auth)/dashboard/invoices/edit/[id]/page.tsx`**
```typescript
import React from "react";
import InvoiceEditClient from "./InvoiceEditClient";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

interface EditInvoicePageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;
  
  if (!id) return null;
  
  // Handle new invoice mode
  if (id === 'new') {
    return <InvoiceEditClient mode="new" />;
  }
  
  // Handle existing invoice edit
  return <InvoiceEditClient id={id} mode="edit" />;
}

export default withRoleProtection(EditInvoicePage, ROLE_CONFIGS.ADMIN_ONLY);
```

### Phase 4: Remove Old New Invoice Page (1 day)

#### 4.1 Delete Old Files
- `src/app/(auth)/dashboard/invoices/new/page.tsx`
- `src/app/(auth)/dashboard/invoices/new/NewInvoiceForm.tsx`

#### 4.2 Update Any References
- Search for any imports or links to the old new invoice page
- Update navigation components
- Update any documentation

### Phase 5: Testing and Validation (1-2 days)

#### 5.1 Test Scenarios

**New Invoice Creation**:
1. Click "New Invoice" → Should load edit page in new mode
2. Select member → Should update form state (no DB write)
3. Add items → Should update local state
4. Click "Save Draft" → Should create invoice with items atomically
5. Click "Approve & Send" → Should create invoice as pending with items

**Existing Invoice Editing**:
1. Click edit on existing invoice → Should load edit page in edit mode
2. Modify items → Should update via existing API
3. Save changes → Should work as before

**Error Handling**:
1. Try to save without member selected → Should show error
2. Try to save without items → Should show error
3. Network error during save → Should show error and not create invoice

#### 5.2 Data Integrity Verification

**Verify No Empty Drafts**:
```sql
-- Check for empty draft invoices
SELECT 
  i.id,
  i.invoice_number,
  i.status,
  i.total_amount,
  COUNT(ii.id) as item_count
FROM invoices i
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
WHERE i.status = 'draft'
GROUP BY i.id, i.invoice_number, i.status, i.total_amount
HAVING COUNT(ii.id) = 0 AND i.total_amount = 0;
```

**Verify Atomic Creation**:
```sql
-- Check that invoices created with items have correct totals
SELECT 
  i.id,
  i.invoice_number,
  i.status,
  i.total_amount,
  SUM(ii.line_total) as calculated_total
FROM invoices i
JOIN invoice_items ii ON ii.invoice_id = i.id
WHERE i.created_at > NOW() - INTERVAL '1 day'
GROUP BY i.id, i.invoice_number, i.status, i.total_amount
HAVING ABS(i.total_amount - SUM(ii.line_total)) > 0.01;
```

## Benefits of New Approach

### 1. **No Empty Draft Invoices**
- ✅ Invoices only created when user explicitly saves
- ✅ No database pollution with empty records
- ✅ Cleaner data and better performance

### 2. **Better User Experience**
- ✅ No unnecessary redirects
- ✅ Form state preserved during editing
- ✅ Consistent interface for new and edit
- ✅ Clear save/approve actions

### 3. **Improved Data Integrity**
- ✅ Atomic creation with items
- ✅ Consistent state management
- ✅ Better error handling
- ✅ No orphaned records

### 4. **Simplified Codebase**
- ✅ Single component for invoice editing
- ✅ Consistent logic between new and edit
- ✅ Easier maintenance and testing
- ✅ Reduced code duplication

### 5. **Better Performance**
- ✅ No premature database writes
- ✅ Reduced API calls
- ✅ Faster page loads
- ✅ Better caching

## Migration Strategy

### 1. **Backward Compatibility**
- Keep old API endpoints during transition
- Gradual migration of existing functionality
- No breaking changes to existing invoices

### 2. **Rollback Plan**
- Keep old new invoice page as backup
- Database changes are additive only
- Easy to revert if issues arise

### 3. **Testing Strategy**
- Comprehensive unit tests for new component
- Integration tests for API endpoints
- End-to-end tests for user flows
- Performance testing for large datasets

## Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| 1 | 2-3 days | Update InvoiceEditClient.tsx with new mode |
| 2 | 1-2 days | Update API endpoints for atomic creation |
| 3 | 1 day | Update navigation and routing |
| 4 | 1 day | Remove old new invoice page |
| 5 | 1-2 days | Testing and validation |
| **Total** | **6-9 days** | **Complete implementation** |

## Success Metrics

### 1. **Data Quality**
- Zero empty draft invoices created
- 100% of invoices have items when created
- Consistent invoice totals

### 2. **User Experience**
- No unnecessary redirects
- Form state preserved
- Clear save/approve actions
- Faster page loads

### 3. **Code Quality**
- Single component for invoice editing
- Reduced code duplication
- Better error handling
- Comprehensive test coverage

## Conclusion

This consolidation plan addresses all the identified issues with the current invoice creation flow while maintaining backward compatibility and improving the overall user experience. The new approach ensures data integrity, reduces database pollution, and provides a more intuitive interface for invoice management.

The implementation is designed to be incremental and safe, with proper testing and rollback capabilities. Once complete, the system will have a single, robust invoice editing interface that handles both new and existing invoices efficiently.
