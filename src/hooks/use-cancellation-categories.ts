import { useQuery } from '@tanstack/react-query';
import { CancellationCategory } from '@/types/bookings';

interface CancellationCategoriesResponse {
  categories: CancellationCategory[];
}

export function useCancellationCategories() {
  return useQuery<CancellationCategoriesResponse>({
    queryKey: ['cancellation-categories'],
    queryFn: async () => {
      const response = await fetch('/api/cancellation-categories');
      if (!response.ok) {
        throw new Error('Failed to fetch cancellation categories');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
