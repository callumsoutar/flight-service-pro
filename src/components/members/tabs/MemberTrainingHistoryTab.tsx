"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Progress from "@/components/ui/progress";
import type { LessonProgress, LessonOutcome } from "@/types/lesson_progress";
import type { Lesson } from "@/types/lessons";
import type { User } from "@/types/users";
import type { Instructor } from "@/types/instructors";
import type { Syllabus } from "@/types/syllabus";

import { useRouter } from "next/navigation";
import { 
  Calendar, 
  BookOpen, 
  User as UserIcon,
  Eye,
  Target
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";

interface MemberTrainingHistoryTabProps {
  memberId: string;
}



export default function MemberTrainingHistoryTab({ memberId }: MemberTrainingHistoryTabProps) {
  const router = useRouter();
  const [records, setRecords] = useState<LessonProgress[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [enrolledSyllabi, setEnrolledSyllabi] = useState<Syllabus[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>("");
  const [instructors, setInstructors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetch(`/api/lesson_progress?user_id=${memberId}`)
        .then(res => res.json())
        .then(data => Array.isArray(data.data) ? data.data : []),
      fetch(`/api/lessons`).then(res => res.json()).then(data => Array.isArray(data.lessons) ? data.lessons : []),
      fetch(`/api/syllabus`).then(res => res.json()).then(data => Array.isArray(data.syllabi) ? data.syllabi : []),
      fetch(`/api/student_syllabus_enrollment?user_id=${memberId}`).then(res => res.json()).then(data => Array.isArray(data.data) ? data.data : []),
      fetch(`/api/instructors`).then(res => res.json()).then(data => Array.isArray(data.instructors) ? data.instructors : []),
    ])
      .then(async ([progressData, lessonsData, syllabiData, enrollmentData, instructorsData]) => {
        // Sort records by date, most recent first
        const sortedRecords = progressData.sort((a: LessonProgress, b: LessonProgress) => 
          new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
        );
        
        setRecords(sortedRecords);
        setLessons(lessonsData);
        setSyllabi(syllabiData);
        
        // Filter syllabi to only show enrolled ones
        const enrolledSyllabusIds = enrollmentData.map((enrollment: { syllabus_id: string }) => enrollment.syllabus_id);
        const userEnrolledSyllabi = syllabiData.filter((syllabus: Syllabus) => 
          enrolledSyllabusIds.includes(syllabus.id)
        );
        setEnrolledSyllabi(userEnrolledSyllabi);
        
        // Set first enrolled syllabus as default selection if available
        if (userEnrolledSyllabi.length > 0 && !selectedSyllabusId) {
          setSelectedSyllabusId(userEnrolledSyllabi[0].id);
        }
        
        // Create instructor map
        const instructorMap: Record<string, Instructor> = {};
        instructorsData.forEach((instructor: Instructor) => {
          instructorMap[instructor.id] = instructor;
        });
        
        // Get user details for instructors
        const instructorIds = Array.from(new Set(progressData.map((r: LessonProgress) => r.instructor_id).filter(Boolean))) as string[];
        const userIds = instructorIds
          .map(id => instructorMap[id]?.user_id)
          .filter(Boolean);
        
        const userMap: Record<string, User> = {};
        if (userIds.length > 0) {
          const usersRes = await fetch(`/api/users?ids=${userIds.join(",")}`);
          const usersData = await usersRes.json();
          if (Array.isArray(usersData.users)) {
            usersData.users.forEach((u: User) => { userMap[u.id] = u; });
          }
        }
        
        // Create final instructor map
        const finalInstructorMap: Record<string, User> = {};
        instructorIds.forEach((instructorId: string) => {
          const instructor = instructorMap[instructorId];
          if (instructor && instructor.user_id) {
            const user = userMap[instructor.user_id];
            if (user) {
              finalInstructorMap[instructorId] = user;
            }
          }
        });
        
        setInstructors(finalInstructorMap);
      })
      .catch((e) => setError(e.message || "Failed to load training history"))
      .finally(() => setLoading(false));
  }, [memberId, selectedSyllabusId]);



  // Helper functions
  const lessonNameMap = lessons.reduce<Record<string, string>>((acc, lesson) => {
    acc[lesson.id] = lesson.name;
    return acc;
  }, {});

  function getInstructorName(id?: string | null) {
    if (!id) return "Not assigned";
    const u = instructors[id];
    if (!u) return `Unknown Instructor`;
    return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || `Unknown Instructor`;
  }

  // Calculate progress for selected syllabus
  function calculateSyllabusProgress() {
    if (!selectedSyllabusId) return { passed: 0, total: 0, percentage: 0 };
    
    const selectedSyllabus = syllabi.find(s => s.id === selectedSyllabusId);
    if (!selectedSyllabus) return { passed: 0, total: 0, percentage: 0 };
    
    // Get lessons for this syllabus
    const syllabusLessons = lessons.filter(lesson => lesson.syllabus_id === selectedSyllabusId);
    const totalLessons = syllabusLessons.length;
    
    // Count passed lessons for this syllabus
    const passedLessons = records.filter(record => {
      if (record.status !== 'pass') return false;
      const lesson = lessons.find(l => l.id === record.lesson_id);
      return lesson && lesson.syllabus_id === selectedSyllabusId;
    }).length;
    
    const percentage = totalLessons > 0 ? Math.round((passedLessons / totalLessons) * 100) : 0;
    
    return { passed: passedLessons, total: totalLessons, percentage };
  }

  const progressData = calculateSyllabusProgress();



  function formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date)) return format(date, "EEEE"); // Day name
    return format(date, "MMM d, yyyy");
  }



  function StatusBadge({ status }: { status?: LessonOutcome | null }) {
    if (!status) return <Badge variant="secondary">Pending</Badge>;
    
    switch (status) {
      case "pass":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Pass</Badge>;
      case "not yet competent":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Not Yet Competent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }



  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading training progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // If no enrolled syllabi, show empty state
  if (enrolledSyllabi.length === 0) {
    return (
      <div className="w-full space-y-6">
        <Card className="rounded-md">
          <CardContent className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Syllabus Enrollments</h3>
            <p className="text-gray-600 mb-4">This member is not enrolled in any training syllabi yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Syllabus Progress */}
      <Card className="rounded-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Training Progress
            </CardTitle>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {progressData.percentage}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Syllabus Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 min-w-[80px]">Syllabus:</label>
            <Select value={selectedSyllabusId} onValueChange={setSelectedSyllabusId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a syllabus" />
              </SelectTrigger>
              <SelectContent>
                {enrolledSyllabi.map((syllabus) => (
                  <SelectItem key={syllabus.id} value={syllabus.id}>
                    {syllabus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Progress Bar */}
          {selectedSyllabusId && (
            <div className="space-y-2">
              <Progress value={progressData.percentage} className="h-3" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{progressData.passed} lessons passed</span>
                <span>{progressData.total - progressData.passed} remaining</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Timeline */}
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Training Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-900 mb-2">No training history found</p>
              <p className="text-gray-600">Completed lessons will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Lesson</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Instructor</th>
                    <th className="text-left py-3 pr-4 font-medium text-gray-900">Attempt</th>
                    <th className="text-left py-3 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const isClickable = !!record.booking_id;
                    const lessonName = record.lesson_id ? lessonNameMap[record.lesson_id] || 'Unknown Lesson' : 'Unknown Lesson';
                    const instructorName = getInstructorName(record.instructor_id);
                    const dateDisplay = formatRelativeDate(record.date || record.created_at);

                    return (
                      <tr 
                        key={record.id} 
                        className={`border-b border-gray-100 ${isClickable ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                        onClick={isClickable ? () => router.push(`/dashboard/bookings/debrief/view/${record.booking_id}`) : undefined}
                      >
                        <td className="py-3 pr-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            {lessonName}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            {dateDisplay}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-500" />
                            <span className="max-w-[120px] truncate">{instructorName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm">
                          {record.attempt && record.attempt > 1 ? (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              Attempt {record.attempt}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">1</span>
                          )}
                        </td>
                        <td className="py-3">
                          {isClickable ? (
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 