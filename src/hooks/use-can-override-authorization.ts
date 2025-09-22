import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export const useCanOverrideAuthorization = () => {
  return useQuery({
    queryKey: ['canOverrideAuthorization'],
    queryFn: async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check permissions - admin, owner, instructor role, or user with instructor record
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          roles!user_roles_role_id_fkey(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isAdmin = userRoles?.some((ur: any) => ur.roles?.name === 'admin' || ur.roles?.name === 'owner');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isInstructorRole = userRoles?.some((ur: any) => ur.roles?.name === 'instructor');
      
      // Also check if user has an instructor record (users can be instructors without explicit role)
      const { data: instructorRecord } = await supabase
        .from('instructors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const hasInstructorRecord = !!instructorRecord;

      return isAdmin || isInstructorRole || hasInstructorRecord;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
