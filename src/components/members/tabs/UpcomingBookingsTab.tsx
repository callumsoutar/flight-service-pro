"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plane, User } from "lucide-react";
import { format } from "date-fns";
import { Booking } from "@/types/bookings";
import { CancelBookingModal } from "@/components/bookings/CancelBookingModal";
import { useCancelBooking } from "@/hooks/use-cancel-booking";
import { useCancellationCategories } from "@/hooks/use-cancellation-categories";
import { toast } from "sonner";

interface UpcomingBookingsTabProps {
  memberId: string;
  bookings: Booking[];
  setBookings: (bookings: Booking[]) => void;
  loading: boolean;
  error: string | null;
  instructorNameById: Record<string, { first_name?: string; last_name?: string }>;
}

export default function UpcomingBookingsTab({
  memberId,
  bookings,
  setBookings,
  loading,
  error,
  instructorNameById
}: UpcomingBookingsTabProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const cancelBooking = useCancelBooking();
  const { data: categoriesData } = useCancellationCategories();

  const handleCancelClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setCancelModalOpen(true);
  };

  const handleCancelSubmit = async (data: {
    cancellation_category_id?: string;
    reason?: string;
    notes?: string;
  }) => {
    if (!selectedBookingId) return;

    try {
      await cancelBooking.mutateAsync({
        bookingId: selectedBookingId,
        data
      });

      // Refresh the bookings list to reflect the cancellation
      const response = await fetch(`/api/bookings`);
      const responseData = await response.json();

      if (response.ok) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const memberBookings = (responseData.bookings || [])
          .filter((booking: Booking) => {
            const bookingDate = new Date(booking.start_time);
            return (
              booking.user_id === memberId &&
              booking.status === 'confirmed' &&
              bookingDate >= today
            );
          })
          .sort((a: Booking, b: Booking) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        setBookings(memberBookings);
      }

      toast.success("Booking cancelled successfully");

      setCancelModalOpen(false);
      setSelectedBookingId(null);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel booking");
    }
  };

  const handleCancelModalClose = () => {
    setCancelModalOpen(false);
    setSelectedBookingId(null);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      {bookings.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="text-center py-12">
            <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Bookings</h3>
            <p className="text-gray-600 mb-4">No confirmed flight bookings scheduled.</p>
            <Button
              onClick={() => window.location.href = '/dashboard/bookings'}
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Flight
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-md">
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Start Time</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">End Time</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Aircraft</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Instructor</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Purpose</th>
                    <th className="text-left py-3 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4 text-sm">
                        <span className="font-medium">
                          {format(new Date(booking.start_time), 'MMM dd, yyyy')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        <span className="text-gray-600">
                          {format(new Date(booking.start_time), 'HH:mm')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        <span className="text-gray-600">
                          {format(new Date(booking.end_time), 'HH:mm')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-gray-500" />
                          {booking.aircraft?.registration || `Aircraft ${booking.aircraft_id.substring(0, 8)}`}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        {booking.instructor_id ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span>
                              {(() => {
                                // First try to get name from the instructor object if joined
                                if (booking.instructor?.first_name || booking.instructor?.last_name) {
                                  return `${booking.instructor.first_name || ""} ${booking.instructor.last_name || ""}`.trim();
                                }
                                // Fallback to instructorNameById mapping
                                const name = instructorNameById[booking.instructor_id as string];
                                if (name?.first_name || name?.last_name) {
                                  return `${name.first_name || ""} ${name.last_name || ""}`.trim();
                                }
                                return 'Instructor';
                              })()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Solo</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600 max-w-xs">
                        <span className="truncate block" title={booking.purpose}>
                          {booking.purpose}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `/dashboard/bookings/view/${booking.id}`}
                          >
                            View
                          </Button>
                          {(booking.status === 'confirmed' || booking.status === 'unconfirmed') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleCancelClick(booking.id)}
                              disabled={cancelBooking.isPending}
                            >
                              {cancelBooking.isPending && selectedBookingId === booking.id ? 'Cancelling...' : 'Cancel'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        open={cancelModalOpen}
        onOpenChange={handleCancelModalClose}
        onSubmit={handleCancelSubmit}
        categories={categoriesData?.categories || []}
        loading={cancelBooking.isPending}
        error={cancelBooking.error?.message || null}
        bookingId={selectedBookingId || undefined}
      />
    </div>
  );
}