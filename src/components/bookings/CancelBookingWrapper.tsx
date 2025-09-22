import React, { useState } from 'react';
import { CancelBookingModal } from './CancelBookingModal';
import { useCancellationCategories } from '@/hooks/use-cancellation-categories';
import { useCancelBooking } from '@/hooks/use-cancel-booking';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface CancelBookingWrapperProps {
  bookingId: string;
  bookingTitle?: string;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function CancelBookingWrapper({
  bookingId,
  // bookingTitle = 'this booking',
  disabled = false,
  variant = 'destructive',
  size = 'default'
}: CancelBookingWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useCancellationCategories();
  const cancelBookingMutation = useCancelBooking();

  const handleCancelBooking = async (data: {
    cancellation_category_id?: string;
    reason: string;
    notes?: string;
  }) => {
    try {
      setError(null);
      await cancelBookingMutation.mutateAsync({
        bookingId,
        data
      });
      
      toast.success('Booking cancelled successfully');
      setIsOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setError(null);
    }
  };

  if (categoriesError) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        disabled 
        title="Failed to load cancellation categories"
      >
        <X className="h-4 w-4 mr-2" />
        Cancel Booking
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        disabled={disabled || categoriesLoading}
      >
        <X className="h-4 w-4 mr-2" />
        Cancel Booking
      </Button>

      <CancelBookingModal
        open={isOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleCancelBooking}
        categories={categoriesData?.categories || []}
        loading={cancelBookingMutation.isPending}
        error={error}
        bookingId={bookingId}
      />
    </>
  );
}
