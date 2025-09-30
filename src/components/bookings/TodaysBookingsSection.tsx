"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import BookingsTable from "@/app/(auth)/dashboard/bookings/BookingsTable";
import type { Booking } from "@/types/bookings";

interface TodaysBookingsSectionProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
}

export default function TodaysBookingsSection({
  bookings,
  members,
  instructors,
  aircraftList
}: TodaysBookingsSectionProps) {
  const todaysBookings = React.useMemo(() => {
    // Get today's date in local timezone (not UTC)
    const today = new Date();
    const localToday = today.getFullYear() + '-' +
                      String(today.getMonth() + 1).padStart(2, '0') + '-' +
                      String(today.getDate()).padStart(2, '0');

    return bookings.filter(booking => {
      // Convert booking times to local timezone for comparison
      const startDate = new Date(booking.start_time);
      const endDate = new Date(booking.end_time);

      const localStartDate = startDate.getFullYear() + '-' +
                            String(startDate.getMonth() + 1).padStart(2, '0') + '-' +
                            String(startDate.getDate()).padStart(2, '0');

      const localEndDate = endDate.getFullYear() + '-' +
                          String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
                          String(endDate.getDate()).padStart(2, '0');

      // Show bookings that start today OR span into today (in local timezone)
      const isToday = localStartDate === localToday ||
                     (localStartDate < localToday && localEndDate >= localToday);

      return isToday && booking.status === 'confirmed';
    });
  }, [bookings]);

  const formatDate = () => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Bookings</h3>
            <p className="text-sm text-gray-600">{formatDate()}</p>
          </div>
          {todaysBookings.length > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
              {todaysBookings.length} booking{todaysBookings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {todaysBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Today</h3>
            <p className="text-gray-600">No flight bookings scheduled for today.</p>
          </div>
        ) : (
          <BookingsTable
            bookings={todaysBookings}
            members={members}
            instructors={instructors}
            aircraftList={aircraftList}
          />
        )}
      </CardContent>
    </Card>
  );
}