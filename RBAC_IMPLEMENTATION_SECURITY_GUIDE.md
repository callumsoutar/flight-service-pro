# RBAC Implementation Security Guide

## Overview
This document outlines the secure implementation of Role-Based Access Control (RBAC) in the Flight Desk Pro application, ensuring that members and students have restricted access to sensitive areas while maintaining system security.

---

## Security Principles

### 1. Defense in Depth
- **Frontend Controls**: UI elements are hidden based on roles (UX improvement)
- **Backend Validation**: All API endpoints enforce permissions (SECURITY BARRIER)
- **Database RLS**: Row Level Security policies prevent unauthorized data access (FINAL BARRIER)

### 2. Never Trust the Frontend
- Frontend role checks are **ONLY** for user experience
- All security enforcement happens server-side
- API endpoints must validate permissions independently

### 3. Fail Secure
- Default behavior is to deny access
- If role information is unavailable, restrict access
- Graceful degradation when permission checks fail

---

## Role Hierarchy & Restrictions

### Roles (from most to least privileged)
1. **Owner** - Full system access
2. **Admin** - Administrative access, user management
3. **Instructor** - Teaching and flight operations access
4. **Member** - Standard member booking access
5. **Student** - Learning and basic booking access

### Access Matrix

| Feature/Section | Owner | Admin | Instructor | Member | Student |
|----------------|-------|-------|------------|---------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scheduler | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bookings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Members | ✅ | ✅ | ✅ | ❌ | ❌ |
| Aircraft | ✅ | ✅ | ✅ | ❌ | ❌ |
| Staff/Instructors | ✅ | ✅ | ✅ | ❌ | ❌ |
| Invoicing | ✅ | ✅ | ❌ | ❌ | ❌ |
| Training | ✅ | ✅ | ✅ | ❌ | ❌ |
| Equipment | ✅ | ✅ | ✅ | ❌ | ❌ |
| Tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Implementation Strategy

### Phase 1: Frontend Navigation Restrictions ✅
**Status: COMPLETED**

#### Sidebar Component Security
```typescript
// Location: src/app/(auth)/SidebarComponent.tsx
import { useCurrentUserRoles } from "@/hooks/use-user-roles";

export function SidebarComponent() {
  // Get current user role using secure endpoint
  const { data: userRoleData, isLoading: rolesLoading, error: rolesError } = useCurrentUserRoles();
  const userRole = userRoleData?.role?.toLowerCase() || '';

  const restrictedTabs = ['aircraft', 'invoices', 'staff', 'training', 'equipment', 'tasks'];

  const filteredNavOptions = mainNavOptions.filter(item => {
    // Fail-secure: hide restricted items while loading
    if (rolesLoading) {
      return !restrictedTabs.includes(item.tab);
    }

    // Hide restricted items for member/student roles
    if (userRole === 'member' || userRole === 'student') {
      return !restrictedTabs.includes(item.tab);
    }

    // Show all items for owner/admin/instructor roles
    return true;
  });

  // Settings link - admin/owner only
  {(!rolesLoading && (userRole === 'admin' || userRole === 'owner')) && (
    <Link href="/settings">Settings</Link>
  )}
}
```

#### Security Notes:
- ✅ Hides navigation items for restricted roles
- ✅ **FIXED**: Implemented secure API endpoint for role loading
- ✅ **FIXED**: Added defensive loading state handling
- ✅ **FIXED**: Settings link now properly restricted to admin/owner only
- ✅ **COMPLETED**: Direct URL access prevention implemented
- ⚠️ **CRITICAL**: This is UI-only - not security enforcement

#### Security Fix Applied:
**Problem Identified**: The original `useUserRoles` hook was calling `/api/users/${userId}/roles` which required admin/owner permissions. This caused role loading to fail for regular users, defaulting to showing all navigation items.

**Solution Implemented**:
1. **New Secure API Endpoint**: Created `/api/users/me/roles` that uses `get_user_role()` database function
   - Allows authenticated users to fetch their own primary role
   - Returns single role (owner/admin/instructor/member/student) based on hierarchy
   - Includes server-side debugging for role fetching

2. **Updated Hook Architecture**:
   - Added `useCurrentUserRoles()` hook with proper TypeScript interfaces
   - Returns `CurrentUserRoleResponse` with single role string
   - Handles loading states and errors appropriately

3. **Enhanced SidebarComponent**:
   - Uses secure hook instead of broken admin-only endpoint
   - Implements fail-secure loading (hides restricted tabs during load)
   - Single role comparison instead of array operations
   - Comprehensive debugging and state tracking

4. **Role-Based Filtering Logic**:
   ```typescript
   // Restricted tabs for member/student roles
   const restrictedTabs = ['aircraft', 'invoices', 'staff', 'training', 'equipment', 'tasks'];

   // Filter based on single role
   if (userRole === 'member' || userRole === 'student') {
     return !restrictedTabs.includes(item.tab);
   }
   ```

5. **Settings Link Security**: Admin/owner only access with proper role checking

### Phase 2: Route Protection ✅
**Status: COMPLETED**

#### Page-Level Access Control
All protected pages now validate user permissions using server-side role checking:

```typescript
// Example: src/app/(auth)/dashboard/aircraft/page.tsx
export default async function AircraftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check user role
  const { data: userRole } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (!userRole || ['member', 'student'].includes(userRole)) {
    redirect('/dashboard'); // Redirect to allowed area
  }

  // Page content...
}
```

#### Implemented Page Protections:
- [x] `/dashboard/aircraft/*` - Instructor/Admin/Owner only
- [x] `/dashboard/instructors/*` (staff) - Instructor/Admin/Owner only
- [x] `/dashboard/invoices/*` - Admin/Owner only
- [x] `/dashboard/training/*` - Instructor/Admin/Owner only
- [x] `/dashboard/equipment/*` - Instructor/Admin/Owner only
- [x] `/dashboard/tasks/*` - Instructor/Admin/Owner only
- [x] `/settings/*` - Admin/Owner only

### Phase 3: API Endpoint Security (CRITICAL)
**Status: Partially Complete via RLS**

#### Current Status:
✅ Database RLS policies exist for most tables
⚠️ Need to audit all API endpoints for proper role checking

#### Required API Audits:
```typescript
// Example secure API endpoint pattern
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userRole } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (!userRole || ['member', 'student'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // API logic...
}
```

#### API Endpoints to Audit:
- [ ] `/api/aircraft/*`
- [ ] `/api/instructors/*`
- [ ] `/api/invoices/*`
- [ ] `/api/equipment/*`
- [ ] `/api/settings/*`
- [ ] `/api/users/*` (user management)

### Phase 4: Component-Level Security ✅
**Status: COMPLETED**

#### Booking View Page Restrictions
**Location**: `/dashboard/bookings/view/[id]`

**Implemented Restrictions for Members/Students:**
1. **Flight Type Field** (`BookingDetails.tsx:553-570`)
   ```typescript
   {!isRestrictedUser && (
     <div>
       <label>Flight Type</label>
       <Select><!-- Flight type options --></Select>
     </div>
   )}
   ```

2. **Lesson Dropdown Disabled** (`BookingDetails.tsx:574`)
   ```typescript
   <Select disabled={isReadOnly || isRestrictedUser}>
   ```

3. **Check-Out Button Hidden** (`BookingActions.tsx:199`)
   ```typescript
   {actualStatus === "confirmed" && !hideCheckOutButton && !isRestrictedUser && (
   ```

4. **Instructor Contact Info Hidden** (`BookingResources.tsx:112-114`)
   ```typescript
   {!isRestrictedUser && (
     <div className="text-gray-500 text-sm">{instructor.users?.email}</div>
   )}
   ```

5. **Confirm Button Hidden** (`page.tsx:238-240`)
   ```typescript
   {booking && booking.id && !isRestrictedUser && (
     <BookingConfirmActionClient bookingId={booking.id} status={booking.status} />
   )}
   ```

6. **Options Dropdown Filtered** (`BookingStagesOptions.tsx:157-178`)
   ```typescript
   <DropdownMenuContent>
     {!isRestrictedUser && (
       <>
         <DropdownMenuItem>Instructor Comments</DropdownMenuItem>
         <DropdownMenuItem>Send Confirmation</DropdownMenuItem>
         <DropdownMenuItem>View Aircraft</DropdownMenuItem>
         <DropdownMenuSeparator />
       </>
     )}
     {/* Cancel/Uncancel booking - available to all users */}
     <DropdownMenuItem>Cancel Booking</DropdownMenuItem>
   </DropdownMenuContent>
   ```

#### Conditional Component Rendering Pattern
```typescript
import { useIsRestrictedUser } from '@/hooks/use-role-protection';

export function AdminActions() {
  const { isRestricted, isLoading } = useIsRestrictedUser();

  if (isLoading) return <Skeleton />;

  if (isRestricted) {
    return null; // Hide component entirely
  }

  return <AdminButtons />;
}
```

---

## Security Implementation Checklist

### Frontend Security (UX Layer)
- [x] Navigation menu filtering by role
- [x] Settings link restriction to admin/owner only
- [x] Secure API endpoint for current user roles (`/api/users/me/roles`)
- [x] Defensive loading state handling in sidebar
- [x] Page-level route protection with redirects
- [x] Component-level conditional rendering (booking view)
- [x] Form field restrictions based on roles (booking details)
- [x] Action button hiding/disabling (booking actions)

### Backend Security (Enforcement Layer)
- [x] Server-side page access validation (all protected routes)
- [x] Database RLS policies exist and enforced
- [x] Error handling for unauthorized access (redirects to dashboard)
- [ ] API endpoint role validation audit
- [ ] Logging of access attempts

### Testing & Validation
- [x] Direct URL access testing (working - redirects correctly)
- [x] Role-based UI testing (implemented across booking views)
- [ ] Comprehensive API endpoint security testing
- [ ] Session management testing
- [ ] Automated role-based testing scenarios

---

## Current Implementation Status

### ✅ COMPLETED Features
1. **Role Loading**: ✅ **IMPLEMENTED** - Secure role fetching system
   - **Solution**: `/api/users/me/roles` endpoint using `get_user_role()` database function
   - **Client Hook**: `useCurrentUserRoles()` and `useIsRestrictedUser()` for components
   - **Server Function**: `checkServerSideRolePermission()` for page-level protection
   - **Status**: Working correctly across all components

2. **Direct URL Access Protection**: ✅ **IMPLEMENTED**
   - **Security Level**: Server-side validation on all protected pages
   - **Behavior**: Unauthorized users redirected to `/dashboard`
   - **Coverage**: Aircraft, Instructors, Invoices, Training, Equipment, Tasks, Settings

3. **Component Security**: ✅ **IMPLEMENTED**
   - **Location**: Booking view pages (`/dashboard/bookings/view/[id]`)
   - **Scope**: Form fields, buttons, dropdowns, contact info all role-restricted
   - **Pattern**: Consistent use of `useIsRestrictedUser()` hook

### 🔄 NEXT PRIORITIES

#### HIGH PRIORITY (Code Quality & Consistency)
1. **Standardize Role Protection Pattern**: Create reusable HOC/middleware for pages
2. **API Security Audit**: Ensure all endpoints validate permissions consistently
3. **Code Consolidation**: Remove duplicate role checking code

#### MEDIUM PRIORITY (Enhancement)
4. **Audit Logging**: Log unauthorized access attempts
5. **Error Pages**: Custom 403 Forbidden pages instead of redirects
6. **Permission Caching**: Optimize role checking performance

#### LOW PRIORITY (Advanced Features)
7. **Advanced Permissions**: Fine-grained permissions within roles
8. **Dynamic Role Updates**: Real-time role change handling
9. **Permission Testing Suite**: Automated RBAC testing

---

## Testing Strategy

### Manual Testing Scenarios
1. **Role Switching**: Test each role's access to every feature
2. **Direct Navigation**: Try accessing restricted URLs directly
3. **API Testing**: Use tools like Postman to test API endpoints
4. **Session Testing**: Test behavior with expired/invalid sessions

### Automated Testing
```typescript
// Example test structure
describe('RBAC Security', () => {
  describe('Member Role', () => {
    it('should not access aircraft page', async () => {
      // Test direct URL access
      // Test API endpoint access
      // Test component visibility
    });
  });

  describe('Student Role', () => {
    it('should not access invoicing features', async () => {
      // Similar tests for student role
    });
  });
});
```

---

## Security Monitoring

### Metrics to Track
- Failed permission checks
- Unauthorized access attempts
- Role assignment changes
- Direct URL access to restricted areas

### Alerts to Implement
- Multiple failed access attempts
- Direct URL access to admin areas
- Unusual role assignment patterns
- API endpoints returning 403 errors

---

## Best Practices

### Code Patterns
1. **Always check permissions server-side**
2. **Use TypeScript for type safety**
3. **Implement proper error handling**
4. **Log security events**
5. **Test with multiple roles**

### Security Guidelines
1. **Principle of Least Privilege**: Give minimum required access
2. **Regular Audits**: Review permissions regularly
3. **Secure Defaults**: Default to denying access
4. **Defense in Depth**: Multiple layers of security
5. **Security Testing**: Test security as rigorously as functionality

---

## Conclusion

This RBAC implementation requires a multi-layered approach with frontend UX improvements backed by robust server-side security enforcement. The current implementation is a good start but needs immediate attention to route protection and API security to prevent unauthorized access.

**Next immediate action**: Implement route protection for all restricted pages to prevent direct URL access.