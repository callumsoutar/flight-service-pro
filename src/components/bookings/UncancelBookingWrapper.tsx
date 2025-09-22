import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUncancelBooking } from '@/hooks/use-uncancel-booking';
import { RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UncancelBookingWrapperProps {
  bookingId: string;
  bookingTitle?: string;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function UncancelBookingWrapper({ 
  bookingId, 
  bookingTitle = 'this booking',
  disabled = false,
  variant = 'default',
  size = 'default'
}: UncancelBookingWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const uncancelBookingMutation = useUncancelBooking();

  const handleUncancel = async () => {
    try {
      await uncancelBookingMutation.mutateAsync({ bookingId });
      setIsOpen(false);
    } catch (error) {
      // Error handling is done by the hook
      console.error('Error uncancelling booking:', error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || uncancelBookingMutation.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {uncancelBookingMutation.isPending ? 'Uncancelling...' : 'Uncancel Booking'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            Uncancel Booking
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to uncancel {bookingTitle}? This will change the booking status back to confirmed and allow it to proceed as scheduled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={uncancelBookingMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUncancel}
            disabled={uncancelBookingMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uncancelBookingMutation.isPending ? 'Uncancelling...' : 'Uncancel Booking'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
