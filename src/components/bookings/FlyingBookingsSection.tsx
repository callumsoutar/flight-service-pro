"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plane } from "lucide-react";
import BookingsTable from "@/app/(auth)/dashboard/bookings/BookingsTable";
import type { Booking } from "@/types/bookings";

interface FlyingBookingsSectionProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
}

export default function FlyingBookingsSection({
  bookings,
  members,
  instructors,
  aircraftList
}: FlyingBookingsSectionProps) {
  const flyingBookings = React.useMemo(() =>
    bookings.filter(booking => booking.status === 'flying'),
    [bookings]
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Plane className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Currently Flying</h3>
            <p className="text-sm text-gray-600">Active flights currently in progress</p>
          </div>
          {flyingBookings.length > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
              {flyingBookings.length} flight{flyingBookings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {flyingBookings.length === 0 ? (
          <div className="text-center py-12">
            <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Flights</h3>
            <p className="text-gray-600">No aircraft currently in the air.</p>
          </div>
        ) : (
          <BookingsTable
            bookings={flyingBookings}
            members={members}
            instructors={instructors}
            aircraftList={aircraftList}
            statusFilter="flying"
          />
        )}
      </CardContent>
    </Card>
  );
}