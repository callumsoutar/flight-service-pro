"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import type { LessonProgress, LessonOutcome } from "@/types/lesson_progress";
import type { Lesson } from "@/types/lessons";
import type { User } from "@/types/users";
import type { Instructor } from "@/types/instructors";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface MemberTrainingHistoryTabProps {
  memberId: string;
}

export default function MemberTrainingHistoryTab({ memberId }: MemberTrainingHistoryTabProps) {
  const router = useRouter();
  const [records, setRecords] = useState<LessonProgress[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [instructors, setInstructors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    // Fetch lesson_progress, lessons, and instructors
    Promise.all([
      fetch(`/api/lesson_progress?user_id=${memberId}`)
        .then(res => res.json())
        .then(data => Array.isArray(data.data) ? data.data : []),
      fetch(`/api/lessons`).then(res => res.json()).then(data => Array.isArray(data.lessons) ? data.lessons : []),
      fetch(`/api/instructors`).then(res => res.json()).then(data => Array.isArray(data.instructors) ? data.instructors : []),
    ])
      .then(async ([progressData, lessonsData, instructorsData]) => {
        setRecords(progressData);
        setLessons(lessonsData);
        
        // Create instructor map: instructor_id -> instructor record
        const instructorMap: Record<string, Instructor> = {};
        instructorsData.forEach((instructor: Instructor) => {
          instructorMap[instructor.id] = instructor;
        });
        
        // Collect unique user_ids from instructors
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
        
        // Create final instructor map: instructor_id -> user data
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
  }, [memberId]);

  // Map lesson_id to lesson name
  const lessonNameMap = lessons.reduce<Record<string, string>>((acc, lesson) => {
    acc[lesson.id] = lesson.name;
    return acc;
  }, {});

  // Helper for instructor name
  function getInstructorName(id?: string | null) {
    if (!id) return "-";
    const u = instructors[id];
    if (!u) {
      return `Unknown (${id.slice(0, 8)}...)`;
    }
    return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || `Unknown (${id.slice(0, 8)}...)`;
  }

  // Helper: status to badge color
  function StatusBadge({ status }: { status?: LessonOutcome | null }) {
    if (!status) return <Badge variant="secondary">-</Badge>;
    
    let color: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let displayLabel: string = status;
    let customClass = "";
    
    switch (status) {
      case "pass":
        color = "default"; 
        displayLabel = "Pass"; 
        customClass = "bg-green-100 text-green-800 border-green-200"; 
        break;
      case "not yet competent":
        color = "destructive"; 
        displayLabel = "Not Yet Competent"; 
        break;
      default:
        color = "secondary";
        displayLabel = status;
    }
    
    return <Badge variant={color} className={customClass}>{displayLabel}</Badge>;
  }

  return (
    <Card className="w-full">
      <CardContent className="py-4 px-2 sm:px-6 w-full">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Training History</h3>
          <div className="mb-2">
            {loading ? (
              <div className="text-muted-foreground py-8 text-center">Loading training history...</div>
            ) : error ? (
              <div className="text-destructive py-8 text-center">{error}</div>
            ) : records.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">No training history found for this member.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="py-3 px-4 font-semibold text-gray-700">Date</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-700">Lesson</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-700">Attempt</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-700">Instructor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((row) => {
                      const isClickable = !!row.booking_id;
                      return (
                        <TableRow
                          key={row.id}
                          className={
                            (isClickable ? "cursor-pointer hover:bg-blue-50 transition" : "") +
                            " group border-b last:border-0 hover:shadow-sm hover:z-10"
                          }
                          onClick={isClickable ? () => router.push(`/dashboard/bookings/debrief/${row.booking_id}`) : undefined}
                          style={{ height: 56 }}
                        >
                          <TableCell className="py-3 px-4">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="py-3 px-4">{row.lesson_id ? lessonNameMap[row.lesson_id] || row.lesson_id : "-"}</TableCell>
                          <TableCell className="py-3 px-4"><StatusBadge status={row.status} /></TableCell>
                          <TableCell className="py-3 px-4">{row.attempt != null ? row.attempt : "-"}</TableCell>
                          <TableCell className="py-3 px-4">{getInstructorName(row.instructor_id)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 