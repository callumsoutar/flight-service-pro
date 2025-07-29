import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Plane, User } from "lucide-react";
import { format } from "date-fns";

interface MemberFlightHistoryTabProps {
  memberId: string;
}

interface FlightLog {
  id: string;
  aircraft_name: string;
  instructor_name?: string;
  flight_date: string;
  departure_time: string;
  arrival_time: string;
  departure_airport: string;
  arrival_airport: string;
  flight_time: number; // in minutes
  purpose: string;
  status: 'completed' | 'cancelled' | 'in_progress';
}

export default function MemberFlightHistoryTab({ memberId }: MemberFlightHistoryTabProps) {
  const [flightLogs, setFlightLogs] = useState<FlightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mark as intentionally unused during development
  void setError;

  useEffect(() => {
    // Simulate loading flight logs
    setLoading(true);
    setTimeout(() => {
      setFlightLogs([
        {
          id: '1',
          aircraft_name: 'Cessna 172',
          instructor_name: 'John Smith',
          flight_date: '2024-01-15',
          departure_time: '09:00',
          arrival_time: '11:00',
          departure_airport: 'Bankstown (YBKS)',
          arrival_airport: 'Camden (YSCN)',
          flight_time: 120,
          purpose: 'Navigation training',
          status: 'completed'
        },
        {
          id: '2',
          aircraft_name: 'Piper PA-28',
          flight_date: '2024-01-20',
          departure_time: '14:00',
          arrival_time: '16:00',
          departure_airport: 'Bankstown (YBKS)',
          arrival_airport: 'Bankstown (YBKS)',
          flight_time: 120,
          purpose: 'Solo circuit training',
          status: 'completed'
        },
        {
          id: '3',
          aircraft_name: 'Cessna 152',
          instructor_name: 'Sarah Johnson',
          flight_date: '2024-01-10',
          departure_time: '10:00',
          arrival_time: '12:00',
          departure_airport: 'Bankstown (YBKS)',
          arrival_airport: 'Bankstown (YBKS)',
          flight_time: 120,
          purpose: 'Circuit training',
          status: 'completed'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [memberId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  const formatFlightTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const totalFlightTime = flightLogs.reduce((total, log) => total + log.flight_time, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading flight history...</div>
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
        <h3 className="text-lg font-semibold">Flight History</h3>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Total Flight Time: <span className="font-semibold text-indigo-600">{formatFlightTime(totalFlightTime)}</span>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard/bookings'}
          >
            <Calendar className="w-4 h-4 mr-2" />
            New Flight
          </Button>
        </div>
      </div>

      {flightLogs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground mb-4">No flight history found</div>
            <Button 
              onClick={() => window.location.href = '/dashboard/bookings'}
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule First Flight
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {flightLogs.map((flight) => (
            <Card key={flight.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plane className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-lg">{flight.aircraft_name}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(flight.status)}>
                    {getStatusText(flight.status)}
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
                        <div className="font-medium">{format(new Date(flight.flight_date), 'PPP')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Time</div>
                        <div className="font-medium">{flight.departure_time} - {flight.arrival_time}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Flight Time</div>
                      <div className="font-medium">{formatFlightTime(flight.flight_time)}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Route</div>
                        <div className="font-medium">{flight.departure_airport} → {flight.arrival_airport}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Purpose</div>
                      <div className="font-medium">{flight.purpose}</div>
                    </div>
                    {flight.instructor_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">Instructor</div>
                          <div className="font-medium">{flight.instructor_name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = `/dashboard/bookings/view/${flight.id}`}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                  >
                    Download Log
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 