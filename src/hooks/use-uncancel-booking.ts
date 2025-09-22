import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UncancelBookingData {
  bookingId: string;
}

export function useUncancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId }: UncancelBookingData) => {
      const response = await fetch(`/api/bookings/${bookingId}/uncancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to uncancel booking');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch booking-related queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      toast.success(data.message || 'Booking uncancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to uncancel booking');
    },
  });
}
