import { createClient } from '@/lib/supabase/server';

// Server-side role protection utility
export async function checkServerSideRolePermission(allowedRoles: readonly string[]) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, user: null };
  }

  // Get user roles using the RPC function
  const { data: userRole, error } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (error) {
    console.error('Error fetching user role:', error);
    return { authorized: false, user, userRole: null };
  }

  // Check if user has permission
  const hasPermission = userRole && allowedRoles.map(r => r.toLowerCase()).includes(userRole.toLowerCase());

  return {
    authorized: !!hasPermission,
    user,
    userRole
  };
}