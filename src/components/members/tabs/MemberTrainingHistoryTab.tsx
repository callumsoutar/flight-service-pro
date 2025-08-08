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
  CheckCircle, 
  XCircle, 
  Clock, 
  BookOpen, 
  User as UserIcon,
  Eye,
  Target
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, subDays } from "date-fns";

interface MemberTrainingHistoryTabProps {
  memberId: string;
}



export default function MemberTrainingHistoryTab({ memberId }: MemberTrainingHistoryTabProps) {
  const router = useRouter();
  const [records, setRecords] = useState<LessonProgress[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
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
      fetch(`/api/instructors`).then(res => res.json()).then(data => Array.isArray(data.instructors) ? data.instructors : []),
    ])
      .then(async ([progressData, lessonsData, syllabiData, instructorsData]) => {
        // Sort records by date, most recent first
        const sortedRecords = progressData.sort((a: LessonProgress, b: LessonProgress) => 
          new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
        );
        
        setRecords(sortedRecords);
        setLessons(lessonsData);
        setSyllabi(syllabiData);
        
        // Set first syllabus as default selection if available
        if (syllabiData.length > 0 && !selectedSyllabusId) {
          setSelectedSyllabusId(syllabiData[0].id);
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

  function StatusIcon({ status }: { status?: LessonOutcome | null }) {
    if (!status) return <Clock className="w-4 h-4 text-gray-400" />;
    
    switch (status) {
      case "pass":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "not yet competent":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
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

  // Group records by time periods
  const groupedRecords = {
    recent: records.filter(r => {
      const recordDate = new Date(r.date || r.created_at);
      const sevenDaysAgo = subDays(new Date(), 7);
      return recordDate >= sevenDaysAgo;
    }),
    thisMonth: records.filter(r => {
      const recordDate = new Date(r.date || r.created_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sevenDaysAgo = subDays(new Date(), 7);
      return recordDate >= thirtyDaysAgo && recordDate < sevenDaysAgo;
    }),
    older: records.filter(r => {
      const recordDate = new Date(r.date || r.created_at);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return recordDate < thirtyDaysAgo;
    }),
  };

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

  return (
    <div className="w-full space-y-6">
      {/* Syllabus Progress */}
      <Card>
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
                {syllabi.map((syllabus) => (
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Training Timeline
          </CardTitle>
        </CardHeader>
                 <CardContent className="space-y-4">
          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No training history found</p>
              <p className="text-sm">Completed lessons will appear here</p>
            </div>
          ) : (
            <>
              {/* Recent Lessons */}
              {groupedRecords.recent.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Recent Activity
                  </h4>
                                     <div className="space-y-2">
                     {groupedRecords.recent.map((record) => (
                       <LessonCard key={record.id} record={record} />
                     ))}
                   </div>
                </div>
              )}

              {/* This Month */}
              {groupedRecords.thisMonth.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    This Month
                  </h4>
                                     <div className="space-y-2">
                     {groupedRecords.thisMonth.map((record) => (
                       <LessonCard key={record.id} record={record} />
                     ))}
                   </div>
                </div>
              )}

              {/* Older */}
              {groupedRecords.older.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Earlier
                  </h4>
                                     <div className="space-y-2">
                     {groupedRecords.older.slice(0, 10).map((record) => (
                       <LessonCard key={record.id} record={record} />
                     ))}
                     {groupedRecords.older.length > 10 && (
                       <div className="text-center pt-2">
                         <Button variant="outline" size="sm">
                           View {groupedRecords.older.length - 10} More Lessons
                         </Button>
                       </div>
                     )}
                   </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  function LessonCard({ record }: { record: LessonProgress }) {
    const isClickable = !!record.booking_id;
    const lessonName = record.lesson_id ? lessonNameMap[record.lesson_id] || 'Unknown Lesson' : 'Unknown Lesson';
    const instructorName = getInstructorName(record.instructor_id);
    const dateDisplay = formatRelativeDate(record.date || record.created_at);

    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
          isClickable 
            ? 'hover:bg-blue-50 hover:border-blue-200 cursor-pointer' 
            : 'bg-gray-50'
        }`}
        onClick={isClickable ? () => router.push(`/dashboard/bookings/debrief/view/${record.booking_id}`) : undefined}
      >
        <div className="flex-shrink-0">
          <StatusIcon status={record.status} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900 truncate text-sm">{lessonName}</p>
            <StatusBadge status={record.status} />
            {record.attempt && record.attempt > 1 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                Attempt {record.attempt}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dateDisplay}
          </span>
          <span className="flex items-center gap-1 max-w-[120px] truncate">
            <UserIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{instructorName}</span>
          </span>
        </div>
        
        {isClickable && (
          <div className="flex-shrink-0">
            <Eye className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    );
  }
} 