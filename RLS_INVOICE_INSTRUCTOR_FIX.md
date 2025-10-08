# Invoice PDF Download - Critical Bug Fixes

## Issue Summary
Users with `owner`, `admin`, and `instructor` roles were receiving "Forbidden - You can only download your own invoices" error when attempting to download client invoices.

## Root Causes (Two Critical Bugs)

### Bug #1: Incorrect Role Fetch Method in PDF API Route
**The Primary Bug** - The PDF API route was using the **WRONG method** to fetch user roles:

```typescript
// ❌ WRONG - user_roles table doesn't have a 'role' column
const { data: userRoleData } = await supabase
  .from('user_roles')
  .select('role')  // This column doesn't exist!
  .eq('user_id', user.id)
  .single();
```

This query always returned `null` because the `user_roles` table has `role_id` (foreign key), not a `role` column. This caused ALL users (including owners) to fail the role check.

**Fixed to use the standardized RPC function:**
```typescript
// ✅ CORRECT - Use the RPC function like all other API routes
const { data: userRole } = await supabase.rpc('get_user_role', {
  user_id: user.id
});
```

### Bug #2: Missing Instructor Role in RLS Policies
The Supabase Row-Level Security (RLS) policies for invoice-related tables were **missing the `instructor` role** from the allowed roles array.

### Affected Tables
1. **`invoices`** - Missing instructor from `invoices_view_all` and `invoices_manage` policies
2. **`invoice_items`** - Missing instructor from `invoice_items_manage` policy
3. **`payments`** - Missing instructor from `payments_view_all` and `payments_manage` policies

## Solution Applied

### Fix #1: Corrected Role Fetch Method (API Code)
**File:** `/src/app/api/invoices/[id]/pdf/route.ts`

Changed from incorrect table query to standardized RPC function:
```typescript
// Before (BROKEN):
const { data: userRoleData } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();
const userRole = userRoleData?.role?.toLowerCase() || '';

// After (FIXED):
const { data: userRole } = await supabase.rpc('get_user_role', {
  user_id: user.id
});
```

### Fix #2: Database Migrations Applied (via Supabase MCP)
Applied three migrations to add `instructor` role to all invoice-related RLS policies:

1. **`add_instructor_to_invoice_policies`** - Updated invoices table
2. **`add_instructor_to_invoice_items_policies`** - Updated invoice_items table
3. **`add_instructor_to_payments_policies`** - Updated payments table

### Policy Changes

#### Before (Restrictive)
```sql
-- Only admin and owner could access
ARRAY['admin'::user_role, 'owner'::user_role]
```

#### After (Fixed)
```sql
-- Admin, owner, AND instructor can access
ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role]
```

### Updated Policies

#### Invoices Table
- ✅ `invoices_view_all` - Now includes instructor
- ✅ `invoices_manage` - Now includes instructor
- ✅ `invoices_view_own` - Unchanged (users can view their own)

#### Invoice Items Table
- ✅ `invoice_items_manage` - Now includes instructor

#### Payments Table
- ✅ `payments_view_all` - Now includes instructor
- ✅ `payments_manage` - Now includes instructor

## Access Control Summary

### Current Access Levels
- **Admin/Owner/Instructor**: Full access to ALL invoices, invoice items, and payments
- **Members/Students**: Can only view/manage their own invoices (via `invoices_view_own` policy)

## Files Modified

### API Routes (Already Fixed)
- `/src/app/api/invoices/route.ts` - Added instructor to allowed roles
- `/src/app/api/invoices/[id]/pdf/route.ts` - Added instructor to allowed roles

### Page Protection (Already Fixed)
- `/src/app/(auth)/dashboard/invoices/page.tsx` - Using `INSTRUCTOR_AND_UP`
- `/src/app/(auth)/dashboard/invoices/view/[id]/page.tsx` - Using `INSTRUCTOR_AND_UP`
- `/src/app/(auth)/dashboard/invoices/edit/[id]/page.tsx` - Using `INSTRUCTOR_AND_UP`

### Database Migrations (NEW)
- `/supabase/migrations/20250107000000_add_instructor_to_invoice_rls_policies.sql` - Complete RLS policy updates

## Testing Verification

### Test Cases
1. ✅ Owner can download any client invoice
2. ✅ Admin can download any client invoice
3. ✅ Instructor can download any client invoice
4. ✅ Members/Students can only download their own invoices
5. ✅ Draft invoices cannot be downloaded (regardless of role)

### How to Test
1. Log in as an instructor
2. Navigate to any client's invoice
3. Click Options > Download
4. PDF should download successfully without "Forbidden" error

## Key Takeaways

### 1. Use Standardized Patterns Consistently
**Always use `supabase.rpc('get_user_role', { user_id })` to fetch roles** - never query `user_roles` table directly for the role name. The table structure uses foreign keys, not direct role names.

### 2. Check Multiple Security Layers
When implementing role-based access control, **always verify**:
1. ✅ **API Code**: Using correct role-fetching methods
2. ✅ **Application-level permissions**: Page protection and route guards
3. ✅ **Database-level permissions**: RLS policies in Supabase

All three layers must be correctly implemented and in sync!

### 3. Follow Existing Patterns
When adding new API routes, always reference working routes (like `/api/users/route.ts`) to ensure you're using the same standardized patterns for:
- Authentication checks
- Role fetching
- Permission validation
- Error handling

## Related Documentation
- See `INVOICE_PDF_DOWNLOAD_IMPLEMENTATION.md` for PDF feature details
- See `RBAC_IMPLEMENTATION_SECURITY_GUIDE.md` for role-based access patterns

