"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useOrgContext } from "@/components/OrgContextProvider";
import type { LessonProgress } from "@/types/lesson_progress";
import type { Lesson } from "@/types/lessons";
import type { User } from "@/types/users";

interface MemberTrainingHistoryTabProps {
  memberId: string;
}

export default function MemberTrainingHistoryTab({ memberId }: MemberTrainingHistoryTabProps) {
  const { currentOrgId } = useOrgContext();
  const [records, setRecords] = useState<LessonProgress[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [instructors, setInstructors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId || !currentOrgId) return;
    setLoading(true);
    setError(null);
    // Fetch lesson_progress, lessons, and instructors
    Promise.all([
      fetch(`/api/lesson_progress?user_id=${memberId}`)
        .then(res => res.json())
        .then(data => Array.isArray(data.data) ? data.data : []),
      fetch(`/api/lessons`).then(res => res.json()).then(data => Array.isArray(data.lessons) ? data.lessons : []),
    ])
      .then(async ([progressData, lessonsData]) => {
        setRecords(progressData);
        setLessons(lessonsData);
        // Collect unique instructor_ids
        const instructorIds = Array.from(new Set(progressData.map((r: LessonProgress) => r.instructor_id).filter(Boolean)));
        let instructorMap: Record<string, User> = {};
        if (instructorIds.length > 0) {
          const usersRes = await fetch(`/api/users?ids=${instructorIds.join(",")}`);
          const usersData = await usersRes.json();
          if (Array.isArray(usersData.users)) {
            usersData.users.forEach((u: User) => { instructorMap[u.id] = u; });
          }
        }
        setInstructors(instructorMap);
      })
      .catch((e) => setError(e.message || "Failed to load training history"))
      .finally(() => setLoading(false));
  }, [memberId, currentOrgId]);

  // Map lesson_id to lesson name
  const lessonNameMap = lessons.reduce<Record<string, string>>((acc, lesson) => {
    acc[lesson.id] = lesson.name;
    return acc;
  }, {});

  // Helper for instructor name
  function getInstructorName(id?: string | null) {
    if (!id) return "-";
    const u = instructors[id];
    if (!u) return id;
    return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || id;
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
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Lesson</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempt</TableHead>
                      <TableHead>Instructor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.date ? new Date(row.date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{row.lesson_id ? lessonNameMap[row.lesson_id] || row.lesson_id : "-"}</TableCell>
                        <TableCell>{row.status || "-"}</TableCell>
                        <TableCell>{row.attempt != null ? row.attempt : "-"}</TableCell>
                        <TableCell>{getInstructorName(row.instructor_id)}</TableCell>
                      </TableRow>
                    ))}
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