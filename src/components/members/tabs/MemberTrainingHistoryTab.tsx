"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import type { LessonProgress } from "@/types/lesson_progress";
import type { Lesson } from "@/types/lessons";
import type { User } from "@/types/users";
import type { Instructor } from "@/types/instructors";
import type { Syllabus } from "@/types/syllabus";
import type { StudentSyllabusEnrollment } from "@/types/student_syllabus_enrollment";

import {
  Target,
  Edit3,
  X,
  BookOpen,
  GraduationCap
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// Import the new tab components
import LessonProgressTab from "./LessonProgressTab";
import ExamHistoryTab from "./ExamHistoryTab";

interface MemberTrainingHistoryTabProps {
  memberId: string;
}

// Type for exam result with joined exam and syllabus
interface ExamResultWithExamSyllabus {
  id: string;
  exam_id: string;
  user_id: string;
  score?: number | null;
  result: 'PASS' | 'FAIL';
  exam_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  exam?: {
    id: string;
    name: string;
    syllabus_id: string;
    syllabus?: {
      id: string;
      name: string;
    };
  };
}

export default function MemberTrainingHistoryTab({ memberId }: MemberTrainingHistoryTabProps) {
  // State for all data
  const [records, setRecords] = useState<LessonProgress[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [enrolledSyllabi, setEnrolledSyllabi] = useState<Syllabus[]>([]);
  const [enrollments, setEnrollments] = useState<StudentSyllabusEnrollment[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>("");
  const [instructors, setInstructors] = useState<Record<string, User>>({});
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingInstructor, setEditingInstructor] = useState(false);
  const [updatingInstructor, setUpdatingInstructor] = useState(false);

  // Exam results state
  const [examResults, setExamResults] = useState<ExamResultWithExamSyllabus[]>([]);
  const [examExpanded, setExamExpanded] = useState<Record<string, boolean>>({});

  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date())
  });

  // UI state for tabs and expanded rows
  const [selectedTab, setSelectedTab] = useState("lessons");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (recordId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(recordId)) {
      newExpandedRows.delete(recordId);
    } else {
      newExpandedRows.add(recordId);
    }
    setExpandedRows(newExpandedRows);
  };

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
      fetch(`/api/exam_results?user_id=${memberId}`).then(res => res.json()).then(data => Array.isArray(data.exam_results) ? data.exam_results : []),
      fetch(`/api/exams`).then(res => res.json()).then(data => Array.isArray(data.exams) ? data.exams : []),
    ])
      .then(async ([progressData, lessonsData, syllabiData, enrollmentData, instructorsData, examResultsData]) => {
        // Sort records by date, most recent first
        const sortedRecords = progressData.sort((a: LessonProgress, b: LessonProgress) =>
          new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
        );

        setRecords(sortedRecords);
        setLessons(lessonsData);
        setSyllabi(syllabiData);
        setEnrollments(enrollmentData);
        setExamResults(examResultsData);

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

        // Store all instructors for dropdown
        setAllInstructors(instructorsData);

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
          const usersResponse = await fetch(`/api/users?ids=${userIds.join(',')}`);
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            if (Array.isArray(usersData.users)) {
              usersData.users.forEach((user: User) => {
                userMap[user.id] = user;
              });
            }
          }
        }

        // Map instructor IDs to user details
        const finalInstructorMap: Record<string, User> = {};
        instructorIds.forEach(instructorId => {
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
  const getProgressStats = () => {
    if (!selectedSyllabusId) return { passed: 0, total: 0, percentage: 0 };

    const selectedSyllabus = syllabi.find(s => s.id === selectedSyllabusId);
    if (!selectedSyllabus) return { passed: 0, total: 0, percentage: 0 };

    // Get all lessons for this syllabus
    const syllabusLessons = lessons.filter(lesson => lesson.syllabus_id === selectedSyllabusId);

    // Get progress records for this syllabus
    const syllabusProgress = records.filter(record => {
      const lesson = lessons.find(l => l.id === record.lesson_id);
      return lesson && lesson.syllabus_id === selectedSyllabusId;
    });

    // Count passed lessons (lessons with at least one "pass" status)
    const passedLessons = syllabusLessons.filter(lesson => {
      return syllabusProgress.some(progress =>
        progress.lesson_id === lesson.id && progress.status === "pass"
      );
    });

    const passed = passedLessons.length;
    const total = syllabusLessons.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { passed, total, percentage };
  };

  const currentEnrollment = enrollments.find(e => e.syllabus_id === selectedSyllabusId);

  // Handle instructor change
  const handleInstructorChange = async (instructorId: string) => {
    if (!currentEnrollment) return;

    setUpdatingInstructor(true);
    try {
      const res = await fetch("/api/student_syllabus_enrollment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentEnrollment.id,
          primary_instructor_id: instructorId,
        }),
      });

      if (!res.ok) throw new Error("Failed to update instructor");

      // Update local state
      setEnrollments(prev => prev.map(e =>
        e.id === currentEnrollment.id
          ? { ...e, primary_instructor_id: instructorId }
          : e
      ));

      setEditingInstructor(false);
      toast.success("Primary instructor updated successfully!");
    } catch {
      toast.error("Failed to update instructor");
    } finally {
      setUpdatingInstructor(false);
    }
  };

  const progressStats = getProgressStats();

  const tabs = [
    { id: "lessons", label: "Lesson Progress", icon: BookOpen },
    { id: "exams", label: "Exam History", icon: GraduationCap },
  ];

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
          <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Progress Summary */}
      {selectedSyllabusId && (
        <Card className="rounded-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {enrolledSyllabi.length > 1 ? 'Training Progress' : enrolledSyllabi.find(s => s.id === selectedSyllabusId)?.name}
              </CardTitle>

              {enrolledSyllabi.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Syllabus:</span>
                  <Select value={selectedSyllabusId} onValueChange={setSelectedSyllabusId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select syllabus" />
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
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Progress Bar Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Lesson Completion</span>
                  <span className="text-sm font-semibold text-gray-900">{progressStats.passed}/{progressStats.total} lessons</span>
                </div>
                <div className="text-center mb-3">
                  <span className="text-sm font-medium text-indigo-600">{progressStats.percentage}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressStats.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Enrollment Details Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Enrolled:</span>
                    <span className="text-sm text-gray-900">
                      {currentEnrollment?.enrolled_at ?
                        format(new Date(currentEnrollment.enrolled_at), 'MMM d, yyyy') :
                        'Unknown'
                      }
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Primary Instructor:</span>
                  {editingInstructor ? (
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue={currentEnrollment?.primary_instructor_id || ""}
                        onValueChange={handleInstructorChange}
                        disabled={updatingInstructor}
                      >
                        <SelectTrigger className="w-[160px] h-8">
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                        <SelectContent>
                          {allInstructors.map(instructor => (
                            <SelectItem key={instructor.id} value={instructor.id}>
                              {instructor.first_name} {instructor.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingInstructor(false)}
                        disabled={updatingInstructor}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">
                        {currentEnrollment?.primary_instructor_id ?
                          (() => {
                            const instructor = allInstructors.find(i => i.id === currentEnrollment.primary_instructor_id);
                            return instructor ? `${instructor.first_name} ${instructor.last_name}` : 'Unknown';
                          })() :
                          'Not assigned'
                        }
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingInstructor(true)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="w-full">
        <Tabs.Root
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <div className="w-full border-b border-gray-200 bg-white rounded-t-md">
            <Tabs.List
              className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]"
              aria-label="Training tabs"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Tabs.Trigger
                    key={tab.id}
                    value={tab.id}
                    className={`inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                      data-[state=active]:border-indigo-700 data-[state=active]:text-indigo-800
                      data-[state=inactive]:text-muted-foreground hover:text-indigo-600 whitespace-nowrap`}
                    style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </Tabs.Trigger>
                );
              })}
            </Tabs.List>
          </div>

          <div className="w-full">
            <Tabs.Content value="lessons" className="h-full w-full">
              {selectedTab === "lessons" && (
                <LessonProgressTab
                  memberId={memberId}
                  records={records}
                  lessons={lessons}
                  instructors={instructors}
                  loading={false}
                  error={null}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  expandedRows={expandedRows}
                  toggleRowExpansion={toggleRowExpansion}
                />
              )}
            </Tabs.Content>

            <Tabs.Content value="exams" className="h-full w-full">
              {selectedTab === "exams" && (
                <ExamHistoryTab
                  memberId={memberId}
                  syllabi={syllabi}
                  examResults={examResults}
                  setExamResults={setExamResults}
                  examExpanded={examExpanded}
                  setExamExpanded={setExamExpanded}
                />
              )}
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </div>
    </div>
  );
}