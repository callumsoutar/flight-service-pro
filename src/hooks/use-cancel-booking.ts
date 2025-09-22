import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Booking } from '@/types/bookings';

interface CancelBookingData {
  cancellation_category_id?: string;
  reason?: string;
  notes?: string;
}

interface CancelBookingResponse {
  message: string;
  booking: Booking;
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation<CancelBookingResponse, Error, { bookingId: string; data: CancelBookingData }>({
    mutationFn: async ({ bookingId, data }) => {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch bookings
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      // Update the specific booking in cache
      queryClient.setQueryData(['booking', variables.bookingId], data.booking);
    },
  });
}
