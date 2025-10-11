'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUserRoles } from './use-user-roles';

interface RoleProtectionOptions {
  allowedRoles: string[];
  redirectTo?: string;
  onUnauthorized?: () => void;
}

export function useRoleProtection({ 
  allowedRoles, 
  redirectTo = '/dashboard',
  onUnauthorized 
}: RoleProtectionOptions) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkRolePermission = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAuthorized(false);
          router.push('/login');
          return;
        }

        // Get user roles
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select(`
            roles!user_roles_role_id_fkey(name)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Extract role names and convert to lowercase for comparison
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roleNames = userRoles?.map((ur: any) => {
          const roles = ur.roles;
          const roleName = Array.isArray(roles) ? roles[0]?.name : roles?.name;
          return roleName?.toLowerCase();
        }).filter(Boolean) || [];
        
        // Check if user has any of the allowed roles
        const hasPermission = allowedRoles.some(role => 
          roleNames.includes(role.toLowerCase())
        );

        setIsAuthorized(hasPermission);

        if (!hasPermission) {
          if (onUnauthorized) {
            onUnauthorized();
          } else {
            router.push(redirectTo);
          }
        }
      } catch (error) {
        console.error('Error checking role permission:', error);
        setIsAuthorized(false);
        router.push(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };

    checkRolePermission();
  }, [allowedRoles, redirectTo, onUnauthorized, router]);

  return { isAuthorized, isLoading };
}

// Server-side role protection utility - moved to separate server-only file

/**
 * Hook to check if current user has restricted access (member/student roles)
 * Returns true if user is member or student, false for owner/admin/instructor
 */
export function useIsRestrictedUser() {
  // Always call the hook unconditionally at the top level
  const { data: userRoleData, isLoading, error } = useCurrentUserRoles();
  const userRole = userRoleData?.role?.toLowerCase() || '';

  return {
    isRestricted: userRole === 'member' || userRole === 'student',
    userRole,
    isLoading,
    error
  };
}
