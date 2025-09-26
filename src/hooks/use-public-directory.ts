import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePublicDirectory() {
  const queryClient = useQueryClient();

  // Query to get current opt-in status
  const { data: publicDirectoryData, isLoading, error } = useQuery({
    queryKey: ['public-directory-status'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/public-directory');
      if (!response.ok) {
        throw new Error('Failed to fetch public directory status');
      }
      return response.json();
    },
  });

  // Mutation to update opt-in status
  const updatePublicDirectoryMutation = useMutation({
    mutationFn: async (public_directory_opt_in: boolean) => {
      const response = await fetch('/api/users/me/public-directory', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_directory_opt_in }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update public directory status');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the public directory status
      queryClient.invalidateQueries({ queryKey: ['public-directory-status'] });
      // Also invalidate members list to reflect changes
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  return {
    publicDirectoryOptIn: publicDirectoryData?.public_directory_opt_in || false,
    isLoading,
    error,
    updatePublicDirectory: updatePublicDirectoryMutation.mutate,
    isUpdating: updatePublicDirectoryMutation.isPending,
    updateError: updatePublicDirectoryMutation.error,
  };
}
