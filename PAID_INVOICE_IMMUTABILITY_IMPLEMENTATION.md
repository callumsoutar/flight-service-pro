# Paid Invoice Immutability Implementation

**Date:** October 7, 2025  
**Branch:** chargeable-types

## Overview

This document outlines the implementation of paid invoice immutability across the entire invoice system. Paid invoices are now completely immutable for compliance and accounting integrity, regardless of user permissions (including admin and owner roles).

## Rationale

Paid invoices represent completed financial transactions and must be immutable for:
- **Accounting Compliance**: Maintain accurate financial records
- **Audit Trail**: Preserve historical transaction data
- **Legal Requirements**: Meet financial reporting standards
- **Data Integrity**: Prevent retroactive changes to completed transactions

Any adjustments to paid invoices should be made through **credit notes**, which create a proper audit trail while maintaining the integrity of the original transaction.

---

## Changes Implemented

### 1. UI Level Protection

#### InvoiceOptionsDropdown Component
**File:** `src/components/invoices/InvoiceOptionsDropdown.tsx`

**Change:** Hide the "Edit" option for paid invoices in view mode

```typescript
// View mode: Show Edit option (not for paid invoices)
{mode === 'view' && isAdminOrOwner && status !== 'paid' && (
  <>
    <DropdownMenuItem onClick={() => router.push(`/dashboard/invoices/edit/${invoiceId}`)}>
      <Pencil className="w-4 h-4 mr-2" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuSeparator />
  </>
)}
```

**Impact:** Users (including admins) will no longer see the "Edit" option for paid invoices in the options dropdown.

---

### 2. Page Level Protection

#### Edit Invoice Page
**File:** `src/app/(auth)/dashboard/invoices/edit/[id]/page.tsx`

**Change:** Server-side redirect when attempting to edit a paid invoice

```typescript
// Check if invoice is paid - redirect to view if it is
const supabase = await createClient();
const { data: invoice } = await supabase
  .from('invoices')
  .select('status')
  .eq('id', id)
  .single();

// Paid invoices cannot be edited - redirect to view page
if (invoice && invoice.status === 'paid') {
  redirect(`/dashboard/invoices/view/${id}`);
}
```

**Impact:** If a user directly navigates to the edit URL for a paid invoice, they will be automatically redirected to the view page.

---

### 3. API Level Protection

#### Invoice PATCH Endpoint
**File:** `src/app/api/invoices/[id]/route.ts`

**Change:** Reject all modification attempts on paid invoices

```typescript
// Paid invoices are immutable - cannot be edited by anyone, including admins
// This is for compliance and accounting integrity
if (currentInvoice.status === 'paid') {
  return NextResponse.json({ 
    error: `Cannot modify paid invoice ${currentInvoice.invoice_number}. Paid invoices are immutable for compliance.`,
    invoice_status: currentInvoice.status,
    invoice_number: currentInvoice.invoice_number,
    hint: 'Create a credit note to adjust a paid invoice.'
  }, { status: 403 });
}
```

**Impact:** API-level protection prevents any modifications to paid invoices, even through direct API calls or admin overrides.

#### Invoice PATCH Endpoint (Bulk Update)
**File:** `src/app/api/invoices/route.ts`

**Change:** Reject modification attempts on paid invoices, except for payment workflow fields

```typescript
// Paid invoices are immutable - only allow payment workflow fields to be updated
// (total_paid, balance_due, paid_date, status, updated_at)
if (currentInvoice.status === 'paid') {
  const paymentWorkflowFields = ['total_paid', 'balance_due', 'paid_date', 'status', 'updated_at'];
  const nonPaymentFields = Object.keys(updateFields).filter(f => !paymentWorkflowFields.includes(f));
  
  if (nonPaymentFields.length > 0) {
    return NextResponse.json({ 
      error: `Cannot modify ${nonPaymentFields.join(', ')} on paid invoice ${currentInvoice.invoice_number}. Paid invoices are immutable for compliance.`,
      invoice_status: currentInvoice.status,
      invoice_number: currentInvoice.invoice_number,
      disallowed_fields: nonPaymentFields,
      hint: 'Create a credit note to adjust a paid invoice.'
    }, { status: 403 });
  }
}
```

**Important Note:** This endpoint allows updating payment-related fields (`total_paid`, `balance_due`, `paid_date`, `status`) on paid invoices. This is necessary to support:
- Refunds that change status from `paid` to `refunded`
- Credit note applications that adjust balances
- Payment corrections

All other fields (e.g., `subtotal`, `tax_total`, `total_amount`, `user_id`, `reference`) remain immutable for paid invoices.

---

### 4. Invoice Items API Protection

#### Invoice Items POST Endpoint
**File:** `src/app/api/invoice_items/route.ts`

**Change:** Prevent adding items to paid invoices

```typescript
// Paid invoices are immutable - cannot add items, even for admins
if (invoice.status === 'paid') {
  return NextResponse.json({ 
    error: `Cannot add items to paid invoice ${invoice.invoice_number}. Paid invoices are immutable for compliance.`,
    invoice_status: invoice.status,
    invoice_number: invoice.invoice_number,
    hint: 'Create a credit note to adjust a paid invoice.'
  }, { status: 403 });
}
```

#### Invoice Items PATCH Endpoint
**File:** `src/app/api/invoice_items/route.ts`

**Change:** Prevent modifying items on paid invoices

```typescript
// Paid invoices are immutable - cannot modify items, even for admins
if (invoice.status === 'paid') {
  return NextResponse.json({ 
    error: `Cannot modify items on paid invoice ${invoice.invoice_number}. Paid invoices are immutable for compliance.`,
    invoice_status: invoice.status,
    invoice_number: invoice.invoice_number,
    hint: 'Create a credit note to adjust a paid invoice.'
  }, { status: 403 });
}
```

#### Invoice Items DELETE Endpoint
**File:** `src/app/api/invoice_items/route.ts`

**Change:** Prevent deleting items from paid invoices

```typescript
// Paid invoices are immutable - cannot delete items, even for admins
if (invoice.status === 'paid') {
  return NextResponse.json({ 
    error: `Cannot delete items from paid invoice ${invoice.invoice_number}. Paid invoices are immutable for compliance.`,
    invoice_status: invoice.status,
    invoice_number: invoice.invoice_number,
    hint: 'Create a credit note to adjust a paid invoice.'
  }, { status: 403 });
}
```

**Impact:** Complete protection of invoice items for paid invoices. No items can be added, modified, or deleted.

---

## Protection Layers

The implementation provides multiple layers of protection:

1. **UI Layer**: Visual elements (buttons, links) are hidden
2. **Navigation Layer**: Server-side redirects prevent direct URL access
3. **API Layer**: Backend validation rejects modification attempts
4. **Item API Layer**: Invoice items cannot be added, modified, or deleted

This defense-in-depth approach ensures that paid invoices remain immutable regardless of how the system is accessed.

---

## HTTP Status Codes

- **403 Forbidden**: Returned when attempting to modify a paid invoice (indicates the action is permanently forbidden)
- **400 Bad Request**: Returned for other validation errors on non-paid invoices

The use of 403 (Forbidden) rather than 400 (Bad Request) emphasizes that modifying paid invoices is not allowed under any circumstances.

---

## Alternative: Credit Notes

When adjustments are needed for paid invoices, users should use the **Credit Note** system:

1. Navigate to the paid invoice
2. Create a credit note for the adjustment amount
3. Apply the credit note to the invoice or member's account

This approach:
- Maintains the integrity of the original paid invoice
- Creates a proper audit trail
- Follows standard accounting practices
- Preserves compliance requirements

---

## Admin Override Behavior

**Previous Behavior:**
- Admins and owners could modify any invoice, including paid invoices

**New Behavior:**
- Admins and owners can modify draft, pending, overdue, and cancelled invoices
- Paid invoices are immutable for **all users**, including admins and owners
- Admin override logs are still recorded for non-paid invoice modifications

This ensures that financial records remain accurate and tamper-proof, even by privileged users.

---

## Testing Checklist

- [x] UI: Edit button hidden for paid invoices in dropdown
- [x] Navigation: Direct URL access to edit paid invoices redirects to view
- [x] API (`/api/invoices/[id]`): PATCH requests to paid invoices return 403 error
- [x] API (`/api/invoices`): PATCH requests attempting to modify non-payment fields on paid invoices return 403 error
- [x] API (`/api/invoices`): PATCH requests updating only payment fields on paid invoices succeed (for refunds/corrections)
- [x] Items: Cannot add items to paid invoices (403 error)
- [x] Items: Cannot modify items on paid invoices (403 error)
- [x] Items: Cannot delete items from paid invoices (403 error)
- [x] Admin: Admin users cannot edit paid invoices (except payment workflow fields)
- [x] Messages: User-friendly error messages with credit note guidance

---

## Related Documentation

- Credit Note System: `CREDIT_NOTE_SYSTEM_IMPLEMENTATION.md`
- Invoice System: `INVOICE_SYSTEM_IMPLEMENTATION_COMPLETE.md`
- Admin Override System: `ADMIN_OVERRIDE_SYSTEM.md`
- Invoice Audit Plan: `invoice-system-audit.plan.md`

---

## Security Considerations

1. **Compliance**: Paid invoices are financial records that must not be altered
2. **Audit Trail**: All modifications are tracked, but paid invoices remain immutable
3. **Data Integrity**: Protection at multiple layers prevents any unauthorized changes
4. **User Experience**: Clear error messages guide users to the correct procedure (credit notes)

---

## Future Enhancements

Consider implementing:
1. Database-level triggers to enforce paid invoice immutability
2. Automated credit note suggestions when users attempt to modify paid invoices
3. Read-only view mode indicators for paid invoices
4. Comprehensive audit logging for all paid invoice access attempts

---

## Summary

Paid invoices are now completely immutable across the entire system. This implementation:
- Protects financial data integrity
- Ensures accounting compliance
- Provides clear guidance to users
- Maintains audit trails through credit notes
- Works consistently across all user roles

Any adjustments to paid invoices must be made through the credit note system, which preserves the original transaction while creating a proper audit trail for the adjustment.

