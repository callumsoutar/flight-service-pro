# Security Audit Guide & RBAC Standards
## Duplicate Desk Pro - Authentication & Authorization Framework

**Last Updated:** 2025-10-13
**Audit Completed:** Bookings Module
**Status:** Critical vulnerabilities fixed, ready for module-by-module review

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [RBAC Architecture Overview](#rbac-architecture-overview)
3. [Security Standards & Patterns](#security-standards--patterns)
4. [Completed Audit: Bookings Module](#completed-audit-bookings-module)
5. [Security Checklist for Code Review](#security-checklist-for-code-review)
6. [Common Vulnerabilities to Check](#common-vulnerabilities-to-check)
7. [How to Use This Guide](#how-to-use-this-guide)

---

## Executive Summary

This document provides a comprehensive framework for conducting security audits across the Duplicate Desk Pro application. It documents the established RBAC patterns, common vulnerabilities, and the checklist used to audit the bookings module.

### Key Security Principles
1. **Defense in Depth:** Multiple layers of security (page-level, API-level, database-level)
2. **Least Privilege:** Users only access what they need for their role
3. **Fail Secure:** Default to denying access, explicit grants only
4. **Consistent Patterns:** Standardized approach across all modules

### Role Hierarchy
```
owner > admin > instructor > member > student
```

---

## RBAC Architecture Overview

### 1. Core Infrastructure

#### File: `src/lib/rbac-page-wrapper.tsx`
The central HOC (Higher-Order Component) for protecting server-side pages.

**Key Components:**
- `withRoleProtection()` - HOC that wraps page components
- `ROLE_CONFIGS` - Predefined access configurations
- `validateBookingAccess()` - Resource-specific validation utility
- `ProtectedPageProps` - TypeScript interface for protected pages

**Usage Pattern:**
```typescript
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

interface MyPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function MyPage({ params, user, userRole }: MyPageProps) {
  // Page implementation - guaranteed to have authenticated user and role
}

export default withRoleProtection(MyPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);
```

#### File: `src/lib/server-role-protection.ts`
Server-side role checking utility.

**Key Function:**
```typescript
checkServerSideRolePermission(allowedRoles: readonly string[])
```
Returns: `{ authorized: boolean, user: User, userRole: string }`

---

### 2. Predefined Role Configurations

Located in `src/lib/rbac-page-wrapper.tsx`:

```typescript
export const ROLE_CONFIGS = {
  ADMIN_ONLY: {
    allowedRoles: ['admin', 'owner'],
    fallbackUrl: '/dashboard'
  },
  INSTRUCTOR_AND_UP: {
    allowedRoles: ['instructor', 'admin', 'owner'],
    fallbackUrl: '/dashboard'
  },
  AUTHENTICATED_ONLY: {
    allowedRoles: ['student', 'member', 'instructor', 'admin', 'owner'],
    fallbackUrl: '/dashboard'
  }
} as const;
```

**When to Use Each:**
- `ADMIN_ONLY`: Settings, user management, organization config
- `INSTRUCTOR_AND_UP`: Operational tasks (check-out, complete flights, debrief)
- `AUTHENTICATED_ONLY`: View-only pages, personal data access

---

### 3. Resource-Specific Validation

For pages where users can access their own resources but privileged users can access all:

```typescript
export const validateBookingAccess = async (params: {
  user: SupabaseUser;
  userRole: string;
  bookingUserId: string;
}) => {
  const { user, userRole, bookingUserId } = params;

  // Owners, admins, and instructors can access any booking
  if (['owner', 'admin', 'instructor'].includes(userRole)) {
    return true;
  }

  // Members and students can only access their own bookings
  return user.id === bookingUserId;
};
```

**Pattern:** Use with `AUTHENTICATED_ONLY` config + custom validation inside component.

---

## Security Standards & Patterns

### 1. Page-Level Protection

#### ✅ CORRECT Pattern
```typescript
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

interface MyPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function MyPage({ params, user, userRole }: MyPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch data here - user is guaranteed to be authenticated and authorized
}

export default withRoleProtection(MyPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);
```

#### ❌ INCORRECT Patterns
```typescript
// NO PROTECTION AT ALL
export default async function MyPage({ params }: PageProps) {
  // Anyone can access this!
}

// AUTHENTICATION WITHOUT AUTHORIZATION
export default async function MyPage({ params }: PageProps) {
  const { user } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  // User is authenticated but no role check!
}

// USING 'as any' WITHOUT PROPER HOC SUPPORT
export default withRoleProtection(MyPage as any, ROLE_CONFIGS.ADMIN_ONLY) as any;
// The HOC should accept the component type properly
```

---

### 2. Resource Access Validation

#### ✅ CORRECT Pattern: Authorization BEFORE Data Fetch
```typescript
async function ResourcePage({ params, user, userRole }: ProtectedPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // STEP 1: Fetch MINIMAL data to check ownership
  const { data: minimal } = await supabase
    .from("resources")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!minimal) {
    redirect('/dashboard');
  }

  // STEP 2: Check authorization BEFORE fetching sensitive data
  const canAccess = await validateResourceAccess({
    user,
    userRole,
    resourceUserId: minimal.user_id
  });

  if (!canAccess) {
    redirect('/dashboard');
  }

  // STEP 3: NOW fetch full sensitive data
  const { data: fullResource } = await supabase
    .from("resources")
    .select("*, sensitive_field, financial_data")
    .eq("id", id)
    .single();

  // Use fullResource safely
}
```

#### ❌ INCORRECT Pattern: Authorization AFTER Data Fetch
```typescript
async function ResourcePage({ params, user, userRole }: ProtectedPageProps) {
  // WRONG: Fetching all data first
  const { data: resource } = await supabase
    .from("resources")
    .select("*, sensitive_field, financial_data")
    .eq("id", id)
    .single();

  // THEN checking authorization
  if (resource.user_id !== user.id && !isPrivileged) {
    redirect('/dashboard');
  }
  // Potential timing attack - different response times leak information
}
```

**Why This Matters:**
- **Timing Attacks:** Different query times reveal if resource exists
- **Error Messages:** Verbose errors can leak information
- **Database Load:** Unnecessary queries for unauthorized users
- **Audit Trail:** Want to log unauthorized attempts, not just deny them

---

### 3. API Route Protection

#### ✅ CORRECT Pattern
```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization (role check)
  const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
  const isAuthorized = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

  if (!isAuthorized) {
    return NextResponse.json({
      error: 'Forbidden: Insufficient permissions'
    }, { status: 403 });
  }

  // STEP 3: Resource-specific validation (if needed)
  const body = await req.json();
  const { data: resource } = await supabase
    .from("resources")
    .select("user_id")
    .eq("id", body.resource_id)
    .single();

  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  // Check if user owns resource or is privileged
  const canModify = resource.user_id === user.id || isAuthorized;
  if (!canModify) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // STEP 4: Perform operation
  // ...
}
```

#### ❌ INCORRECT Patterns
```typescript
// NO AUTHENTICATION
export async function POST(req: NextRequest) {
  const body = await req.json();
  // Anyone can call this!
  await supabase.from("resources").update(body);
}

// AUTHENTICATION WITHOUT AUTHORIZATION
export async function POST(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // User is authenticated but no role check - students can do admin actions!
  await supabase.from("admin_settings").update(body);
}

// INCOMPLETE AUTHORIZATION (Common Bug!)
export async function POST(req: NextRequest) {
  // Check in POST...
  const { data: userRole } = await supabase.rpc('get_user_role', ...);
  if (!isAuthorized) return 403;
}

export async function DELETE(req: NextRequest) {
  // But forget to check in DELETE!
  await supabase.from("resources").delete();
}
```

---

### 4. Client Component Security

#### ✅ CORRECT Pattern: Server-Provided Data
```typescript
// Server Component (page.tsx)
async function MyPage({ user, userRole }: ProtectedPageProps) {
  const supabase = await createClient();

  // Fetch data server-side with proper authorization
  const { data: authorizedData } = await supabase
    .from("resources")
    .select("*")
    .eq("user_id", user.id);

  return <ClientComponent data={authorizedData} userRole={userRole} />;
}
```

#### ⚠️ ACCEPTABLE with Caveats: Client-Side Queries
```typescript
// Client Component
'use client';
import { createClient } from '@/lib/SupabaseBrowserClient';

function MyComponent() {
  const supabase = createClient();

  // Direct database query from client
  const { data } = await supabase.from("bookings").select("*");

  // This is ONLY safe if RLS (Row Level Security) policies are in place!
}
```

**When Client-Side Queries Are Acceptable:**
1. **RLS Policies MUST be in place** on the table
2. **Document the RLS dependency** in comments
3. **Prefer API routes** for complex authorization logic
4. **Use for real-time subscriptions** where server-side isn't practical

**Required RLS Policy Documentation:**
```typescript
// This component relies on RLS policy: "users_read_own_bookings"
// Policy ensures users can only read bookings where user_id = auth.uid()
const { data } = await supabase.from("bookings").select("*");
```

---

### 5. TypeScript Type Safety

#### ✅ CORRECT Pattern
The `withRoleProtection` HOC has been updated to accept async components:

```typescript
// In rbac-page-wrapper.tsx
export function withRoleProtection<P extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WrappedComponent: React.ComponentType<P & ProtectedPageProps> | React.ComponentType<any>,
  config: RoleProtectionConfig
) {
  // Implementation
}
```

**Usage in pages:**
```typescript
// Clean, no 'as any' needed
export default withRoleProtection(MyPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);
```

#### ❌ INCORRECT Pattern (Legacy)
```typescript
// Old pattern - avoid this
export default withRoleProtection(MyPage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;
```

---

## Completed Audit: Bookings Module

### Files Audited (7 Pages + 11 API Routes + 56 Components)

#### Pages:
1. ✅ `src/app/(auth)/dashboard/bookings/page.tsx` - Main bookings list
2. ✅ `src/app/(auth)/dashboard/bookings/view/[id]/page.tsx` - View booking
3. ✅ `src/app/(auth)/dashboard/bookings/check-out/[id]/page.tsx` - Check-out
4. ✅ `src/app/(auth)/dashboard/bookings/complete/[id]/page.tsx` - Complete flight
5. ✅ `src/app/(auth)/dashboard/bookings/authorize/[id]/page.tsx` - Flight authorization
6. ✅ `src/app/(auth)/dashboard/bookings/debrief/[id]/page.tsx` - Create debrief
7. ✅ `src/app/(auth)/dashboard/bookings/debrief/view/[id]/page.tsx` - View debrief

#### API Routes:
1. ✅ `src/app/api/bookings/route.ts` - GET, POST, PATCH
2. ✅ `src/app/api/bookings/[id]/cancel/route.ts` - POST
3. ✅ `src/app/api/bookings/[id]/uncancel/route.ts` - POST
4. ✅ `src/app/api/bookings/[id]/complete-flight/route.ts` - POST (calculate, complete)
5. ✅ `src/app/api/bookings/[id]/override-authorization/route.ts` - POST, DELETE
6. ✅ `src/app/api/bookings/[id]/send-confirmation/route.ts`
7. ✅ `src/app/api/bookings/[id]/send-debrief/route.ts`
8. ✅ `src/app/api/bookings/[id]/calculate-preview/route.ts`
9. ✅ `src/app/api/bookings/[id]/debrief-pdf/route.ts`
10. ✅ `src/app/api/bookings/search/route.ts` - Advanced search
11. ✅ `src/app/api/bookings/bulk-notification/route.ts`

### Vulnerabilities Found & Fixed

#### 🔴 CRITICAL #1: Missing Role Protection on Complete Flight Page
**File:** `src/app/(auth)/dashboard/bookings/complete/[id]/page.tsx`
**Issue:** NO role protection at all - any authenticated user could complete bookings
**Impact:** Financial manipulation, aircraft meter tampering, unauthorized invoice creation
**Fix Applied:**
```typescript
// BEFORE
export default async function BookingCompletePage({ params }: PageProps) { ... }

// AFTER
async function BookingCompletePage({ params, user, userRole }: BookingCompletePageProps) { ... }
export default withRoleProtection(BookingCompletePage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);
```

#### 🔴 CRITICAL #2: Missing Authorization on DELETE Override-Authorization
**File:** `src/app/api/bookings/[id]/override-authorization/route.ts`
**Issue:** DELETE endpoint had NO permission checks
**Impact:** Any authenticated user could remove safety authorization overrides
**Fix Applied:**
```typescript
export async function DELETE(request: NextRequest, { params }: ...) {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ADDED: Check permissions (same as POST endpoint)
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select(`roles!user_roles_role_id_fkey(name)`)
    .eq('user_id', user.id)
    .eq('is_active', true);

  const isAdmin = userRoles?.some(ur => ...);
  const isInstructorRole = userRoles?.some(ur => ...);
  const { data: instructorRecord } = await supabase
    .from('instructors')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!isAdmin && !isInstructorRole && !instructorRecord) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Remove override
  // ...
}
```

#### 🟡 HIGH #3: Authorization After Data Fetch (Timing Attack)
**File:** `src/app/(auth)/dashboard/bookings/debrief/[id]/page.tsx`
**Issue:** Fetched full booking data BEFORE checking authorization
**Impact:** Timing attacks, information leakage through different response times
**Fix Applied:**
```typescript
// BEFORE
const { data: bookingData } = await supabase
  .from("bookings")
  .select(`*, user:user_id(*), authorization_override, ...`)
  .eq("id", bookingId)
  .single();

if (booking.user_id !== user.id && !isPrivileged) {
  redirect('/dashboard/bookings');
}

// AFTER
// SECURITY: First, fetch minimal booking data to check authorization
const { data: bookingMinimal } = await supabase
  .from("bookings")
  .select("id, user_id")
  .eq("id", bookingId)
  .single();

if (!bookingMinimal) redirect('/dashboard/bookings');

// Check authorization BEFORE fetching sensitive data
const canAccess = await validateBookingAccess({ user, userRole, bookingUserId: bookingMinimal.user_id });
if (!canAccess) redirect('/dashboard/bookings');

// NOW fetch full data
const { data: bookingData } = await supabase.from("bookings").select(`*, ...`);
```

#### 🟡 HIGH #4: Incomplete Authorization in API
**File:** `src/app/api/bookings/[id]/complete-flight/route.ts`
**Issue:** Members/students could complete their own bookings (financial data manipulation risk)
**Impact:** Unauthorized invoice creation, meter readings manipulation
**Fix Applied:**
```typescript
// BEFORE
const { data: userRole } = await supabase.rpc('get_user_role', { user_id: userId });
const isPrivileged = userRole && ['admin', 'owner', 'instructor'].includes(userRole);
const isOwnBooking = booking.user_id === userId;

if (!isPrivileged && !isOwnBooking) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// AFTER
// Check authorization - Only instructors and above can complete bookings
// This is critical as it involves financial data (invoices) and aircraft meters
const { data: userRole } = await supabase.rpc('get_user_role', { user_id: userId });
const isInstructorOrAbove = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

if (!isInstructorOrAbove) {
  return NextResponse.json({
    error: "Forbidden: Only instructors and above can complete bookings"
  }, { status: 403 });
}
```

#### 🟡 HIGH #5: TypeScript Type Coercions
**Files:** Multiple booking pages
**Issue:** 7 instances of `as any` bypassing type safety
**Impact:** Runtime errors not caught at compile time, harder maintenance
**Fix Applied:**
```typescript
// Updated HOC to properly support async components
export function withRoleProtection<P extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WrappedComponent: React.ComponentType<P & ProtectedPageProps> | React.ComponentType<any>,
  config: RoleProtectionConfig
) { ... }

// Now pages can use clean syntax
export default withRoleProtection(MyPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);
// Instead of: withRoleProtection(MyPage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;
```

---

## Security Checklist for Code Review

Use this checklist when auditing any module. Copy this section and check off items as you review.

### 📄 Page Components (`src/app/(auth)/**/*.tsx`)

#### Authentication & Authorization
- [ ] Page uses `withRoleProtection` HOC
- [ ] Correct `ROLE_CONFIG` is used for the page's purpose
- [ ] Props interface extends `ProtectedPageProps`
- [ ] Function signature includes `user` and `userRole` parameters
- [ ] No direct `supabase.auth.getUser()` calls (HOC handles this)

#### Data Access Patterns
- [ ] For resource pages: Minimal data fetched first for ownership check
- [ ] Authorization check happens BEFORE fetching sensitive data
- [ ] Uses `validateResourceAccess` helper for resource-specific checks
- [ ] Redirects to appropriate fallback URL on unauthorized access
- [ ] No 404 errors that reveal resource existence to unauthorized users

#### Type Safety
- [ ] No `as any` type coercions on exports
- [ ] TypeScript interfaces properly defined
- [ ] Async params handled correctly (`Promise<{ id: string }>`)

### 🔌 API Routes (`src/app/api/**/*.ts`)

#### Authentication
- [ ] Every endpoint checks `supabase.auth.getUser()`
- [ ] Returns 401 for unauthenticated requests
- [ ] Authentication check is FIRST operation in endpoint

#### Authorization
- [ ] Role check using `supabase.rpc('get_user_role')`
- [ ] Appropriate roles checked for the operation
- [ ] Returns 403 for insufficient permissions
- [ ] Authorization check happens BEFORE any data operations

#### Endpoint Coverage
- [ ] GET endpoint has authorization
- [ ] POST endpoint has authorization
- [ ] PATCH/PUT endpoint has authorization
- [ ] DELETE endpoint has authorization (commonly forgotten!)

#### Resource Access
- [ ] For resource-specific endpoints: Verify user owns resource OR has privilege
- [ ] Check resource existence before authorization (don't leak existence)
- [ ] Proper error messages (don't reveal too much information)

#### Input Validation
- [ ] Request body validated (Zod schema or manual checks)
- [ ] UUID fields validated
- [ ] Required fields checked
- [ ] Prevents SQL injection (using parameterized queries)

### 🎨 Client Components (`src/components/**/*.tsx`)

#### Data Fetching
- [ ] Prefers server-provided data via props
- [ ] If using direct Supabase queries:
  - [ ] RLS policy documented in comments
  - [ ] RLS policy verified to exist
  - [ ] Alternative API route considered
- [ ] No authentication logic in client components (should be server-side)

#### UI/UX Security
- [ ] Sensitive data hidden from DOM (not just CSS display:none)
- [ ] Role-based UI rendering (don't show features user can't use)
- [ ] No security-sensitive logic in client-side code
- [ ] Proper error handling (don't leak system information)

### 🗄️ Database Security (RLS Policies)

For tables accessed by client components:

- [ ] RLS enabled on table
- [ ] SELECT policy restricts to authorized users
- [ ] INSERT policy restricts to authorized users
- [ ] UPDATE policy restricts to authorized users
- [ ] DELETE policy restricts to authorized users
- [ ] Policies tested with different role levels
- [ ] Policies documented in schema or migration files

### 📝 Code Quality

- [ ] Clear comments explaining security decisions
- [ ] Consistent error messages across module
- [ ] No console.log with sensitive data in production code
- [ ] Audit logging for sensitive operations (if applicable)

---

## Common Vulnerabilities to Check

### 1. Missing Authorization Checks
```typescript
// ❌ VULNERABLE
export async function DELETE(req: NextRequest, { params }: ...) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Missing role check!
  await supabase.from("resources").delete().eq("id", params.id);
}

// ✅ SECURE
export async function DELETE(req: NextRequest, { params }: ...) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check authorization
  const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
  if (!['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase.from("resources").delete().eq("id", params.id);
}
```

### 2. Incomplete Endpoint Coverage
```typescript
// ❌ VULNERABLE - Only POST is protected
export async function POST(req: NextRequest) {
  // Has authorization check
  const { data: userRole } = await supabase.rpc('get_user_role', ...);
  if (!isAuthorized) return 403;
  // ...
}

export async function DELETE(req: NextRequest) {
  // Missing authorization check!
  await supabase.from("resources").delete();
}

// ✅ SECURE - All endpoints protected
// Extract authorization to a shared function
async function checkAuthorization(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, status: 401 };

  const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
  if (!isAuthorized) return { authorized: false, status: 403 };

  return { authorized: true, user, userRole };
}

export async function POST(req: NextRequest) {
  const auth = await checkAuthorization(req);
  if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  // ...
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAuthorization(req);
  if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  // ...
}
```

### 3. Authorization After Data Fetch
```typescript
// ❌ VULNERABLE - Timing attack possible
async function ResourcePage({ params, user, userRole }: ProtectedPageProps) {
  // Fetch all data first (slow query for large resource)
  const { data: resource } = await supabase
    .from("resources")
    .select("*, sensitive_field, financial_data, related_data(*)")
    .eq("id", params.id)
    .single();

  // Then check authorization
  if (resource.user_id !== user.id && !isPrivileged) {
    redirect('/dashboard'); // Different timing reveals if resource exists
  }
}

// ✅ SECURE - Authorization before sensitive data
async function ResourcePage({ params, user, userRole }: ProtectedPageProps) {
  // Fetch minimal data first (fast query)
  const { data: minimal } = await supabase
    .from("resources")
    .select("id, user_id")
    .eq("id", params.id)
    .single();

  if (!minimal) redirect('/dashboard');

  // Check authorization
  const canAccess = minimal.user_id === user.id || isPrivileged;
  if (!canAccess) redirect('/dashboard');

  // NOW fetch sensitive data
  const { data: resource } = await supabase
    .from("resources")
    .select("*, sensitive_field, financial_data, related_data(*)")
    .eq("id", params.id)
    .single();
}
```

### 4. Information Disclosure Through Errors
```typescript
// ❌ VULNERABLE - Reveals too much
if (!canAccess) {
  return NextResponse.json({
    error: `You don't have permission to access booking ${bookingId} owned by user ${booking.user_id}`
  }, { status: 403 });
}

// ✅ SECURE - Generic error message
if (!canAccess) {
  return NextResponse.json({
    error: 'Resource not found'
  }, { status: 404 }); // Use 404 instead of 403 to not reveal existence
}
```

### 5. Client-Side Role Checks
```typescript
// ❌ VULNERABLE - Client-side only
'use client';
function AdminPanel() {
  const { userRole } = useUserRole(); // Client hook

  if (userRole !== 'admin') {
    return <div>Access Denied</div>;
  }

  // Renders admin UI - but API calls will work if no server-side checks!
  return <button onClick={deleteAllUsers}>Delete All Users</button>;
}

// ✅ SECURE - Server-side protection
// page.tsx (server component)
async function AdminPage({ user, userRole }: ProtectedPageProps) {
  // Server-side check via HOC
  return <AdminPanelClient userRole={userRole} />;
}
export default withRoleProtection(AdminPage, ROLE_CONFIGS.ADMIN_ONLY);

// AdminPanelClient.tsx
'use client';
function AdminPanelClient({ userRole }: { userRole: string }) {
  // Can safely assume user is admin because server component validated it
  return <button onClick={deleteAllUsers}>Delete All Users</button>;
}
```

### 6. Mass Assignment Vulnerabilities
```typescript
// ❌ VULNERABLE - User can set any field
export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // User could send { role: 'admin', is_banned: false, ... }
  await supabase
    .from("users")
    .update(body) // Updates ALL fields from body!
    .eq("id", user.id);
}

// ✅ SECURE - Whitelist allowed fields
export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // Only allow specific fields to be updated
  const allowedFields = ['first_name', 'last_name', 'email', 'phone'];
  const updates: Record<string, unknown> = {};

  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);
}
```

### 7. Insecure Direct Object References (IDOR)
```typescript
// ❌ VULNERABLE - User can access any booking by changing ID
export async function GET(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bookingId = req.nextUrl.searchParams.get("id");

  // No check if user owns this booking!
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  return NextResponse.json({ booking: data });
}

// ✅ SECURE - Verify ownership or privilege
export async function GET(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bookingId = req.nextUrl.searchParams.get("id");

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Check ownership or privilege
  const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
  const isPrivileged = ['admin', 'owner', 'instructor'].includes(userRole);
  const isOwner = booking.user_id === user.id;

  if (!isPrivileged && !isOwner) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  return NextResponse.json({ booking });
}
```

---

## How to Use This Guide

### For Comprehensive Module Audits

1. **Choose a module to audit** (e.g., "Members", "Aircraft", "Invoices", "Settings")

2. **Identify all related files:**
   ```bash
   # Find all page components
   find src/app -name "*.tsx" | grep -i "<module-name>"

   # Find all API routes
   find src/app/api -name "*.ts" | grep -i "<module-name>"

   # Find all client components
   find src/components -name "*.tsx" | grep -i "<module-name>"
   ```

3. **Create a checklist document:**
   ```markdown
   # Security Audit: [Module Name]
   Date: [Today's Date]
   Auditor: [Your Name or "Claude"]

   ## Scope
   - [ ] X page components
   - [ ] Y API routes
   - [ ] Z client components

   ## Files to Audit
   ### Pages
   - [ ] path/to/page1.tsx
   - [ ] path/to/page2.tsx

   ### API Routes
   - [ ] path/to/route1.ts
   - [ ] path/to/route2.ts

   ### Components
   - [ ] path/to/component1.tsx
   ```

4. **For each file, use the checklist:**
   - Copy the relevant section from "Security Checklist for Code Review"
   - Check off items as you verify them
   - Document any issues found

5. **Compile findings:**
   ```markdown
   ## Vulnerabilities Found

   ### Critical
   - [ ] Issue description
     - File: path/to/file.tsx:123
     - Impact: ...
     - Fix: ...

   ### High
   - [ ] ...

   ### Medium
   - [ ] ...

   ### Low
   - [ ] ...
   ```

6. **Prioritize fixes:**
   - Critical: Fix immediately
   - High: Fix before next release
   - Medium: Fix within sprint
   - Low: Add to backlog

### For Quick Spot Checks

Use these grep commands to find common issues:

```bash
# Find pages without withRoleProtection
grep -r "export default async function" src/app/\(auth\) --include="*.tsx" | grep -v "withRoleProtection"

# Find API routes without auth check
grep -r "export async function" src/app/api --include="*.ts" -A 3 | grep -L "auth.getUser"

# Find 'as any' type coercions
grep -r "as any" src/app --include="*.tsx" --include="*.ts"

# Find client-side Supabase queries
grep -r "createClient()" src/components --include="*.tsx" -B 2

# Find DELETE endpoints (commonly have missing auth)
grep -r "export async function DELETE" src/app/api --include="*.ts"
```

### For AI-Assisted Audits

**Prompt Template:**
```
I need you to perform a security audit of the [MODULE NAME] module in my Next.js application.

Please review the following files and check for:
1. Missing or incorrect role protection on pages
2. Missing or incomplete authorization in API routes
3. Timing attacks (authorization after data fetch)
4. Information disclosure through errors
5. Insecure direct object references (IDOR)
6. Client-side security logic that should be server-side
7. Missing RLS policies for client-side queries

Use the security checklist from SECURITY_AUDIT_GUIDE.md and provide:
- List of vulnerabilities found (categorized by severity)
- Specific file paths and line numbers
- Code snippets showing the issue
- Recommended fixes with code examples
- Priority level for each fix

Files to audit:
[PASTE FILE PATHS HERE]

Here is the security checklist to use:
[PASTE RELEVANT CHECKLIST SECTION]
```

---

## Appendix A: Role Permission Matrix

| Action | Student | Member | Instructor | Admin | Owner |
|--------|---------|--------|------------|-------|-------|
| View own bookings | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all bookings | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create booking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own booking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit any booking | ❌ | ❌ | ✅ | ✅ | ✅ |
| Cancel own booking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cancel any booking | ❌ | ❌ | ✅ | ✅ | ✅ |
| Check-out flight | ❌ | ❌ | ✅ | ✅ | ✅ |
| Complete flight | ❌ | ❌ | ✅ | ✅ | ✅ |
| Authorize flight | ❌ | ❌ | ✅ | ✅ | ✅ |
| Override authorization | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create debrief | ❌ | ❌ | ✅ | ✅ | ✅ |
| View own debrief | ✅ | ✅ | ✅ | ✅ | ✅ |
| View any debrief | ❌ | ❌ | ✅ | ✅ | ✅ |
| Modify invoices | ❌ | ❌ | ✅ | ✅ | ✅ |
| View aircraft meters | ❌ | ❌ | ✅ | ✅ | ✅ |
| Modify aircraft meters | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage organization | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage settings | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Appendix B: HTTP Status Codes

Use these consistently across the application:

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET/PATCH/PUT request |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid input, validation failure |
| 401 | Unauthorized | Not authenticated (no valid session) |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist OR user lacks permission (security) |
| 409 | Conflict | Resource conflict (e.g., double-booking) |
| 422 | Unprocessable Entity | Validation error (alternative to 400) |
| 500 | Internal Server Error | Unexpected server error |

**Security Note:** Use 404 instead of 403 when you don't want to reveal that a resource exists to unauthorized users.

---

## Appendix C: Audit Log Template

When auditing modules, use this template:

```markdown
# Security Audit: [Module Name]

**Date:** [Date]
**Auditor:** [Name/Claude]
**Status:** [In Progress / Complete]

## Scope
- **Pages:** X files
- **API Routes:** Y files
- **Components:** Z files
- **Estimated Time:** [Hours]

## Files Audited

### Pages
- [x] path/to/file.tsx - ✅ Secure
- [ ] path/to/file.tsx - ⚠️ Issues found
- [ ] path/to/file.tsx - 🔴 Critical

### API Routes
- [x] path/to/route.ts - ✅ Secure
- [ ] path/to/route.ts - ⚠️ Issues found

### Components
- [x] path/to/component.tsx - ✅ Secure

## Vulnerabilities Found

### 🔴 Critical (Must Fix Before Launch)
None found / [List issues]

### 🟡 High (Fix Before Next Release)
None found / [List issues]

### 🟠 Medium (Fix This Sprint)
None found / [List issues]

### 🔵 Low (Add to Backlog)
None found / [List issues]

## Summary

**Total Issues:** X
**Critical:** X
**High:** X
**Medium:** X
**Low:** X

**Security Posture:** [Excellent / Good / Fair / Poor]

**Recommendation:** [Ready for production / Needs fixes / Major refactor needed]

## Next Steps

1. [ ] Fix critical issues
2. [ ] Fix high-priority issues
3. [ ] Review and test fixes
4. [ ] Update documentation
5. [ ] Mark module as audited
```

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-10-13 | Initial audit guide created based on bookings module audit | Claude |
| 2025-10-13 | Added comprehensive checklists and vulnerability examples | Claude |
| 2025-10-13 | Documented all fixes applied to bookings module | Claude |

---

## References

- Next.js 15 Documentation: https://nextjs.org/docs
- Supabase RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- TypeScript Best Practices: https://typescript-eslint.io/

---

**END OF DOCUMENT**

This guide should be updated as new security patterns are established or vulnerabilities are discovered.
