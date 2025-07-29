import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Plane } from "lucide-react";
import { format } from "date-fns";

interface MemberBookingsTabProps {
  memberId: string;
}

interface Booking {
  id: string;
  aircraft_name: string;
  instructor_name?: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  purpose: string;
  location?: string;
}

export default function MemberBookingsTab({ memberId }: MemberBookingsTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mark as intentionally unused during development
  void setError;

  useEffect(() => {
    // Simulate loading bookings
    setLoading(true);
    setTimeout(() => {
      setBookings([
        {
          id: '1',
          aircraft_name: 'Cessna 172',
          instructor_name: 'John Smith',
          start_time: '2024-01-15T09:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
          status: 'confirmed',
          purpose: 'Navigation training',
          location: 'Bankstown Airport'
        },
        {
          id: '2',
          aircraft_name: 'Piper PA-28',
          start_time: '2024-01-20T14:00:00Z',
          end_time: '2024-01-20T16:00:00Z',
          status: 'pending',
          purpose: 'Solo flight practice',
          location: 'Camden Airport'
        },
        {
          id: '3',
          aircraft_name: 'Cessna 152',
          instructor_name: 'Sarah Johnson',
          start_time: '2024-01-10T10:00:00Z',
          end_time: '2024-01-10T12:00:00Z',
          status: 'completed',
          purpose: 'Circuit training',
          location: 'Bankstown Airport'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [memberId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      default: return status;
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Flight Bookings</h3>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => window.location.href = '/dashboard/bookings'}
        >
          <Calendar className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground mb-4">No bookings found</div>
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
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plane className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-lg">{booking.aircraft_name}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(booking.status)}>
                    {getStatusText(booking.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Date</div>
                        <div className="font-medium">{format(new Date(booking.start_time), 'PPP')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Time</div>
                        <div className="font-medium">
                          {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {booking.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">Location</div>
                          <div className="font-medium">{booking.location}</div>
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-muted-foreground">Purpose</div>
                      <div className="font-medium">{booking.purpose}</div>
                    </div>
                    {booking.instructor_name && (
                      <div>
                        <div className="text-sm text-muted-foreground">Instructor</div>
                        <div className="font-medium">{booking.instructor_name}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = `/dashboard/bookings/view/${booking.id}`}
                  >
                    View Details
                  </Button>
                  {booking.status === 'confirmed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 