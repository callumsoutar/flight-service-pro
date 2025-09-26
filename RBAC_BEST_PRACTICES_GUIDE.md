# RBAC Best Practices Implementation Guide

## Overview

This guide demonstrates the **standardized, reusable approach** for implementing Role-Based Access Control (RBAC) in the Flight Desk Pro application. It follows security best practices and provides consistent patterns for authentication, authorization, and access control.

---

## 🔧 **Core Architecture**

### 1. **Standardized HOC Pattern**
**File**: `src/lib/rbac-page-wrapper.tsx`

The `withRoleProtection` Higher-Order Component provides:
- ✅ **Authentication verification** (redirects to login if not authenticated)
- ✅ **Role-based authorization** (checks user role against allowed roles)
- ✅ **Consistent error handling** (secure redirects on unauthorized access)
- ✅ **Type-safe props injection** (provides user, userRole, isRestrictedUser to components)
- ✅ **Custom validation support** (for complex access control scenarios)

### 2. **Security Layers**

```typescript
// Layer 1: Authentication Check
if (!user) {
  redirect('/login');
}

// Layer 2: Role Authorization
const { authorized, userRole } = await checkServerSideRolePermission(allowedRoles);
if (!authorized) {
  redirect(fallbackUrl);
}

// Layer 3: Custom Validation (optional)
if (customValidation && !await customValidation({ user, userRole, context })) {
  redirect(fallbackUrl);
}

// Layer 4: Secure Props Injection
return <Component user={user} userRole={userRole} isRestrictedUser={isRestrictedUser} />
```

---

## 📋 **Implementation Patterns**

### **Pattern 1: Simple Role Protection**

```typescript
// src/app/(auth)/dashboard/aircraft/page.tsx
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

async function AircraftPage({ user, userRole, isRestrictedUser }: ProtectedPageProps) {
  // Component logic - guaranteed authenticated user with proper role
  return <div>Aircraft Management</div>;
}

// One-liner export with predefined configuration
export default withRoleProtection(AircraftPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);
```

### **Pattern 2: Custom Role Configuration**

```typescript
// src/app/(auth)/settings/page.tsx
import { withRoleProtection, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

async function SettingsPage({ user, userRole }: ProtectedPageProps) {
  return <div>Settings Page</div>;
}

export default withRoleProtection(SettingsPage, {
  allowedRoles: ['admin', 'owner'],
  fallbackUrl: '/dashboard'
});
```

### **Pattern 3: Complex Custom Validation**

```typescript
// src/app/(auth)/dashboard/bookings/view/[id]/page.tsx
import { withRoleProtection, validateBookingAccess, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

async function BookingViewPage({ params, user, userRole }: ProtectedPageProps) {
  const booking = await fetchBooking(params.id);

  // Additional validation after data fetch
  const canAccess = await validateBookingAccess({
    user,
    userRole,
    bookingUserId: booking.user_id
  });

  if (!canAccess) {
    redirect('/dashboard/bookings');
  }

  return <BookingDetails booking={booking} />;
}

export default withRoleProtection(BookingViewPage, {
  allowedRoles: ['student', 'member', 'instructor', 'admin', 'owner'],
  fallbackUrl: '/dashboard/bookings'
});
```

---

## 🎯 **Predefined Role Configurations**

### Available Configurations

```typescript
export const ROLE_CONFIGS = {
  // Admin and Owner only
  ADMIN_ONLY: {
    allowedRoles: ['admin', 'owner'],
    fallbackUrl: '/dashboard'
  },

  // Instructor level and above
  INSTRUCTOR_AND_UP: {
    allowedRoles: ['instructor', 'admin', 'owner'],
    fallbackUrl: '/dashboard'
  },

  // All authenticated users
  AUTHENTICATED_ONLY: {
    allowedRoles: ['student', 'member', 'instructor', 'admin', 'owner'],
    fallbackUrl: '/dashboard'
  }
};
```

### Usage Mapping

| Page/Feature | Configuration | Allowed Roles |
|--------------|---------------|---------------|
| Settings | `ADMIN_ONLY` | Admin, Owner |
| Aircraft Management | `INSTRUCTOR_AND_UP` | Instructor, Admin, Owner |
| Staff Management | `INSTRUCTOR_AND_UP` | Instructor, Admin, Owner |
| Invoicing | `ADMIN_ONLY` | Admin, Owner |
| Training Management | `INSTRUCTOR_AND_UP` | Instructor, Admin, Owner |
| Equipment Management | `INSTRUCTOR_AND_UP` | Instructor, Admin, Owner |
| Task Management | `INSTRUCTOR_AND_UP` | Instructor, Admin, Owner |
| Booking Views | `AUTHENTICATED_ONLY` + custom validation | All (with ownership checks) |

---

## 🔐 **Type Safety & Utilities**

### **Role Constants & Type Checking**

```typescript
import { ROLES, UserRole, isRole, hasRoleOrHigher } from '@/lib/rbac-page-wrapper';

// Type-safe role checking
if (isRole(userRole, ROLES.ADMIN)) {
  // Admin-specific logic
}

// Hierarchical role checking
if (hasRoleOrHigher(userRole, ROLES.INSTRUCTOR)) {
  // Instructor, Admin, or Owner logic
}
```

### **Component Props Interface**

```typescript
export interface ProtectedPageProps {
  /** Authenticated user object from Supabase */
  user: any;
  /** User's primary role (owner/admin/instructor/member/student) */
  userRole: string;
  /** Whether user has restricted access (member/student) */
  isRestrictedUser: boolean;
}
```

---

## 🚀 **Migration Guide**

### **Before (Old Pattern)**

```typescript
// ❌ Repetitive, error-prone pattern
export default async function AircraftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { authorized } = await checkServerSideRolePermission(['admin', 'owner', 'instructor']);

  if (!authorized) {
    redirect('/dashboard');
  }

  // Component logic...
}
```

### **After (New Pattern)**

```typescript
// ✅ Clean, consistent, reusable pattern
async function AircraftPage({ user, userRole, isRestrictedUser }: ProtectedPageProps) {
  // Component logic with guaranteed security context...
}

export default withRoleProtection(AircraftPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);
```

### **Benefits of New Pattern**

1. **🔒 Security**: Consistent authentication and authorization checks
2. **🧹 Clean Code**: Removes repetitive boilerplate from every page
3. **🎯 Type Safety**: TypeScript ensures proper prop usage
4. **🔧 Reusable**: Predefined configurations for common access patterns
5. **🧪 Testable**: Centralized logic is easier to unit test
6. **📚 Maintainable**: Single source of truth for access control logic

---

## 🛡️ **Security Features**

### **Defense in Depth**

1. **Authentication Layer**: Verifies user is logged in
2. **Authorization Layer**: Checks user role against requirements
3. **Custom Validation Layer**: Handles complex business logic (e.g., resource ownership)
4. **Database Layer**: RLS policies provide final enforcement
5. **Client Layer**: UI components use role data for UX optimization

### **Fail-Secure Design**

- **Default Deny**: Access denied unless explicitly authorized
- **Secure Redirects**: Unauthorized users sent to safe pages
- **Error Handling**: Graceful fallbacks on authentication failures
- **Type Safety**: Compile-time checks prevent common mistakes

### **Consistent Behavior**

- **Predictable URLs**: All unauthorized access redirects to `/dashboard`
- **Standard Props**: All protected components receive same security context
- **Logging Ready**: Centralized location for adding audit logs
- **Testing Ready**: Mockable functions for automated testing

---

## 📝 **Development Workflow**

### **Creating a New Protected Page**

1. **Define the Component**
   ```typescript
   async function MyPage({ user, userRole, isRestrictedUser }: ProtectedPageProps) {
     // Your component logic
   }
   ```

2. **Choose Protection Level**
   ```typescript
   // Option A: Use predefined config
   export default withRoleProtection(MyPage, ROLE_CONFIGS.ADMIN_ONLY);

   // Option B: Custom configuration
   export default withRoleProtection(MyPage, {
     allowedRoles: ['custom', 'roles'],
     fallbackUrl: '/custom/redirect'
   });
   ```

3. **Add Custom Validation (if needed)**
   ```typescript
   export default withRoleProtection(MyPage, {
     allowedRoles: ['member', 'instructor'],
     customValidation: async ({ user, userRole, context }) => {
       // Your custom logic
       return true; // or false
     }
   });
   ```

### **Testing Protected Pages**

```typescript
// Mock the protection wrapper for testing
jest.mock('@/lib/rbac-page-wrapper', () => ({
  withRoleProtection: (Component) => Component
}));

// Test component with mocked props
const mockProps = {
  user: { id: '123', email: 'test@example.com' },
  userRole: 'admin',
  isRestrictedUser: false
};
```

---

## 🎨 **Best Practices Summary**

### **DO ✅**

- Use `withRoleProtection` for all protected pages
- Leverage `ROLE_CONFIGS` for common patterns
- Use `ProtectedPageProps` interface for type safety
- Handle custom validation inside components when needed
- Use `isRestrictedUser` for UI conditional logic
- Add debug info in development mode

### **DON'T ❌**

- Don't repeat authentication/authorization logic in components
- Don't rely solely on client-side role checking for security
- Don't hardcode role strings - use `ROLES` constants
- Don't forget to handle loading states and errors
- Don't expose sensitive data to restricted users

### **SECURITY CHECKLIST**

- [ ] Page uses `withRoleProtection` wrapper
- [ ] Appropriate role configuration selected
- [ ] Custom validation added for resource-specific access
- [ ] Client components use `useIsRestrictedUser` for UX
- [ ] Database RLS policies provide backend enforcement
- [ ] No sensitive data exposed to unauthorized users

---

This standardized approach ensures **consistent security**, **maintainable code**, and **excellent developer experience** across the entire Flight Desk Pro application.