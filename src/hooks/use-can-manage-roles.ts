import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export const useCanManageRoles = () => {
  return useQuery({
    queryKey: ['canManageRoles'],
    queryFn: async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user has admin or owner role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          roles!user_roles_role_id_fkey(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasAdminOrOwner = userRoles?.some((ur: any) => 
        ur.roles?.name === 'admin' || ur.roles?.name === 'owner'
      );

      return hasAdminOrOwner || false;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
