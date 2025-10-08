"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Progress from "@/components/ui/progress";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, differenceInDays } from "date-fns";
import { 
  ArrowLeft, 
  User, 
  // Mail, 
  Calendar, 
  GraduationCap, 
  BookOpen, 
  Target,
  Clock,
  Plane,
  CalendarDays,
  BarChart2
} from "lucide-react";
import type { User as UserType } from "@/types/users";
import type { Syllabus } from "@/types/syllabus";
import type { StudentSyllabusEnrollment } from "@/types/student_syllabus_enrollment";
import type { FlightHistoryEntry } from "@/types/flight_history";

interface EnrollmentWithProgress extends StudentSyllabusEnrollment {
  syllabus?: Syllabus;
  instructor?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string;
  };
  progress?: {
    completed_lessons: number;
    total_lessons: number;
    flight_hours: number;
    percentage: number;
  };
}

interface StudentTrainingRecordClientProps {
  memberId: string;
}

export default function StudentTrainingRecordClient({ memberId }: StudentTrainingRecordClientProps) {
  const router = useRouter();
  const [student, setStudent] = useState<UserType | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flight history state
  const [allFlights, setAllFlights] = useState<FlightHistoryEntry[]>([]);
  const [flightLoading, setFlightLoading] = useState(true);
  const [flightError, setFlightError] = useState<string | null>(null);
  
  // Date range state - default to last 30 days
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(subDays(new Date(), 30)));
  const [dateTo, setDateTo] = useState<Date>(endOfDay(new Date()));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Flight history fetch effect
  useEffect(() => {
    if (!memberId) return;
    
    async function loadFlightHistory() {
      setFlightLoading(true);
      setFlightError(null);

      try {
        const response = await fetch(`/api/flight-history?user_id=${memberId}`);
        const data = await response.json();

        if (response.ok) {
          setAllFlights(data.flight_history || []);
        } else {
          setFlightError(data.error || "Failed to load flight history");
        }
      } catch (err) {
        setFlightError("Failed to load flight history");
        console.error("Error loading member flight history:", err);
      } finally {
        setFlightLoading(false);
      }
    }

    void loadFlightHistory();
  }, [memberId]);

  useEffect(() => {
    if (!memberId) return;
    
    async function fetchStudentData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch student info, enrollments, and related data
        const [studentRes, enrollmentsRes, syllabiRes, instructorsRes, usersRes, lessonsRes] = await Promise.all([
          fetch(`/api/users?id=${memberId}`),
          fetch(`/api/student_syllabus_enrollment?user_id=${memberId}`),
          fetch('/api/syllabus'),
          fetch('/api/instructors'),
          fetch('/api/users'),
          fetch('/api/lessons')
        ]);

        if (!studentRes.ok || !enrollmentsRes.ok || !syllabiRes.ok || !instructorsRes.ok || !usersRes.ok || !lessonsRes.ok) {
          throw new Error('Failed to fetch student data');
        }

        const [studentData, enrollmentsData, syllabiData, instructorsData, usersData, lessonsData] = await Promise.all([
          studentRes.json(),
          enrollmentsRes.json(),
          syllabiRes.json(),
          instructorsRes.json(),
          usersRes.json(),
          lessonsRes.json()
        ]);

        const studentInfo = studentData.users?.[0] || studentData.user || null;
        const enrollmentsList = enrollmentsData.data || [];
        const syllabiList = syllabiData.syllabi || [];
        const instructorsList = instructorsData.instructors || [];
        const usersList = usersData.users || [];
        const lessonsList = lessonsData.lessons || [];

        if (!studentInfo) {
          throw new Error('Student not found');
        }

        // Create lookup maps
        const syllabusMap = new Map(syllabiList.map((s: Syllabus) => [s.id, s]));
        const userMap = new Map(usersList.map((u: UserType) => [u.id, u]));
        
        // Create instructor map with user details
        const instructorMap = new Map();
        instructorsList.forEach((instructor: { id: string; user_id: string }) => {
          const user = userMap.get(instructor.user_id) as UserType | undefined;
          if (user) {
            instructorMap.set(instructor.id, {
              id: instructor.id,
              first_name: user.first_name,
              last_name: user.last_name,
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown'
            });
          }
        });

        // Enrich enrollments with progress data
        const enrichedEnrollments: EnrollmentWithProgress[] = await Promise.all(
          enrollmentsList.map(async (enrollment: StudentSyllabusEnrollment) => {
            const syllabus = syllabusMap.get(enrollment.syllabus_id);
            const instructor = enrollment.primary_instructor_id ? 
              instructorMap.get(enrollment.primary_instructor_id) : null;

            // Fetch progress data for this enrollment
            let progress = { completed_lessons: 0, total_lessons: 0, flight_hours: 0, percentage: 0 };
            
            try {
              // Get lesson progress and flight hours
              const [progressRes, flightRes] = await Promise.all([
                fetch(`/api/lesson_progress?user_id=${memberId}`),
                fetch(`/api/flight-history?user_id=${memberId}`)
              ]);

              if (progressRes.ok) {
                const progressData = await progressRes.json();
                const lessonProgress = progressData.data || [];
                
                // Get lessons for this syllabus
                const syllabusLessons = lessonsList.filter((lesson: { syllabus_id: string }) => lesson.syllabus_id === enrollment.syllabus_id);
                const totalLessons = syllabusLessons.length;
                
                // Count passed lessons for this syllabus
                const passedLessons = lessonProgress.filter((record: { status: string; lesson_id: string }) => {
                  if (record.status !== 'pass') return false;
                  const lesson = lessonsList.find((l: { id: string; syllabus_id: string }) => l.id === record.lesson_id);
                  return lesson && lesson.syllabus_id === enrollment.syllabus_id;
                }).length;

                progress = {
                  completed_lessons: passedLessons,
                  total_lessons: totalLessons,
                  flight_hours: 0,
                  percentage: totalLessons > 0 ? Math.round((passedLessons / totalLessons) * 100) : 0
                };
              }

              if (flightRes.ok) {
                const flightData = await flightRes.json();
                const flights = flightData.flight_history || [];
                const totalHours = flights.reduce((total: number, flight: { flight_time: string | number }) => {
                  const hours = parseFloat(String(flight.flight_time)) || 0;
                  return total + hours;
                }, 0);
                progress.flight_hours = totalHours;
              }
            } catch (err) {
              console.log('Error fetching progress for enrollment:', enrollment.id, err);
            }

            return {
              ...enrollment,
              syllabus,
              instructor,
              progress
            };
          })
        );

        setStudent(studentInfo);
        setEnrollments(enrichedEnrollments);
        
        // Set first enrollment as default selection if available
        if (enrichedEnrollments.length > 0 && !selectedSyllabusId) {
          setSelectedSyllabusId(enrichedEnrollments[0].syllabus_id);
        }

      } catch (err) {
        console.error('Error fetching student data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load student data');
      } finally {
        setLoading(false);
      }
    }

    fetchStudentData();
  }, [memberId, selectedSyllabusId]);

  // Flight history helper functions
  const flights = allFlights.filter((flight) => {
    const flightDate = new Date(flight.actual_end || flight.booking_end_time || '');
    return isWithinInterval(flightDate, { start: dateFrom, end: dateTo });
  });

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

  const getFlightHours = (flight: FlightHistoryEntry): number => {
    const flightTime = flight.flight_time;
    if (flightTime == null) return 0;
    const hours = typeof flightTime === 'string' ? Number(flightTime) : flightTime;
    return isFinite(hours) ? hours : 0;
  };

  const getFlightHoursDisplay = (flight: FlightHistoryEntry): string => {
    const flightTime = flight.flight_time;
    if (flightTime == null) return "-";
    
    const hoursStr = String(flightTime);
    // If already has a decimal point, keep as-is; otherwise add .0 (e.g., "1" -> "1.0")
    return hoursStr.includes('.') ? hoursStr : `${hoursStr}.0`;
  };

  const totalFlightHours = flights.reduce((total, f) => total + getFlightHours(f), 0);

  // Get selected enrollment progress
  const selectedEnrollment = enrollments.find(e => e.syllabus_id === selectedSyllabusId);

  // Calculate last flight info
  const getLastFlightInfo = () => {
    if (allFlights.length === 0) return null;

    // Sort flights by actual_end or booking_end_time to get the most recent
    const sortedFlights = [...allFlights].sort((a, b) => {
      const dateA = new Date(a.actual_end || a.booking_end_time || '');
      const dateB = new Date(b.actual_end || b.booking_end_time || '');
      return dateB.getTime() - dateA.getTime();
    });

    const lastFlight = sortedFlights[0];
    const lastFlightDate = new Date(lastFlight.actual_end || lastFlight.booking_end_time || '');
    const daysSinceLastFlight = differenceInDays(new Date(), lastFlightDate);

    return {
      date: lastFlightDate,
      daysSince: daysSinceLastFlight,
      flight: lastFlight
    };
  };

  const lastFlightInfo = getLastFlightInfo();

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading student training record...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-gray-600 text-xl mb-4">Student not found</div>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        {/* Back link */}
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-8">
          <Link href="/dashboard/training" className="text-indigo-600 hover:underline text-base flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Training Overview
          </Link>
        </div>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <Link href={`/dashboard/members/view/${memberId}`} className="text-gray-900 hover:text-indigo-600 transition-colors">
                {student.first_name} {student.last_name}
              </Link>
            </h1>
            <p className="text-gray-600 text-lg">Training Record</p>
          </div>
        </div>
      </div>


      {/* Training Progress */}
      <div className="mb-8">
        {enrollments.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-3">No Training Enrollments</h3>
              <p className="text-gray-500 text-center max-w-md text-lg">
                This student is not currently enrolled in any training syllabi.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-3">
                <Target className="w-5 h-5 text-indigo-600" />
                Training Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Syllabus Selector - Only show if more than 1 enrollment */}
              {enrollments.length > 1 && (
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 min-w-[80px]">Syllabus:</label>
                  <Select value={selectedSyllabusId} onValueChange={setSelectedSyllabusId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a syllabus" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrollments.map((enrollment) => (
                        <SelectItem key={enrollment.id} value={enrollment.syllabus_id}>
                          {enrollment.syllabus?.name || 'Unknown Syllabus'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Progress Information */}
              {selectedEnrollment && (
                <div className="space-y-6">
                  {/* Progress Section - Similar to Screenshot */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedEnrollment.syllabus?.name || 'Private Pilots License'}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <span className="font-medium">
                              {selectedEnrollment.progress?.completed_lessons || 0} lessons passed
                            </span>
                            <span className="font-medium">
                              {(selectedEnrollment.progress?.total_lessons || 0) - (selectedEnrollment.progress?.completed_lessons || 0)} remaining
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-indigo-600">
                              {selectedEnrollment.progress?.percentage || 0}%
                            </div>
                            <div className="text-sm text-indigo-600 font-medium">Complete</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Progress value={selectedEnrollment.progress?.percentage || 0} className="h-3" />
                  </div>

                </div>
              )}

              {/* All Enrollments Table */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">All Syllabi</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 pl-4 pr-4 font-medium text-gray-900">Syllabus</th>
                        <th className="text-left py-3 pr-4 font-medium text-gray-900">Primary Instructor</th>
                        <th className="text-left py-3 pr-4 font-medium text-gray-900">Enrolled</th>
                        <th className="text-left py-3 pr-4 font-medium text-gray-900">Last Flight</th>
                        <th className="text-left py-3 pr-4 font-medium text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((enrollment) => (
                        <tr 
                          key={enrollment.id} 
                          className={cn(
                            "border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors",
                            enrollment.syllabus_id === selectedSyllabusId && "bg-indigo-50"
                          )}
                          onClick={() => setSelectedSyllabusId(enrollment.syllabus_id)}
                        >
                          <td className="py-4 pl-4 pr-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-gray-500" />
                              {enrollment.syllabus?.name || 'Unknown Syllabus'}
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-sm">
                            {enrollment.instructor ? (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span>{enrollment.instructor.name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </td>
                          <td className="py-4 pr-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {new Date(enrollment.enrolled_at).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {differenceInDays(new Date(), new Date(enrollment.enrolled_at))} days ago
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-sm">
                            {lastFlightInfo ? (
                              <div className="flex items-center gap-2">
                                <Plane className="w-4 h-4 text-gray-500" />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {lastFlightInfo.date.toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {lastFlightInfo.daysSince} days ago
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">No flights</span>
                            )}
                          </td>
                          <td className="py-4 pr-4">
                            <Badge
                              variant={enrollment.status === 'active' ? 'default' : 'secondary'}
                              className={enrollment.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                            >
                              {enrollment.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Flight History Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Plane className="w-5 h-5 text-indigo-600" />
              Flight History
            </CardTitle>
            
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
        </CardHeader>
        <CardContent className="p-6">
          {/* Stats bar */}
          <div className="flex flex-col md:flex-row items-stretch gap-4 bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
            <div className="flex-1 flex flex-col items-center justify-center">
              <Plane className="w-6 h-6 mb-1 text-indigo-500" />
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

          {flightLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading flight history...</div>
            </div>
          ) : flightError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">{flightError}</div>
            </div>
          ) : flights.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-900 mb-2">No completed flights found</p>
              <p className="text-gray-600 mb-4">No flights in the selected date range</p>
              <Button 
                onClick={() => (window.location.href = '/dashboard/bookings')}
                variant="outline"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Flight
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Flight Date</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Aircraft</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Instructor</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Lesson</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Flight Time</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((flight) => (
                    <tr
                      key={flight.flight_log_id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td
                        className="py-3 pr-4 text-sm cursor-pointer"
                        onClick={() => (window.location.href = `/dashboard/bookings/view/${flight.booking_id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {format(new Date(flight.actual_end || flight.booking_end_time || ''), 'dd MMM yyyy')}
                          </span>
                        </div>
                      </td>
                      <td
                        className="py-3 pr-4 font-medium text-gray-900 cursor-pointer"
                        onClick={() => (window.location.href = `/dashboard/bookings/view/${flight.booking_id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-gray-500" />
                          {flight.aircraft_registration || `Aircraft ${flight.aircraft_id?.substring(0, 8) || 'N/A'}`}
                        </div>
                      </td>
                      <td
                        className="py-3 pr-4 text-sm cursor-pointer"
                        onClick={() => (window.location.href = `/dashboard/bookings/view/${flight.booking_id}`)}
                      >
                        {flight.instructor_id ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span>
                              {flight.instructor_first_name || flight.instructor_last_name
                                ? `${flight.instructor_first_name || ""} ${flight.instructor_last_name || ""}`.trim()
                                : 'Instructor'
                              }
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Solo</span>
                        )}
                      </td>
                      <td
                        className="py-3 pr-4 text-sm cursor-pointer"
                        onClick={() => (window.location.href = `/dashboard/bookings/view/${flight.booking_id}`)}
                      >
                        {flight.lesson_name ? (
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">
                              {flight.lesson_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No lesson</span>
                        )}
                      </td>
                      <td
                        className="py-3 pr-4 text-sm font-medium cursor-pointer"
                        onClick={() => (window.location.href = `/dashboard/bookings/view/${flight.booking_id}`)}
                      >
                        {getFlightHoursDisplay(flight)}h
                      </td>
                      <td className="py-3 text-sm">
                        {flight.lesson_progress_id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/dashboard/bookings/debrief/view/${flight.booking_id}`;
                            }}
                            className="h-8 px-3 text-xs"
                          >
                            View Debrief
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-xs">No debrief</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}