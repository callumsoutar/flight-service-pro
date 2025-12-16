import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UserRole {
  id: string;
  granted_at: string;
  granted_by: string;
  is_active: boolean;
  roles: {
    id: string;
    name: string;
    description: string;
  };
}

interface UserRolesResponse {
  user_id: string;
  roles: UserRole[];
}

// Hook to fetch user's current roles
export function useUserRoles(userId: string | null) {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async (): Promise<UserRolesResponse> => {
      if (!userId) throw new Error('User ID is required');

      const response = await fetch(`/api/users/${userId}/roles`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user roles');
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Response type for current user's role
interface CurrentUserRoleResponse {
  user_id: string;
  role: string;
}

// Hook to fetch current user's roles (secure endpoint)
export function useCurrentUserRoles() {
  return useQuery({
    queryKey: ['current-user-roles'],
    queryFn: async (): Promise<CurrentUserRoleResponse> => {
      const response = await fetch('/api/users/me/roles');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user roles');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for 10 minutes
    // Prevent refetching on mount/window focus to avoid skeleton flash
    // Data will still be refetched if it's stale (older than staleTime)
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Still refetch on reconnect (network recovery)
    // Use placeholderData to show cached data immediately while refetching
    placeholderData: (previousData) => previousData, // Keep showing previous data while loading
  });
}

// Hook to assign a role to a user
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleName }: { userId: string; roleName: string }) => {
      const response = await fetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role_name: roleName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign role');
      }

      return response.json();
    },
    onSuccess: (_, { userId }) => {
      // Invalidate and refetch user roles
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast.success('Role assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign role');
    },
  });
}

// Hook to remove a role from a user
export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await fetch(`/api/users/${userId}/roles?role_id=${roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove role');
      }

      return response.json();
    },
    onSuccess: (_, { userId }) => {
      // Invalidate and refetch user roles
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast.success('Role removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove role');
    },
  });
}
