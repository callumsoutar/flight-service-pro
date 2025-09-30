"use client";
import { useState, useEffect } from "react";
import { Search, Users, BookOpen, Target, User, Clock, ChevronRight, GraduationCap, Plane } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import type { StudentSyllabusEnrollment } from "@/types/student_syllabus_enrollment";
import type { Syllabus } from "@/types/syllabus";
import type { User as UserType } from "@/types/users";

interface InstructorWithName {
  id: string;
  first_name: string | null | undefined;
  last_name: string | null | undefined;
  name: string;
}

interface EnrollmentWithDetails extends StudentSyllabusEnrollment {
  user?: UserType;
  syllabus?: Syllabus;
  instructor?: InstructorWithName;
  progress?: {
    completed_lessons: number;
    total_lessons: number;
    flight_hours: number;
    percentage: number;
  };
  lastFlight?: {
    date: Date;
    daysSince: number;
  } | null;
}

export default function TrainingClientPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [syllabusFilter, setSyllabusFilter] = useState("all");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Unique values for filters
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [instructors, setInstructors] = useState<InstructorWithName[]>([]);

  useEffect(() => {
    async function fetchTrainingData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all student enrollments with related data
        const [enrollmentsRes, syllabiRes, instructorsRes, usersRes, lessonsRes] = await Promise.all([
          fetch('/api/student_syllabus_enrollment'),
          fetch('/api/syllabus'),
          fetch('/api/instructors'),
          fetch('/api/users'),
          fetch('/api/lessons')
        ]);

        if (!enrollmentsRes.ok || !syllabiRes.ok || !instructorsRes.ok || !usersRes.ok || !lessonsRes.ok) {
          throw new Error('Failed to fetch training data');
        }

        const [enrollmentsData, syllabiData, instructorsData, usersData, lessonsData] = await Promise.all([
          enrollmentsRes.json(),
          syllabiRes.json(),
          instructorsRes.json(),
          usersRes.json(),
          lessonsRes.json()
        ]);

        const enrollmentsList = enrollmentsData.data || [];
        const syllabiList = syllabiData.syllabi || [];
        const instructorsList = instructorsData.instructors || [];
        const usersList = usersData.users || [];
        const lessonsList = lessonsData.lessons || [];

        // Create lookup maps
        const syllabusMap = new Map(syllabiList.map((s: Syllabus) => [s.id, s]));
        const userMap = new Map(usersList.map((u: UserType) => [u.id, u]));
        // const lessonsMap = new Map(lessonsList.map((l: any) => [l.id, l]));
        
        // Create instructor map with user details
        const instructorMap = new Map<string, InstructorWithName>();
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

        // Enrich enrollments with related data
        const enrichedEnrollments: EnrollmentWithDetails[] = await Promise.all(
          enrollmentsList.map(async (enrollment: StudentSyllabusEnrollment) => {
            const user = userMap.get(enrollment.user_id);
            const syllabus = syllabusMap.get(enrollment.syllabus_id);
            const instructor = enrollment.primary_instructor_id ? 
              instructorMap.get(enrollment.primary_instructor_id) : null;

            // Fetch progress data for this student
            let progress = { completed_lessons: 0, total_lessons: 0, flight_hours: 0, percentage: 0 };
            let lastFlightInfo: { date: Date; daysSince: number; } | null = null;

            try {
              // Get lesson progress for this user and syllabus
              const [progressRes, flightRes] = await Promise.all([
                fetch(`/api/lesson_progress?user_id=${enrollment.user_id}`),
                fetch(`/api/flight-history?user_id=${enrollment.user_id}`)
              ]);

              if (progressRes.ok) {
                const progressData = await progressRes.json();
                const lessonProgress = progressData.data || [];

                // Get lessons for this syllabus (correct approach from MemberTrainingHistoryTab)
                const syllabusLessons = lessonsList.filter((lesson: { syllabus_id: string }) => lesson.syllabus_id === enrollment.syllabus_id);
                const totalLessons = syllabusLessons.length;

                // Count passed lessons for this syllabus (correct approach from MemberTrainingHistoryTab)
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
                  const hours = typeof flight.flight_time === 'number'
                    ? flight.flight_time
                    : parseFloat(flight.flight_time.toString()) || 0;
                  return total + hours;
                }, 0);
                progress.flight_hours = totalHours;

                // Calculate last flight info
                if (flights.length > 0) {
                  // Sort flights by actual_end or booking_end_time to get the most recent
                  const sortedFlights = [...flights].sort((a: { actual_end?: string; booking_end_time?: string }, b: { actual_end?: string; booking_end_time?: string }) => {
                    const dateA = new Date(a.actual_end || a.booking_end_time || '');
                    const dateB = new Date(b.actual_end || b.booking_end_time || '');
                    return dateB.getTime() - dateA.getTime();
                  });

                  const lastFlight = sortedFlights[0];
                  const lastFlightDate = new Date(lastFlight.actual_end || lastFlight.booking_end_time || '');
                  const daysSinceLastFlight = differenceInDays(new Date(), lastFlightDate);

                  lastFlightInfo = {
                    date: lastFlightDate,
                    daysSince: daysSinceLastFlight
                  };
                }
              }
            } catch (err) {
              console.log('Error fetching progress for user:', enrollment.user_id, err);
            }

            return {
              ...enrollment,
              user,
              syllabus,
              instructor,
              progress,
              lastFlight: lastFlightInfo
            };
          })
        );

        setEnrollments(enrichedEnrollments);
        setSyllabi(syllabiList);
        setInstructors(Array.from(instructorMap.values()));

      } catch (err) {
        console.error('Error fetching training data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load training data');
      } finally {
        setLoading(false);
      }
    }

    fetchTrainingData();
  }, []);

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    const searchMatch = !searchTerm || 
      enrollment.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.syllabus?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const syllabusMatch = syllabusFilter === "all" || enrollment.syllabus_id === syllabusFilter;
    const instructorMatch = instructorFilter === "all" || enrollment.primary_instructor_id === instructorFilter;
    const statusMatch = statusFilter === "all" || enrollment.status === statusFilter;

    return searchMatch && syllabusMatch && instructorMatch && statusMatch;
  });

  // Calculate stats
  const stats = {
    totalStudents: enrollments.length,
    activeSyllabi: new Set(enrollments.map(e => e.syllabus_id)).size,
    activeInstructors: new Set(enrollments.filter(e => e.primary_instructor_id).map(e => e.primary_instructor_id)).size,
    avgProgress: enrollments.length > 0 ? 
      Math.round(enrollments.reduce((sum, e) => sum + (e.progress?.percentage || 0), 0) / enrollments.length) : 0
  };

  // Group enrollments by syllabus for display
  const groupedBySyllabus = filteredEnrollments.reduce((acc, enrollment) => {
    const syllabusName = enrollment.syllabus?.name || 'Unknown Syllabus';
    if (!acc[syllabusName]) {
      acc[syllabusName] = [];
    }
    acc[syllabusName].push(enrollment);
    return acc;
  }, {} as Record<string, EnrollmentWithDetails[]>);

  const handleStudentClick = (userId: string) => {
    router.push(`/dashboard/training/${userId}`);
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading training data...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Training Overview</h1>
            <p className="text-gray-600 text-lg">Monitor student progress across all training syllabi</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Syllabi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSyllabi}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Instructors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeInstructors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={syllabusFilter} onValueChange={setSyllabusFilter}>
              <SelectTrigger className="w-48 border-gray-200 rounded-lg">
                <SelectValue placeholder="All Syllabi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Syllabi</SelectItem>
                {syllabi.map(syllabus => (
                  <SelectItem key={syllabus.id} value={syllabus.id}>{syllabus.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={instructorFilter} onValueChange={setInstructorFilter}>
              <SelectTrigger className="w-48 border-gray-200 rounded-lg">
                <SelectValue placeholder="All Instructors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instructors</SelectItem>
                {instructors.map(instructor => (
                  <SelectItem key={instructor.id} value={instructor.id}>{instructor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 border-gray-200 rounded-lg">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Student Groups by Syllabus */}
      {Object.keys(groupedBySyllabus).length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-3">No students found</h3>
            <p className="text-gray-500 text-center max-w-md text-lg">
              {searchTerm || syllabusFilter !== "all" || instructorFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search or filters to find what you're looking for."
                : "No students are currently enrolled in any training syllabi."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedBySyllabus).map(([syllabusName, students]) => (
            <Card key={syllabusName} className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    {syllabusName}
                  </CardTitle>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    {students.length} student{students.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-0">
                  {students.map((enrollment, index) => (
                    <div
                      key={enrollment.id}
                      className={`p-4 border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group ${
                        index !== students.length - 1 ? 'border-b' : ''
                      }`}
                      onClick={() => handleStudentClick(enrollment.user_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {enrollment.user ? 
                                `${enrollment.user.first_name || ''} ${enrollment.user.last_name || ''}`.trim() || enrollment.user.email :
                                'Unknown Student'
                              }
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              {enrollment.instructor && (
                                <div className="flex items-center gap-1">
                                  <GraduationCap className="w-4 h-4" />
                                  <span>{enrollment.instructor.name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>
                                  Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              {enrollment.lastFlight && (
                                <div className="flex items-center gap-1">
                                  <Plane className="w-4 h-4" />
                                  <span>
                                    Last flight {enrollment.lastFlight.date.toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })} ({enrollment.lastFlight.daysSince} days ago)
                                  </span>
                                </div>
                              )}
                              {enrollment.progress && enrollment.progress.flight_hours > 0 && (
                                <div className="flex items-center gap-1">
                                  <Plane className="w-4 h-4" />
                                  <span>{enrollment.progress.flight_hours.toFixed(1)}h total</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {enrollment.progress?.percentage || 0}% Complete
                            </div>
                            <div className="text-xs text-gray-500">
                              {enrollment.progress?.completed_lessons || 0} / {enrollment.progress?.total_lessons || 0} lessons
                            </div>
                          </div>
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${enrollment.progress?.percentage || 0}%` }}
                            />
                          </div>
                          <Badge 
                            variant={enrollment.status === 'active' ? 'default' : 'secondary'}
                            className={enrollment.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                          >
                            {enrollment.status}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}