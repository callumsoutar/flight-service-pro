import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BusinessHours, BusinessHoursResponse, UpdateBusinessHoursRequest } from '@/types/business_hours';

const BUSINESS_HOURS_QUERY_KEY = ['business-hours'];

// Fetch business hours
async function fetchBusinessHours(): Promise<BusinessHours> {
  const response = await fetch('/api/business-hours');
  
  if (!response.ok) {
    throw new Error('Failed to fetch business hours');
  }
  
  const data: BusinessHoursResponse = await response.json();
  return data.business_hours;
}

// Update business hours
async function updateBusinessHours(updateData: UpdateBusinessHoursRequest): Promise<BusinessHours> {
  const response = await fetch('/api/business-hours', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update business hours');
  }
  
  const data: BusinessHoursResponse = await response.json();
  return data.business_hours;
}

export function useBusinessHours() {
  return useQuery({
    queryKey: BUSINESS_HOURS_QUERY_KEY,
    queryFn: fetchBusinessHours,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateBusinessHours() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateBusinessHours,
    onSuccess: () => {
      // Invalidate and refetch business hours
      queryClient.invalidateQueries({ queryKey: BUSINESS_HOURS_QUERY_KEY });
    },
  });
}