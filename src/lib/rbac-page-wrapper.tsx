import { redirect } from 'next/navigation';
import { checkServerSideRolePermission } from './server-role-protection';
import { createClient } from './SupabaseServerClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * RBAC Page Wrapper - Standardized Role-Based Access Control for Pages
 *
 * This HOC provides consistent role-based protection for server components.
 * It follows security best practices by:
 * 1. Authenticating the user first
 * 2. Checking user role against allowed roles
 * 3. Redirecting unauthorized users with appropriate fallback
 * 4. Providing user and role data to the protected component
 *
 * @example
 * ```typescript
 * import { withRoleProtection } from '@/lib/rbac-page-wrapper';
 *
 * async function AircraftPage({ user, userRole }) {
 *   // Component logic - guaranteed to have authorized user and role
 * }
 *
 * export default withRoleProtection(AircraftPage, {
 *   allowedRoles: ['admin', 'owner', 'instructor'],
 *   fallbackUrl: '/dashboard'
 * });
 * ```
 */

export interface RoleProtectionConfig {
  /** Array of roles that are allowed to access this page */
  allowedRoles: readonly string[];
  /** URL to redirect to if access is denied (default: '/dashboard') */
  fallbackUrl?: string;
  /** Custom validation logic for complex access control */
  customValidation?: (params: {
    user: SupabaseUser;
    userRole: string;
    context: Record<string, unknown>;
  }) => Promise<boolean> | boolean;
}

export interface ProtectedPageProps {
  /** Authenticated user object from Supabase */
  user: SupabaseUser;
  /** User's primary role (owner/admin/instructor/member/student) */
  userRole: string;
  /** Whether user has restricted access (member/student) */
  isRestrictedUser: boolean;
}

/**
 * Higher-Order Component that wraps pages with role-based access control
 *
 * Note: Uses 'any' for component typing to support Next.js 15 async components with Promise<{params}>.
 * The runtime checks ensure type safety despite the permissive TypeScript signature.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRoleProtection<P = any>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WrappedComponent: React.ComponentType<any>,
  config: RoleProtectionConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (props: P) => Promise<React.ReactElement> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async function ProtectedPage(props: any): Promise<React.ReactElement> {
    const { allowedRoles, fallbackUrl = '/dashboard', customValidation } = config;

    // Step 1: Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    // Step 2: Check user role permissions
    const { authorized, userRole } = await checkServerSideRolePermission(allowedRoles);

    if (!authorized) {
      redirect(fallbackUrl);
    }

    // Step 3: Apply custom validation if provided
    if (customValidation) {
      const customAuthorized = await customValidation({
        user,
        userRole: userRole || '',
        context: props
      });

      if (!customAuthorized) {
        redirect(fallbackUrl);
      }
    }

    // Step 4: Provide security context to component
    const isRestrictedUser = userRole === 'member' || userRole === 'student';

    return (
      <WrappedComponent
        {...props}
        user={user}
        userRole={userRole || ''}
        isRestrictedUser={isRestrictedUser}
      />
    );
  };
}

/**
 * Predefined role configurations for common access patterns
 */
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

/**
 * Utility function for custom booking access validation
 * Used when users should only access their own bookings or when instructors+ can access all
 */
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

/**
 * Type-safe role checking utilities
 */
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  MEMBER: 'member',
  STUDENT: 'student'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const isRole = (userRole: string, expectedRole: UserRole): boolean => {
  return userRole === expectedRole;
};

export const hasRoleOrHigher = (userRole: string, minimumRole: UserRole): boolean => {
  const hierarchy = [ROLES.STUDENT, ROLES.MEMBER, ROLES.INSTRUCTOR, ROLES.ADMIN, ROLES.OWNER];
  const userIndex = hierarchy.indexOf(userRole as UserRole);
  const minIndex = hierarchy.indexOf(minimumRole);
  return userIndex !== -1 && minIndex !== -1 && userIndex >= minIndex;
};