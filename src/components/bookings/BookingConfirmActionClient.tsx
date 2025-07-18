"use client";
import ConfirmBookingButton from "@/components/bookings/ConfirmBookingButton";

interface BookingConfirmActionClientProps {
  bookingId: string;
  status: string;
}

export default function BookingConfirmActionClient({ bookingId, status }: BookingConfirmActionClientProps) {
  if (status !== "unconfirmed") return null;
  return <ConfirmBookingButton bookingId={bookingId} onConfirmed={() => window.location.reload()} />;
} 