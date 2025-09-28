"use client";
import * as React from "react";
import type { Booking } from "@/types/bookings";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { useRouter } from "next/navigation";
import { Plane, User, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface BookingsTableProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  statusFilter?: string;
}




export default function BookingsTable({ bookings, members, instructors, aircraftList, statusFilter = "all" }: BookingsTableProps) {
  const router = useRouter();

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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Start Time</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">End Time</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Member</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Instructor</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Aircraft</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Purpose</th>
                    <th className="text-left py-3 font-medium text-gray-900">Status</th>
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
                      <td className="py-3 pr-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {format(new Date(b.start_time), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">
                            {format(new Date(b.start_time), 'HH:mm')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        <span className="text-gray-600">
                          {format(new Date(b.end_time), 'HH:mm')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {getMemberName(b.user_id)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        {b.instructor_id ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span>{getInstructorName(b.instructor_id)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Solo</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-gray-500" />
                          {getAircraftReg(b.aircraft_id ?? "")}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600 max-w-xs">
                        <span className="truncate block" title={b.purpose || ""}>
                          {b.purpose || "--"}
                        </span>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={b.status} className="font-semibold px-3 py-1 text-sm" />
                      </td>
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