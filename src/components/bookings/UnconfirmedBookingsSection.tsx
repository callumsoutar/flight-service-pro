"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import BookingsTable from "@/app/(auth)/dashboard/bookings/BookingsTable";
import type { Booking } from "@/types/bookings";

interface UnconfirmedBookingsSectionProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  onConfirmBooking?: (bookingId: string) => Promise<void>;
}

export default function UnconfirmedBookingsSection({
  bookings,
  members,
  instructors,
  aircraftList,
  onConfirmBooking
}: UnconfirmedBookingsSectionProps) {
  const unconfirmedBookings = React.useMemo(() =>
    bookings.filter(booking => booking.status === 'unconfirmed'),
    [bookings]
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Unconfirmed Bookings</h3>
            <p className="text-sm text-gray-600">These bookings require confirmation or action</p>
          </div>
          {unconfirmedBookings.length > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-700">
              {unconfirmedBookings.length} booking{unconfirmedBookings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {unconfirmedBookings.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Unconfirmed Bookings</h3>
            <p className="text-gray-600">All bookings are confirmed or processed.</p>
          </div>
        ) : (
          <BookingsTable
            bookings={unconfirmedBookings}
            members={members}
            instructors={instructors}
            aircraftList={aircraftList}
            statusFilter="unconfirmed"
            showConfirmButton={true}
            onConfirmBooking={onConfirmBooking}
          />
        )}
      </CardContent>
    </Card>
  );
}