"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  BookOpen,
  User as UserIcon,
  Eye,
  MessageCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import type { LessonProgress, LessonOutcome } from "@/types/lesson_progress";
import type { Lesson } from "@/types/lessons";
import type { User } from "@/types/users";

interface LessonProgressTabProps {
  memberId: string;
  records: LessonProgress[];
  lessons: Lesson[];
  instructors: Record<string, User>;
  loading: boolean;
  error: string | null;
  dateRange: {from: Date; to: Date};
  setDateRange: (range: {from: Date; to: Date}) => void;
  expandedRows: Set<string>;
  toggleRowExpansion: (recordId: string) => void;
}

export default function LessonProgressTab({
  records,
  lessons,
  instructors,
  loading,
  error,
  dateRange,
  setDateRange,
  expandedRows,
  toggleRowExpansion
}: LessonProgressTabProps) {
  const router = useRouter();

  // Create lesson name mapping
  const lessonNameMap = lessons.reduce((acc, lesson) => {
    acc[lesson.id] = lesson.name;
    return acc;
  }, {} as Record<string, string>);

  // Get instructor name helper
  const getInstructorName = (instructorId: string | null): string => {
    if (!instructorId) return "Unknown";
    const instructor = instructors[instructorId];
    if (!instructor) return "Unknown";
    return `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.email || "Unknown";
  };

  // Filter records by date range
  const filteredRecords = records.filter(record => {
    const recordDate = new Date(record.date || record.created_at);
    return recordDate >= dateRange.from && recordDate <= dateRange.to;
  });

  // Helper: format relative dates
  function formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date)) return format(date, "EEEE"); // Day name
    return format(date, "MMM d, yyyy");
  }

  // Helper: Status badge component
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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading lesson progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Card className="rounded-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Training Timeline
          </CardTitle>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal w-[140px]"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-gray-500">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal w-[140px]"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.to, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: new Date()
                  })}
                  className="text-xs"
                >
                  30 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                    to: new Date()
                  })}
                  className="text-xs"
                >
                  60 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                    to: new Date()
                  })}
                  className="text-xs"
                >
                  90 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                    to: new Date()
                  })}
                  className="text-xs"
                >
                  12 Months
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900 mb-2">No training history found</p>
            <p className="text-gray-600">
              {records.length === 0
                ? "Completed lessons will appear here"
                : `No lessons found in the selected date range (${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')})`
              }
            </p>
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
                  <th className="text-center py-3 pr-4 font-medium text-gray-900">Attempt #</th>
                  <th className="text-center py-3 pr-4 font-medium text-gray-900">Comments</th>
                  <th className="text-center py-3 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const isClickable = !!record.booking_id;
                  const lessonName = record.lesson_id ? lessonNameMap[record.lesson_id] || 'Unknown Lesson' : 'Unknown Lesson';
                  const instructorName = getInstructorName(record.instructor_id);
                  const dateDisplay = formatRelativeDate(record.date || record.created_at);
                  const hasComments = record.instructor_comments && record.instructor_comments.trim().length > 0;
                  const isExpanded = expandedRows.has(record.id);

                  return (
                    <React.Fragment key={record.id}>
                      <tr
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${hasComments ? 'cursor-pointer' : isClickable ? 'cursor-pointer' : ''}`}
                        onClick={hasComments ? () => toggleRowExpansion(record.id) : isClickable ? () => router.push(`/dashboard/bookings/debrief/view/${record.booking_id}`) : undefined}
                      >
                        <td className="py-3 pr-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            <span className="truncate">{lessonName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-700">{dateDisplay}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-500" />
                            <span className="max-w-[120px] truncate text-gray-700">{instructorName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200 font-medium">
                            {record.attempt || 1}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {hasComments ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(record.id);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 mr-1" />
                              ) : (
                                <ChevronRight className="w-4 h-4 mr-1" />
                              )}
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {isClickable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/bookings/debrief/view/${record.booking_id}`);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1.5" />
                              View
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                      {hasComments && isExpanded && (
                        <tr key={`${record.id}-comments`} className="border-b border-gray-100">
                          <td colSpan={7} className="p-0">
                            <div className="bg-blue-50 border-l-4 border-blue-200 px-4 py-3">
                              <div className="flex items-start gap-3">
                                <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-sm text-gray-800 leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                      __html: record.instructor_comments || ''
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}