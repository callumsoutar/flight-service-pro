"use client";

import dynamic from "next/dynamic";
import type { Booking } from '@/types/bookings';

// Dynamically import BookingActions to avoid hydration issues
const BookingActions = dynamic(() => import("./BookingActions"), {
  ssr: false,
  loading: () => <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
});

interface BookingActionsClientProps {
  booking?: Booking;
  hideCheckOutButton?: boolean;
  mode?: 'check-in' | 'check-out';
  // Legacy props for backward compatibility
  status?: string;
  bookingId?: string;
  // Current user ID for ownership validation
  currentUserId?: string;
  // Server-provided data to avoid client-side queries
  flightAuthorization?: unknown;
  requireFlightAuthorization?: boolean;
  isRestrictedUser?: boolean;
}

export default function BookingActionsClient(props: BookingActionsClientProps) {
  return <BookingActions {...props} />;
}
