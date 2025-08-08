import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar, Plane, User } from "lucide-react";
import { format } from "date-fns";
import { Booking } from "@/types/bookings";

interface MemberBookingsTabProps {
  memberId: string;
}

export default function MemberBookingsTab({ memberId }: MemberBookingsTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/bookings`);
        const data = await response.json();
        
        if (response.ok) {
          // Filter bookings for this member and sort by start_time (soonest first)
          const memberBookings = (data.bookings || [])
            .filter((booking: Booking) => booking.user_id === memberId)
            .sort((a: Booking, b: Booking) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
          
          setBookings(memberBookings);
        } else {
          setError(data.error || "Failed to load bookings");
        }
      } catch (err) {
        setError("Failed to load bookings");
        console.error("Error loading bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [memberId]);



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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-600 mb-4">This member hasn&apos;t made any flight bookings yet.</p>
            <Button 
              onClick={() => window.location.href = '/dashboard/bookings'}
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Make First Booking
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Upcoming & Recent Bookings</h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Aircraft</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Date & Time</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Instructor</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Purpose</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-gray-500" />
                          {booking.aircraft?.registration || `Aircraft ${booking.aircraft_id.substring(0, 8)}`}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{format(new Date(booking.start_time), 'MMM dd, yyyy')}</span>
                          <span className="text-gray-500">
                            {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        {booking.instructor ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span>{booking.instructor.first_name} {booking.instructor.last_name}</span>
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
                      <td className="py-3 pr-4">
                        <StatusBadge status={booking.status} />
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
                            >
                              Cancel
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
    </div>
  );
} 