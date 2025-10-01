"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Plane } from "lucide-react";
import BookingsTable from "@/app/(auth)/dashboard/bookings/BookingsTable";
import type { Booking } from "@/types/bookings";

interface DashboardBookingsSectionProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
}

export default function DashboardBookingsSection({
  bookings,
  members,
  instructors,
  aircraftList
}: DashboardBookingsSectionProps) {

  const { todaysBookings, currentlyFlying } = React.useMemo(() => {
    const today = new Date();
    const localToday = today.getFullYear() + '-' +
                      String(today.getMonth() + 1).padStart(2, '0') + '-' +
                      String(today.getDate()).padStart(2, '0');

    const todaysBookings = bookings.filter(booking => {
      const startDate = new Date(booking.start_time);
      const endDate = new Date(booking.end_time);

      const localStartDate = startDate.getFullYear() + '-' +
                            String(startDate.getMonth() + 1).padStart(2, '0') + '-' +
                            String(startDate.getDate()).padStart(2, '0');

      const localEndDate = endDate.getFullYear() + '-' +
                          String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
                          String(endDate.getDate()).padStart(2, '0');

      const isToday = localStartDate === localToday ||
                     (localStartDate < localToday && localEndDate >= localToday);

      return isToday && booking.status === 'confirmed';
    });

    const currentlyFlying = bookings.filter(booking => booking.status === 'flying');

    return { todaysBookings, currentlyFlying };
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
    <div className="space-y-6">
      {/* Today's Bookings */}
      <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
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
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <h4 className="text-base font-medium text-gray-900 mb-1">No Bookings Today</h4>
              <p className="text-sm text-gray-600">No flight bookings scheduled for today.</p>
            </div>
          ) : (
            <BookingsTable
              bookings={todaysBookings}
              members={members}
              instructors={instructors}
              aircraftList={aircraftList}
              compact={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Currently Flying */}
      <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Plane className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Currently Flying</h3>
              <p className="text-sm text-gray-600">Active flights in progress</p>
            </div>
            {currentlyFlying.length > 0 && (
              <span className="ml-auto inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
                {currentlyFlying.length} flight{currentlyFlying.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {currentlyFlying.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <h4 className="text-base font-medium text-gray-900 mb-1">No Active Flights</h4>
              <p className="text-sm text-gray-600">No aircraft currently in flight.</p>
            </div>
          ) : (
            <BookingsTable
              bookings={currentlyFlying}
              members={members}
              instructors={instructors}
              aircraftList={aircraftList}
              compact={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}