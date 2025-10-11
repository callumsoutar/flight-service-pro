"use client";
import * as React from "react";
import type { Booking } from "@/types/bookings";
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
  compact?: boolean;
}

export default function BookingsTable({
  bookings,
  members,
  instructors,
  aircraftList,
  statusFilter = "all",
  showConfirmButton = false,
  onConfirmBooking,
  compact = false
}: BookingsTableProps) {
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
    if (!Array.isArray(customTimeSlots) || customTimeSlots.length === 0) {
      return true;
    }

    if (!booking.start_time || !booking.end_time) {
      return true;
    }

    const bookingDate = new Date(booking.start_time);
    const startTime = format(new Date(booking.start_time), 'HH:mm');
    const endTime = format(new Date(booking.end_time), 'HH:mm');

    const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekdayName = weekdayNames[bookingDate.getDay()];

    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const bookingStartMinutes = timeToMinutes(startTime);
    const bookingEndMinutes = timeToMinutes(endTime);

    const fitsInAnySlot = customTimeSlots.some((slot: TimeSlot) => {
      if (!slot.days || !slot.days.includes(weekdayName)) {
        return false;
      }

      const slotStartMinutes = timeToMinutes(slot.start_time);
      const slotEndMinutes = timeToMinutes(slot.end_time);

      return bookingStartMinutes >= slotStartMinutes && bookingEndMinutes <= slotEndMinutes;
    });

    return fitsInAnySlot;
  }, [customTimeSlots]);

  if (filteredBookings.length === 0) {
    return (
      <div className={`text-center ${compact ? 'py-8' : 'py-12'}`}>
        <Plane className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-gray-400 mx-auto mb-4`} />
        <h3 className={`${compact ? 'text-base' : 'text-lg'} font-medium text-gray-900 mb-2`}>No Bookings Found</h3>
        <p className="text-gray-600">No flight bookings match your criteria.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop/Laptop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full table-fixed min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20`}>Date</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-16`}>Start</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-16`}>End</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20`}>Member</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20`}>Instructor</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-16`}>Aircraft</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-24`}>Purpose</th>
              {statusFilter !== "unconfirmed" && (
                <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20`}>Status</th>
              )}
              {showConfirmButton && (
                <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} font-medium text-gray-900 text-xs sm:text-sm w-20`}>Actions</th>
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
                <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm`}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                    <span className="font-medium truncate">
                      {format(new Date(b.start_time), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </td>
                <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm`}>
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
                            <p>Booking time doesn&apos;t conform to configured time slots</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </td>
                <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm`}>
                  <span className="text-gray-600">
                    {format(new Date(b.end_time), 'HH:mm')}
                  </span>
                </td>
                <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm`}>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 truncate">
                      {getMemberName(b.user_id)}
                    </span>
                  </div>
                </td>
                <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm`}>
                  {b.instructor_id ? (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="truncate">{getInstructorName(b.instructor_id)}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Solo</span>
                  )}
                </td>
                <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm`}>
                  <div className="flex items-center gap-1">
                    <Plane className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                    <span className="truncate">
                      {getAircraftReg(b.aircraft_id ?? "")}
                    </span>
                  </div>
                </td>
                <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm text-gray-600`}>
                  <span className="truncate block" title={b.purpose || ""}>
                    {b.purpose || "--"}
                  </span>
                </td>
                {statusFilter !== "unconfirmed" && (
                  <td className={`${compact ? 'py-1.5' : 'py-2'}`}>
                    <StatusBadge status={b.status} className="font-semibold px-2 py-1 text-xs sm:text-sm" />
                  </td>
                )}
                {showConfirmButton && (
                  <td className={`${compact ? 'py-1.5' : 'py-2'}`}>
                    {b.status === 'unconfirmed' && onConfirmBooking && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmBooking(b.id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-7 rounded-md shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                      >
                        <Check className="w-3 h-3 mr-1.5" />
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredBookings.map((b) => (
          <div
            key={b.id}
            className="bg-white border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition shadow-sm"
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/dashboard/bookings/view/${b.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                router.push(`/dashboard/bookings/view/${b.id}`);
              }
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm">
                  {format(new Date(b.start_time), 'MMM dd, yyyy')}
                </span>
              </div>
              {statusFilter !== "unconfirmed" && (
                <StatusBadge status={b.status} className="text-xs px-2 py-1" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600">
                  {format(new Date(b.start_time), 'HH:mm')} - {format(new Date(b.end_time), 'HH:mm')}
                </span>
                {!validateBookingTimeSlot(b) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="w-3 h-3 text-amber-500 opacity-60" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Booking time doesn&apos;t conform to configured time slots</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Plane className="w-3 h-3 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {getAircraftReg(b.aircraft_id ?? "")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-gray-500" />
                <span className="font-medium text-gray-900 truncate">
                  {getMemberName(b.user_id)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600 truncate">
                  {b.instructor_id ? getInstructorName(b.instructor_id) : "Solo"}
                </span>
              </div>
            </div>

            {b.purpose && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Purpose:</span> {b.purpose}
              </div>
            )}

            {showConfirmButton && b.status === 'unconfirmed' && onConfirmBooking && (
              <div className="mt-3 pt-3 border-t">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmBooking(b.id);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2.5 w-full rounded-md shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                >
                  <Check className="w-3 h-3 mr-1.5" />
                  Confirm Booking
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}