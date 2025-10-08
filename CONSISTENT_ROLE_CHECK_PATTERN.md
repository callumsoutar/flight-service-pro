# Consistent Role Checking Pattern - Final Implementation

**Date:** January 7, 2025  
**Status:** ✅ FIXED - All Consistent

---

## 🎯 Problem Solved

Initially, I created custom role-checking logic that was **inconsistent** with the rest of your codebase. You correctly pointed out that there was already an established pattern using `check_user_role_simple()` function.

---

## ✅ Consistent Pattern Now Used Everywhere

### 1. **Database Triggers** (Updated)

Both triggers now use the **existing** `check_user_role_simple()` function:

```sql
-- Invoice trigger
CREATE OR REPLACE FUNCTION prevent_approved_invoice_modification()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Use existing check_user_role_simple function
  v_is_admin := check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role]);
  
  IF v_is_admin THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;
  -- ... rest of logic
END;
$$;

-- Invoice items trigger
CREATE OR REPLACE FUNCTION prevent_approved_invoice_item_modification()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Use existing check_user_role_simple function
  v_is_admin := check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role]);
  
  IF v_is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  -- ... rest of logic
END;
$$;
```

### 2. **API Endpoints** (Updated)

All invoice API endpoints now use the **RPC pattern** consistent with other endpoints:

```typescript
// Pattern used in invoices/[id]/route.ts, invoice_items/route.ts
const { data: isAdmin } = await supabase
  .rpc('check_user_role_simple', {
    user_id: user.id,
    allowed_roles: ['admin', 'owner']
  });

if (isAdmin) {
  // Admin/owner can bypass immutability
}
```

**Endpoints Updated:**
- ✅ `PATCH /api/invoices/[id]`
- ✅ `POST /api/invoice_items`
- ✅ `PATCH /api/invoice_items`
- ✅ `DELETE /api/invoice_items`

### 3. **RLS Policies** (Already Correct)

RLS policies already use the consistent pattern:

```sql
-- From 20250107000000_add_instructor_to_invoice_rls_policies.sql
CREATE POLICY "invoices_view_all" 
ON public.invoices 
FOR SELECT 
USING (
  check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])
);
```

---

## 📊 System Architecture

### Core Role Checking Function

```sql
CREATE FUNCTION check_user_role_simple(user_id uuid, allowed_roles user_role[])
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = check_user_role_simple.user_id 
        AND r.name = ANY(allowed_roles)
        AND ur.is_active = true
        AND r.is_active = true
    );
END;
$$;
```

**Key Features:**
- ✅ Handles the JOIN to roles table internally
- ✅ Checks both `ur.is_active` and `r.is_active`
- ✅ Uses `user_role` enum type
- ✅ Security definer (runs with elevated privileges)
- ✅ Returns boolean (simple to use)

### User Role Enum

```sql
CREATE TYPE user_role AS ENUM (
  'admin',      -- Full system access
  'owner',      -- Full system access (business owner)
  'instructor', -- Can manage bookings, lessons, invoices
  'member',     -- Standard member
  'student'     -- Student access
);
```

---

## 🔍 Consistency Verification

### ✅ Database Triggers
```sql
-- Both triggers confirmed to use:
✓ check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])
✓ No manual JOINs
✓ Uses user_role enum
```

### ✅ API Endpoints
```typescript
// All invoice endpoints confirmed to use:
✓ .rpc('check_user_role_simple', { user_id, allowed_roles: ['admin', 'owner'] })
✓ Same pattern as /api/users routes
✓ Clean and simple
```

### ✅ RLS Policies
```sql
// Invoice policies confirmed to use:
✓ check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])
✓ Consistent with other tables
```

---

## 📋 Pattern Reference

### When to Use Each Pattern

**1. Database Functions/Triggers:**
```sql
-- Use check_user_role_simple
v_is_admin := check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role]);
```

**2. API Endpoints (Server-side):**
```typescript
// Use RPC call
const { data: isAdmin } = await supabase
  .rpc('check_user_role_simple', {
    user_id: user.id,
    allowed_roles: ['admin', 'owner']
  });
```

**3. Client-side Hooks:**
```typescript
// Use hooks from use-role-protection.ts or use-user-roles.ts
const { isAuthorized, isLoading } = useRoleProtection({
  allowedRoles: ['admin', 'owner']
});

// Or
const { data: userRoleData } = useCurrentUserRoles();
```

**4. RLS Policies:**
```sql
-- Use check_user_role_simple in USING clause
USING (
  check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role])
)
```

---

## 🎯 Benefits of This Pattern

1. **Consistency** ✅
   - Same logic everywhere
   - Easy to understand and maintain
   - No confusion about how to check roles

2. **DRY (Don't Repeat Yourself)** ✅
   - Single source of truth for role checking
   - Changes to role logic only need to update one function
   - Less code duplication

3. **Security** ✅
   - Security definer function has proper access
   - Checks both user_roles.is_active and roles.is_active
   - Handles edge cases centrally

4. **Maintainability** ✅
   - Clear pattern to follow
   - Easy to add new role checks
   - Simple to audit

---

## 🧪 Testing

### Test Admin/Owner Can Modify Approved Invoice:
```typescript
// As owner user
const response = await fetch('/api/invoice_items', {
  method: 'PATCH',
  body: JSON.stringify({
    id: 'item-id',
    quantity: 5
  })
});

// Expected: ✅ Success (owner can bypass immutability)
```

### Test Regular User Cannot Modify Approved Invoice:
```typescript
// As member user
const response = await fetch('/api/invoice_items', {
  method: 'PATCH',
  body: JSON.stringify({
    id: 'item-id',
    quantity: 5
  })
});

// Expected: ❌ Error "Cannot modify items on approved invoice"
```

---

## 📝 Examples in Codebase

### Already Using This Pattern:
- ✅ `src/app/api/users/route.ts` - Line 207
- ✅ `src/app/api/users/[id]/invite/route.ts` - Line 17
- ✅ All RLS policies in migration files
- ✅ Now: All invoice-related triggers
- ✅ Now: All invoice-related API endpoints

---

## ✅ Summary

**Before (Inconsistent):**
- Database triggers: Manual JOIN to roles table ❌
- API endpoints: Complex role extraction logic ❌
- Not matching existing codebase patterns ❌

**After (Consistent):**
- Database triggers: Use `check_user_role_simple()` ✅
- API endpoints: Use RPC to `check_user_role_simple()` ✅
- Matches existing codebase patterns ✅

**Result:** All role checking now uses the same pattern throughout the codebase! 🎉

---

## 🔗 Related Files

- **Core Function:** Database function `check_user_role_simple()`
- **Enum Type:** `user_role` enum
- **API Pattern:** `src/app/api/users/route.ts`, `src/app/api/users/[id]/invite/route.ts`
- **Updated Triggers:** `prevent_approved_invoice_modification()`, `prevent_approved_invoice_item_modification()`
- **Updated APIs:** `src/app/api/invoices/[id]/route.ts`, `src/app/api/invoice_items/route.ts`
- **Client Hooks:** `src/hooks/use-role-protection.ts`, `src/hooks/use-user-roles.ts`

---

## ✅ Status

**COMPLETE:** All role checking logic is now consistent across:
- ✅ Database triggers
- ✅ API endpoints  
- ✅ RLS policies
- ✅ Client-side hooks (already were)

**The invoice modification should now work correctly for your owner role!** 🚀
