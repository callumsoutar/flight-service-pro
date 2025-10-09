import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, Clock, BarChart2, CalendarDays, Plane } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FlightLog } from "@/types/flight_logs";

interface AircraftFlightHistoryTabProps {
  aircraftId: string;
}

export default function AircraftFlightHistoryTab({ aircraftId }: AircraftFlightHistoryTabProps) {
  const [allFlights, setAllFlights] = useState<FlightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state - default to last 30 days
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(subDays(new Date(), 30)));
  const [dateTo, setDateTo] = useState<Date>(endOfDay(new Date()));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    const loadFlightHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/flight-logs?aircraft_id=${aircraftId}`);
        const data = await response.json();

        if (response.ok) {
          console.log("Flight logs loaded:", data.flight_logs?.length || 0, "records");
          setAllFlights(data.flight_logs || []);
        } else {
          console.error("API error:", data.error);
          setError(data.error || "Failed to load flight logs");
        }
      } catch (err) {
        setError("Failed to load flight logs");
        console.error("Error loading aircraft flight logs:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadFlightHistory();
  }, [aircraftId]);

  // Filter flights by date range and ensure they have meter readings
  const flights = allFlights.filter((flight) => {
    // Only show flights with at least one meter reading (tach_end or hobbs_end)
    if (flight.tach_end == null && flight.hobbs_end == null) return false;

    // Use booking end time as the primary date for filtering
    const dateToCheck = flight.booking?.end_time || flight.created_at;
    if (!dateToCheck) return false;

    const flightDate = new Date(dateToCheck);
    return isWithinInterval(flightDate, { start: dateFrom, end: dateTo });
  });

  // Date range presets
  const datePresets = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "Last year", days: 365 },
  ];

  const handlePresetClick = (days: number) => {
    setDateFrom(startOfDay(subDays(new Date(), days)));
    setDateTo(endOfDay(new Date()));
    setIsDatePickerOpen(false);
  };

  const getFlightHours = (flight: FlightLog): number => {
    const flightTime = flight.flight_time;
    if (flightTime == null) return 0;
    const hours = typeof flightTime === 'string' ? Number(flightTime) : flightTime;
    return isFinite(hours) ? hours : 0;
  };

  const getFlightHoursDisplay = (flight: FlightLog): string => {
    const flightTime = flight.flight_time;
    if (flightTime == null) return "-";

    const hoursStr = String(flightTime);
    // If already has a decimal point, keep as-is; otherwise add .0 (e.g., "1" -> "1.0")
    return hoursStr.includes('.') ? hoursStr : `${hoursStr}.0`;
  };

  const totalFlightHours = flights.reduce((total, f) => total + getFlightHours(f), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading flight logs...</div>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Flight History</h3>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-auto justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {dateFrom && dateTo ? (
                  `${format(dateFrom, "MMM dd, yyyy")} - ${format(dateTo, "MMM dd, yyyy")}`
                ) : (
                  "Select date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 border-b">
                <div className="grid grid-cols-2 gap-2">
                  {datePresets.map((preset) => (
                    <Button
                      key={preset.days}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePresetClick(preset.days)}
                      className="text-xs h-8"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">From</label>
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => date && setDateFrom(startOfDay(date))}
                      disabled={(date) => date > new Date()}
                      className="scale-90 origin-top-left"
                      classNames={{
                        months: "space-y-0",
                        month: "space-y-2",
                        caption: "flex justify-center pt-1 relative items-center text-sm",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-gray-500 rounded-md w-8 font-normal text-xs",
                        row: "flex w-full mt-1",
                        cell: "text-center text-sm relative p-0 focus-within:relative focus-within:z-20",
                        day: "h-8 w-8 p-0 font-normal text-sm hover:bg-gray-100 rounded-md",
                        day_selected: "bg-indigo-600 text-white hover:bg-indigo-600",
                        day_disabled: "text-gray-300",
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => date && setDateTo(endOfDay(date))}
                      disabled={(date) => date > new Date() || date < dateFrom}
                      className="scale-90 origin-top-left"
                      classNames={{
                        months: "space-y-0",
                        month: "space-y-2",
                        caption: "flex justify-center pt-1 relative items-center text-sm",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-gray-500 rounded-md w-8 font-normal text-xs",
                        row: "flex w-full mt-1",
                        cell: "text-center text-sm relative p-0 focus-within:relative focus-within:z-20",
                        day: "h-8 w-8 p-0 font-normal text-sm hover:bg-gray-100 rounded-md",
                        day_selected: "bg-indigo-600 text-white hover:bg-indigo-600",
                        day_disabled: "text-gray-300",
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDatePickerOpen(false)}
                    className="h-8 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsDatePickerOpen(false)}
                    className="h-8 px-3 text-xs"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-col md:flex-row items-stretch gap-4 bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
        <div className="flex-1 flex flex-col items-center justify-center">
          <User className="w-6 h-6 mb-1 text-indigo-500" />
          <div className="text-xs text-muted-foreground">Total Flights</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">{flights.length}</div>
        </div>
        <div className="hidden md:block w-px bg-gray-200 mx-2" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Clock className="w-6 h-6 mb-1 text-blue-500" />
          <div className="text-xs text-muted-foreground">Total Hours</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">{totalFlightHours.toFixed(1)}h</div>
        </div>
        <div className="hidden md:block w-px bg-gray-200 mx-2" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <BarChart2 className="w-6 h-6 mb-1 text-emerald-500" />
          <div className="text-xs text-muted-foreground">Avg Hours / Flight</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">{flights.length ? (totalFlightHours / flights.length).toFixed(1) : '0.0'}h</div>
        </div>
      </div>

      {flights.length === 0 ? (
        <Card className="rounded-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground mb-4">No completed flights found</div>
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-900 text-xs">Date</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-900 text-xs">Member</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-900 text-xs">Instructor</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Hobbs Start</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Hobbs End</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Tach Start</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Tach End</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Flight Time</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((flight) => (
                    <tr key={flight.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(flight.booking?.end_time || flight.created_at), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {flight.booking?.start_time && flight.booking?.end_time
                              ? `${format(new Date(flight.booking.start_time), 'HH:mm')}-${format(new Date(flight.booking.end_time), 'HH:mm')}`
                              : '-'
                            }
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="font-medium">
                            {flight.booking?.user?.first_name || flight.booking?.user?.last_name
                              ? `${flight.booking.user.first_name || ""} ${flight.booking.user.last_name || ""}`.trim()
                              : 'Member'
                            }
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {flight.checked_out_instructor ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-500" />
                            <span>
                              {flight.checked_out_instructor.first_name || flight.checked_out_instructor.last_name
                                ? `${flight.checked_out_instructor.first_name || ""} ${flight.checked_out_instructor.last_name || ""}`.trim()
                                : 'Instructor'
                              }
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1">
                            <Plane className="w-3 h-3" />
                            Solo
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center text-xs font-mono">
                        {flight.hobbs_start != null ? flight.hobbs_start.toFixed(1) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-xs font-mono">
                        {flight.hobbs_end != null ? flight.hobbs_end.toFixed(1) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-xs font-mono">
                        {flight.tach_start != null ? flight.tach_start.toFixed(1) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-xs font-mono">
                        {flight.tach_end != null ? flight.tach_end.toFixed(1) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-xs font-mono font-semibold">
                        {getFlightHoursDisplay(flight)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/dashboard/bookings/complete/${flight.booking_id}`}
                          className="h-6 px-2 text-xs"
                        >
                          View
                        </Button>
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