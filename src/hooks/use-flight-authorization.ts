import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { 
  FlightAuthorization, 
  FlightAuthorizationCreateRequest,
  FlightAuthorizationUpdateRequest,
  FlightAuthorizationApprovalRequest,
  FlightAuthorizationRejectionRequest,
  FlightAuthorizationResponse,
  FlightAuthorizationsListResponse,
  FlightAuthorizationActionResponse
} from '@/types/flight_authorizations';

// Fetch single authorization
export function useFlightAuthorization(id: string | null) {
  return useQuery({
    queryKey: ['flight-authorization', id],
    queryFn: async (): Promise<FlightAuthorization> => {
      if (!id) throw new Error('Authorization ID is required');
      
      const response = await fetch(`/api/flight-authorizations/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch flight authorization');
      }
      
      const data: FlightAuthorizationResponse = await response.json();
      return data.authorization;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Fetch authorization by booking ID
export function useFlightAuthorizationByBooking(bookingId: string | null) {
  return useQuery({
    queryKey: ['flight-authorization-by-booking', bookingId],
    queryFn: async (): Promise<FlightAuthorization | null> => {
      if (!bookingId) throw new Error('Booking ID is required');
      
      const response = await fetch(`/api/flight-authorizations?booking_id=${bookingId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch flight authorization');
      }
      
      const data: FlightAuthorizationsListResponse = await response.json();
      return data.authorizations.length > 0 ? data.authorizations[0] : null;
    },
    enabled: !!bookingId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Fetch list of authorizations with filters
export function useFlightAuthorizations(filters?: {
  status?: string;
  student_id?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.student_id) queryParams.append('student_id', filters.student_id);
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  if (filters?.offset) queryParams.append('offset', filters.offset.toString());

  return useQuery({
    queryKey: ['flight-authorizations', filters],
    queryFn: async (): Promise<FlightAuthorizationsListResponse> => {
      const response = await fetch(`/api/flight-authorizations?${queryParams.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch flight authorizations');
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}

// Create new authorization
export function useCreateFlightAuthorization(options?: {
  onSuccess?: (authorization: FlightAuthorization) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FlightAuthorizationCreateRequest): Promise<FlightAuthorization> => {
      const response = await fetch('/api/flight-authorizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create flight authorization');
      }

      const result: FlightAuthorizationResponse = await response.json();
      return result.authorization;
    },
    onSuccess: (authorization) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['flight-authorizations'] });
      queryClient.invalidateQueries({ queryKey: ['flight-authorization-by-booking', authorization.booking_id] });
      queryClient.setQueryData(['flight-authorization', authorization.id], authorization);
      
      options?.onSuccess?.(authorization);
    },
    onError: options?.onError,
  });
}

// Update authorization
export function useUpdateFlightAuthorization(options?: {
  onSuccess?: (authorization: FlightAuthorization) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FlightAuthorizationUpdateRequest): Promise<FlightAuthorization> => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/flight-authorizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update flight authorization');
      }

      const result: FlightAuthorizationResponse = await response.json();
      return result.authorization;
    },
    onSuccess: (authorization) => {
      // Update cached data
      queryClient.invalidateQueries({ queryKey: ['flight-authorizations'] });
      queryClient.setQueryData(['flight-authorization', authorization.id], authorization);
      queryClient.setQueryData(['flight-authorization-by-booking', authorization.booking_id], authorization);
      
      options?.onSuccess?.(authorization);
    },
    onError: options?.onError,
  });
}

// Submit authorization for approval
export function useSubmitFlightAuthorization(options?: {
  onSuccess?: (authorization: FlightAuthorization) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (authorizationId: string): Promise<FlightAuthorization> => {
      const response = await fetch(`/api/flight-authorizations/${authorizationId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit flight authorization');
      }

      const result: FlightAuthorizationActionResponse = await response.json();
      return result.authorization;
    },
    onSuccess: (authorization) => {
      // Invalidate all related queries to force fresh data
      queryClient.invalidateQueries({ queryKey: ['flight-authorizations'] });
      queryClient.invalidateQueries({ queryKey: ['flight-authorization', authorization.id] });
      queryClient.invalidateQueries({ queryKey: ['flight-authorization-by-booking', authorization.booking_id] });

      // Remove the old cached data and set fresh data
      queryClient.removeQueries({ queryKey: ['flight-authorization', authorization.id] });
      queryClient.removeQueries({ queryKey: ['flight-authorization-by-booking', authorization.booking_id] });

      // Set the updated data in cache
      queryClient.setQueryData(['flight-authorization', authorization.id], authorization);
      queryClient.setQueryData(['flight-authorization-by-booking', authorization.booking_id], authorization);

      options?.onSuccess?.(authorization);
    },
    onError: options?.onError,
  });
}

// Approve authorization (instructors only)
export function useApproveFlightAuthorization(options?: {
  onSuccess?: (authorization: FlightAuthorization) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FlightAuthorizationApprovalRequest): Promise<FlightAuthorization> => {
      const { id, ...approvalData } = data;
      const response = await fetch(`/api/flight-authorizations/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve flight authorization');
      }

      const result: FlightAuthorizationActionResponse = await response.json();
      return result.authorization;
    },
    onSuccess: (authorization) => {
      // Update cached data
      queryClient.invalidateQueries({ queryKey: ['flight-authorizations'] });
      queryClient.setQueryData(['flight-authorization', authorization.id], authorization);
      queryClient.setQueryData(['flight-authorization-by-booking', authorization.booking_id], authorization);
      
      options?.onSuccess?.(authorization);
    },
    onError: options?.onError,
  });
}

// Reject authorization (instructors only)
export function useRejectFlightAuthorization(options?: {
  onSuccess?: (authorization: FlightAuthorization) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FlightAuthorizationRejectionRequest): Promise<FlightAuthorization> => {
      const { id, ...rejectionData } = data;
      const response = await fetch(`/api/flight-authorizations/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rejectionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject flight authorization');
      }

      const result: FlightAuthorizationActionResponse = await response.json();
      return result.authorization;
    },
    onSuccess: (authorization) => {
      // Update cached data
      queryClient.invalidateQueries({ queryKey: ['flight-authorizations'] });
      queryClient.setQueryData(['flight-authorization', authorization.id], authorization);
      queryClient.setQueryData(['flight-authorization-by-booking', authorization.booking_id], authorization);
      
      options?.onSuccess?.(authorization);
    },
    onError: options?.onError,
  });
}

// Delete authorization
export function useDeleteFlightAuthorization(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (authorizationId: string): Promise<void> => {
      const response = await fetch(`/api/flight-authorizations/${authorizationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete flight authorization');
      }
    },
    onSuccess: () => {
      // Invalidate all authorization queries
      queryClient.invalidateQueries({ queryKey: ['flight-authorizations'] });
      queryClient.invalidateQueries({ queryKey: ['flight-authorization'] });
      queryClient.invalidateQueries({ queryKey: ['flight-authorization-by-booking'] });
      
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}
