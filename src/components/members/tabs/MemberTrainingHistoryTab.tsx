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
import type { AircraftType } from "@/types/aircraft_types";
import type { FlightExperience } from "@/types/flight_experience";

import {
  Target,
  Edit3,
  X,
  BookOpen,
  GraduationCap,
  Plus,
  UserPlus,
  MessageSquare,
  Plane
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";

// Import the new tab components
import LessonProgressTab from "./LessonProgressTab";
import ExamHistoryTab from "./ExamHistoryTab";
import EnrollMemberModal from "./EnrollMemberModal";

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
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([]);
  const [bookings, setBookings] = useState<Record<string, { purpose: string | null; aircraft_id: string | null; aircraft_registration: string | null; start_time: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [examsLoaded, setExamsLoaded] = useState(false);
  const [flightExperiencesLoaded, setFlightExperiencesLoaded] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [flightExperiencesLoading, setFlightExperiencesLoading] = useState(false);
  const [flightExperiences, setFlightExperiences] = useState<FlightExperience[]>([]);
  const [experienceTypes, setExperienceTypes] = useState<Record<string, { name: string }>>({});
  const [editingInstructor, setEditingInstructor] = useState(false);
  const [updatingInstructor, setUpdatingInstructor] = useState(false);
  const [editingAircraftType, setEditingAircraftType] = useState(false);
  const [updatingAircraftType, setUpdatingAircraftType] = useState(false);

  // Exam results state
  const [examResults, setExamResults] = useState<ExamResultWithExamSyllabus[]>([]);
  const [examExpanded, setExamExpanded] = useState<Record<string, boolean>>({});

  // Date range state - default to last 90 days
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: startOfDay(subDays(new Date(), 90)),
    to: endOfDay(new Date())
  });

  // UI state for tabs and expanded rows
  const [selectedTab, setSelectedTab] = useState("lessons");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Enrollment modal state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

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
    // Reset lazy load flags when member changes
    setBookingsLoaded(false);
    setExamsLoaded(false);
    setFlightExperiencesLoaded(false);

    Promise.all([
      fetch(`/api/lesson_progress?user_id=${memberId}`)
        .then(res => res.json())
        .then(data => Array.isArray(data.data) ? data.data : []),
      fetch(`/api/lessons`).then(res => res.json()).then(data => Array.isArray(data.lessons) ? data.lessons : []),
      fetch(`/api/syllabus`).then(res => res.json()).then(data => Array.isArray(data.syllabi) ? data.syllabi : []),
      fetch(`/api/student_syllabus_enrollment?user_id=${memberId}`).then(res => res.json()).then(data => Array.isArray(data.data) ? data.data : []),
      fetch(`/api/instructors`).then(res => res.json()).then(data => Array.isArray(data.instructors) ? data.instructors : []),
      fetch(`/api/aircraft-types`).then(res => res.json()).then(data => Array.isArray(data.aircraft_types) ? data.aircraft_types : []),
    ])
      .then(async ([progressData, lessonsData, syllabiData, enrollmentData, instructorsData, aircraftTypesData]) => {
        // Sort records by date, most recent first
        const sortedRecords = progressData.sort((a: LessonProgress, b: LessonProgress) =>
          new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
        );

        setRecords(sortedRecords);
        setLessons(lessonsData);
        setSyllabi(syllabiData);
        setEnrollments(enrollmentData);
        setAircraftTypes(aircraftTypesData);

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

  // Lazy load bookings when instructor comments tab is selected
  useEffect(() => {
    if (!memberId || selectedTab !== 'notes' || bookingsLoaded) return;
    
    const loadBookings = async () => {
      setBookingsLoading(true);
      try {
        // Get unique booking IDs from lesson progress records that have instructor comments
        const bookingIds = Array.from(new Set(
          records
            .filter((record: LessonProgress) => record.booking_id && record.instructor_comments && record.instructor_comments.trim() !== "")
            .map((record: LessonProgress) => record.booking_id)
            .filter(Boolean)
        )) as string[];

        // Fetch bookings for those IDs
        if (bookingIds.length > 0) {
          const bookingsPromises = bookingIds.map(id => 
            fetch(`/api/bookings?id=${id}`)
              .then(res => res.ok ? res.json() : null)
              .then(data => data?.booking || null)
              .catch(() => null)
          );
          
          const fetchedBookings = await Promise.all(bookingsPromises);
          const bookingsMap: Record<string, { purpose: string | null; aircraft_id: string | null; aircraft_registration: string | null; start_time: string | null }> = {};
          
          fetchedBookings.forEach((booking) => {
            if (booking && booking.id) {
              bookingsMap[booking.id] = { 
                purpose: booking.purpose || null, 
                aircraft_id: booking.aircraft_id || null,
                aircraft_registration: booking.aircraft?.registration || null,
                start_time: booking.start_time || null
              };
            }
          });
          
          setBookings(bookingsMap);
        } else {
          setBookings({});
        }
        
        setBookingsLoaded(true);
      } finally {
        setBookingsLoading(false);
      }
    };
    
    loadBookings();
  }, [selectedTab, memberId, records, bookingsLoaded]);

  // Lazy load exam results when exams tab is selected
  useEffect(() => {
    if (!memberId || selectedTab !== 'exams' || examsLoaded) return;
    
    const loadExamResults = async () => {
      setExamsLoading(true);
      try {
        const [examResultsData] = await Promise.all([
          fetch(`/api/exam_results?user_id=${memberId}`)
            .then(res => res.json())
            .then(data => Array.isArray(data.exam_results) ? data.exam_results : []),
          fetch(`/api/exams`)
            .then(res => res.json())
            .then(data => Array.isArray(data.exams) ? data.exams : []),
        ]);
        
        setExamResults(examResultsData);
        setExamsLoaded(true);
      } catch (error) {
        console.error('Failed to load exam results:', error);
      } finally {
        setExamsLoading(false);
      }
    };
    
    loadExamResults();
  }, [selectedTab, memberId, examsLoaded]);

  // Lazy load flight experiences when flight experience tab is selected
  useEffect(() => {
    if (!memberId || selectedTab !== 'experience' || flightExperiencesLoaded) return;
    
    const loadFlightExperiences = async () => {
      setFlightExperiencesLoading(true);
      try {
        const [experiencesData, experienceTypesData] = await Promise.all([
          fetch(`/api/flight-experience?user_id=${memberId}`)
            .then(res => res.json())
            .then(data => Array.isArray(data.data) ? data.data : []),
          fetch(`/api/experience-types`)
            .then(res => res.json())
            .then(data => Array.isArray(data.experience_types) ? data.experience_types : []),
        ]);
        
        // Create experience types map
        const typesMap: Record<string, { name: string }> = {};
        experienceTypesData.forEach((type: { id: string; name: string }) => {
          typesMap[type.id] = { name: type.name };
        });
        setExperienceTypes(typesMap);
        
        // Get unique booking IDs from flight experiences
        const experienceBookingIds = Array.from(new Set(
          experiencesData
            .filter((exp: FlightExperience) => exp.booking_id)
            .map((exp: FlightExperience) => exp.booking_id)
            .filter(Boolean)
        )) as string[];

        // Fetch bookings for those IDs (reusing the same bookings state)
        if (experienceBookingIds.length > 0) {
          const bookingsPromises = experienceBookingIds.map(id => 
            fetch(`/api/bookings?id=${id}`)
              .then(res => res.ok ? res.json() : null)
              .then(data => data?.booking || null)
              .catch(() => null)
          );
          
          const fetchedBookings = await Promise.all(bookingsPromises);
          const bookingsMap: Record<string, { purpose: string | null; aircraft_id: string | null; aircraft_registration: string | null; start_time: string | null }> = { ...bookings };
          
          fetchedBookings.forEach((booking) => {
            if (booking && booking.id) {
              bookingsMap[booking.id] = { 
                purpose: booking.purpose || null, 
                aircraft_id: booking.aircraft_id || null,
                aircraft_registration: booking.aircraft?.registration || null,
                start_time: booking.start_time || null
              };
            }
          });
          
          setBookings(bookingsMap);
        }
        
        setFlightExperiences(experiencesData);
        setFlightExperiencesLoaded(true);
      } catch (error) {
        console.error('Failed to load flight experiences:', error);
      } finally {
        setFlightExperiencesLoading(false);
      }
    };
    
    loadFlightExperiences();
  }, [selectedTab, memberId, flightExperiencesLoaded, bookings]);

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

  // Handle aircraft type change
  const handleAircraftTypeChange = async (aircraftTypeId: string) => {
    if (!currentEnrollment) return;

    setUpdatingAircraftType(true);
    try {
      const res = await fetch("/api/student_syllabus_enrollment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentEnrollment.id,
          aircraft_type: aircraftTypeId,
        }),
      });

      if (!res.ok) throw new Error("Failed to update aircraft type");

      // Update local state
      setEnrollments(prev => prev.map(e =>
        e.id === currentEnrollment.id
          ? { ...e, aircraft_type: aircraftTypeId }
          : e
      ));

      setEditingAircraftType(false);
      toast.success("Aircraft type updated successfully!");
    } catch {
      toast.error("Failed to update aircraft type");
    } finally {
      setUpdatingAircraftType(false);
    }
  };

  // Handle enrollment creation
  const handleEnrollmentCreated = (newEnrollment: StudentSyllabusEnrollment) => {
    setEnrollments(prev => [...prev, newEnrollment]);

    // Update enrolled syllabi
    const newSyllabus = syllabi.find(s => s.id === newEnrollment.syllabus_id);
    if (newSyllabus) {
      setEnrolledSyllabi(prev => [...prev, newSyllabus]);
    }

    // Set as selected if it's the first enrollment
    if (enrollments.length === 0) {
      setSelectedSyllabusId(newEnrollment.syllabus_id);
    }
  };

  const progressStats = getProgressStats();

  // Get instructor name helper
  const getInstructorName = (instructorId: string | null): string => {
    if (!instructorId) return "Unknown";
    const instructor = instructors[instructorId];
    if (!instructor) return "Unknown";
    return `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.email || "Unknown";
  };

  // Get instructor initials helper
  const getInstructorInitials = (instructorId: string | null): string => {
    if (!instructorId) return "?";
    const instructor = instructors[instructorId];
    if (!instructor) return "?";
    const firstName = instructor.first_name || "";
    const lastName = instructor.last_name || "";
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";
  };

  // Filter lesson progress records that have instructor comments
  const instructorNotes = records
    .filter(record => record.instructor_comments && record.instructor_comments.trim() !== "")
    .sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
    .map(record => {
      const booking = record.booking_id ? bookings[record.booking_id] : null;
      const aircraftReg = booking?.aircraft_registration || "-";
      
      return {
        id: record.id,
        date: record.date || record.created_at,
        instructorId: record.instructor_id,
        instructorName: getInstructorName(record.instructor_id),
        instructorInitials: getInstructorInitials(record.instructor_id),
        comment: record.instructor_comments || "",
        description: booking?.purpose || "-",
        aircraftRegistration: aircraftReg
      };
    });

  // Map flight experiences with booking data
  const mappedFlightExperiences = flightExperiences
    .sort((a: FlightExperience, b: FlightExperience) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((exp: FlightExperience) => {
      const booking = exp.booking_id ? bookings[exp.booking_id] : null;
      const durationFormatted = exp.duration_hours
        ? exp.duration_hours.toFixed(1)
        : "-";
      return {
        id: exp.id,
        experienceType: exp.experience_type_id ? (experienceTypes[exp.experience_type_id]?.name || "Unknown") : "Unknown",
        durationHours: durationFormatted,
        bookingStartTime: booking?.start_time || null,
        aircraftRegistration: booking?.aircraft_registration || "-"
      };
    });

  const tabs = [
    { id: "lessons", label: "Lesson Progress", icon: BookOpen },
    { id: "notes", label: "Instructor Comments", icon: MessageSquare },
    { id: "experience", label: "Flight Experience", icon: Plane },
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
      {/* No Enrollments - Call to Action */}
      {enrolledSyllabi.length === 0 && (
        <Card className="rounded-md">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">No Syllabus Enrollments</h3>
                  <p className="text-xs text-gray-600">
                    Enroll this member to start tracking training progress
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setEnrollModalOpen(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Enroll
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      {selectedSyllabusId && (
        <Card className="rounded-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {enrolledSyllabi.length > 1 ? 'Training Progress' : enrolledSyllabi.find(s => s.id === selectedSyllabusId)?.name}
              </CardTitle>

              <div className="flex items-center gap-3">
                {enrolledSyllabi.length > 1 && (
                  <>
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
                  </>
                )}
                {/* Add enrollment button - show if there are syllabi available for enrollment */}
                {syllabi.filter(s => !enrolledSyllabi.some(es => es.id === s.id)).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEnrollModalOpen(true)}
                    className="h-8 w-8 p-0 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
                    title="Enroll in additional syllabus"
                  >
                    <Plus className="w-4 h-4 text-gray-500 hover:text-indigo-600" />
                  </Button>
                )}
              </div>
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
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">
                        {currentEnrollment?.enrolled_at ?
                          format(new Date(currentEnrollment.enrolled_at), 'MMM d, yyyy') :
                          'Unknown'
                        }
                      </span>
                      {currentEnrollment?.enrolled_at && (
                        <span className="text-xs text-gray-500">
                          {differenceInDays(new Date(), new Date(currentEnrollment.enrolled_at))} days ago
                        </span>
                      )}
                    </div>
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

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Aircraft Type:</span>
                  {editingAircraftType ? (
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue={currentEnrollment?.aircraft_type || ""}
                        onValueChange={handleAircraftTypeChange}
                        disabled={updatingAircraftType}
                      >
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="Select aircraft type" />
                        </SelectTrigger>
                        <SelectContent>
                          {aircraftTypes.map(aircraftType => (
                            <SelectItem key={aircraftType.id} value={aircraftType.id}>
                              {aircraftType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAircraftType(false)}
                        disabled={updatingAircraftType}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">
                        {currentEnrollment?.aircraft_type ?
                          (() => {
                            const aircraftType = aircraftTypes.find(at => at.id === currentEnrollment.aircraft_type);
                            return aircraftType ? aircraftType.name : 'Unknown';
                          })() :
                          'Not assigned'
                        }
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAircraftType(true)}
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

            <Tabs.Content value="notes" className="h-full w-full">
              {selectedTab === "notes" && (
                <Card className="rounded-md border-t-0 rounded-t-none">
                  <CardContent className="p-6">
                    {bookingsLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading instructor comments...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 w-[140px]">Date</th>
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 w-[180px]">Instructor</th>
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 w-[120px]">Aircraft</th>
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 w-[200px]">Description</th>
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700">Comment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {instructorNotes.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-12">
                                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-600 font-medium">No instructor comments yet</p>
                                <p className="text-slate-500 text-sm mt-1">Comments from instructors will appear here</p>
                              </td>
                            </tr>
                          ) : (
                            instructorNotes.map((note) => (
                              <tr key={note.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-900">
                                      {format(new Date(note.date), 'MMM d, yyyy')}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {format(new Date(note.date), 'h:mm a')}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-semibold text-indigo-700">
                                        {note.instructorInitials}
                                      </span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-900">{note.instructorName}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-sm font-medium text-slate-900">{note.aircraftRegistration}</span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-sm text-slate-700">{note.description}</span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div
                                    className="text-sm text-slate-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                      __html: note.comment
                                    }}
                                  />
                                </td>
                              </tr>
                            ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </Tabs.Content>

            <Tabs.Content value="experience" className="h-full w-full">
              {selectedTab === "experience" && (
                <Card className="rounded-md border-t-0 rounded-t-none">
                  <CardContent className="p-6">
                    {flightExperiencesLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading flight experience...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 w-[200px]">Experience Type</th>
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 w-[120px]">Duration (hrs)</th>
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 w-[160px]">Flight Date</th>
                              <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 w-[120px]">Aircraft</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mappedFlightExperiences.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center py-12">
                                  <Plane className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                  <p className="text-slate-600 font-medium">No flight experience yet</p>
                                  <p className="text-slate-500 text-sm mt-1">Flight experience records will appear here</p>
                                </td>
                              </tr>
                            ) : (
                              mappedFlightExperiences.map((exp) => (
                                <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <span className="text-sm font-medium text-slate-900">{exp.experienceType}</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="text-sm text-slate-700">{exp.durationHours}</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {exp.bookingStartTime ? (
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">
                                          {format(new Date(exp.bookingStartTime), 'MMM d, yyyy')}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {format(new Date(exp.bookingStartTime), 'h:mm a')}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-slate-500">-</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="text-sm font-medium text-slate-900">{exp.aircraftRegistration}</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </Tabs.Content>

            <Tabs.Content value="exams" className="h-full w-full">
              {selectedTab === "exams" && (
                examsLoading ? (
                  <Card className="rounded-md border-t-0 rounded-t-none">
                    <CardContent className="p-6">
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading exam history...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <ExamHistoryTab
                    memberId={memberId}
                    syllabi={syllabi}
                    examResults={examResults}
                    setExamResults={setExamResults}
                    examExpanded={examExpanded}
                    setExamExpanded={setExamExpanded}
                  />
                )
              )}
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </div>

      {/* Enrollment Modal */}
      <EnrollMemberModal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        memberId={memberId}
        syllabi={syllabi}
        instructors={allInstructors}
        aircraftTypes={aircraftTypes}
        existingEnrollments={enrollments}
        onEnrollmentCreated={handleEnrollmentCreated}
      />
    </div>
  );
}