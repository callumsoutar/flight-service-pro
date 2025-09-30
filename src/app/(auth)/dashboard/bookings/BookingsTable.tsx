"use client";
import * as React from "react";
import type { Booking } from "@/types/bookings";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plane, User, Calendar, Clock, Check, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { TimeSlot } from "@/types/settings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BookingsTableProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  statusFilter?: string;
  showConfirmButton?: boolean;
  onConfirmBooking?: (bookingId: string) => Promise<void>;
}




export default function BookingsTable({ bookings, members, instructors, aircraftList, statusFilter = "all", showConfirmButton = false, onConfirmBooking }: BookingsTableProps) {
  const router = useRouter();
  const { getSettingValue } = useSettingsContext();
  const customTimeSlots = getSettingValue('bookings', 'custom_time_slots', []);

  // Filter bookings by status
  const filteredBookings = React.useMemo(() => {
    if (statusFilter === "all") return bookings;
    return bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  // Helper lookups
  const getMemberName = (id: string | null) => {
    if (!id) return "--";
    return members.find((m) => m.id === id)?.name || "--";
  };
  const getInstructorName = React.useCallback((id: string) => {
    return instructors.find((i) => i.id === id)?.name || "--";
  }, [instructors]);
  const getAircraftReg = React.useCallback((id: string) => {
    return aircraftList.find((a) => a.id === id)?.registration || "--";
  }, [aircraftList]);

  // Time slot validation function
  const validateBookingTimeSlot = React.useCallback((booking: Booking): boolean => {
    // If no custom time slots are configured, any time is valid
    if (!Array.isArray(customTimeSlots) || customTimeSlots.length === 0) {
      return true;
    }

    // If booking doesn't have proper times, consider it valid (don't show warning)
    if (!booking.start_time || !booking.end_time) {
      return true;
    }

    const bookingDate = new Date(booking.start_time);
    const startTime = format(new Date(booking.start_time), 'HH:mm');
    const endTime = format(new Date(booking.end_time), 'HH:mm');

    // Get the weekday name for the booking date
    const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekdayName = weekdayNames[bookingDate.getDay()];

    // Convert times to minutes for easier comparison
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const bookingStartMinutes = timeToMinutes(startTime);
    const bookingEndMinutes = timeToMinutes(endTime);

    // Check if booking fits within any configured time slot
    const fitsInAnySlot = customTimeSlots.some((slot: TimeSlot) => {
      // Check if this slot is active on the selected day
      if (!slot.days || !slot.days.includes(weekdayName)) {
        return false;
      }

      const slotStartMinutes = timeToMinutes(slot.start_time);
      const slotEndMinutes = timeToMinutes(slot.end_time);

      // Check if booking is fully contained within this slot
      return bookingStartMinutes >= slotStartMinutes && bookingEndMinutes <= slotEndMinutes;
    });

    return fitsInAnySlot;
  }, [customTimeSlots]);

  // Render
  return (
    <Card className="rounded-md">
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
              <p className="text-gray-600">No flight bookings match your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20 sm:w-24">Date</th>
                    <th className="text-left py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm w-16 sm:w-20">Start Time</th>
                    <th className="text-left py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm w-16 sm:w-20 hidden md:table-cell">End Time</th>
                    <th className="text-left py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20 sm:w-24">Member</th>
                    <th className="text-left py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20 sm:w-24 hidden lg:table-cell">Instructor</th>
                    <th className="text-left py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm w-16 sm:w-20">Aircraft</th>
                    <th className="text-left py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm hidden sm:table-cell w-24 sm:w-32">Purpose</th>
                    {statusFilter !== "unconfirmed" && (
                      <th className="text-left py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20 sm:w-24">Status</th>
                    )}
                    {showConfirmButton && (
                      <th className="text-left py-2 font-medium text-gray-900 text-xs sm:text-sm w-24">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/dashboard/bookings/view/${b.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          router.push(`/dashboard/bookings/view/${b.id}`);
                        }
                      }}
                    >
                      <td className="py-2 pr-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          <span className="font-medium truncate">
                            {format(new Date(b.start_time), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          <span className="text-gray-600">
                            {format(new Date(b.start_time), 'HH:mm')}
                          </span>
                          {!validateBookingTimeSlot(b) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-3 h-3 text-amber-500 opacity-60" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Booking time doesn't conform to configured time slots</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-xs sm:text-sm hidden md:table-cell">
                        <span className="text-gray-600">
                          {format(new Date(b.end_time), 'HH:mm')}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 truncate">
                            {getMemberName(b.user_id)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-xs sm:text-sm hidden lg:table-cell">
                        {b.instructor_id ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            <span className="truncate">{getInstructorName(b.instructor_id)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Solo</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 font-medium text-gray-900 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <Plane className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          <span className="truncate">
                            {getAircraftReg(b.aircraft_id ?? "")}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                        <span className="truncate block" title={b.purpose || ""}>
                          {b.purpose || "--"}
                        </span>
                      </td>
                      {statusFilter !== "unconfirmed" && (
                        <td className="py-2">
                          <StatusBadge status={b.status} className="font-semibold px-2 py-1 text-xs sm:text-sm" />
                        </td>
                      )}
                      {showConfirmButton && (
                        <td className="py-2">
                          {b.status === 'unconfirmed' && onConfirmBooking && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirmBooking(b.id);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-6"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Confirm
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
  );
} 