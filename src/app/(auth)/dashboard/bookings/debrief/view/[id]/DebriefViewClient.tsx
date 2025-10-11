'use client';

import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Mail, Eye, User, Printer, ChevronDown, ChevronLeft, Download, Loader2 } from "lucide-react";
import { MessageCircle, ListChecks, ArrowRightCircle, UserCircle2, ClipboardList, Plane, Star, Navigation, TrendingUp, Target, Cloud, Shield, Clock } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Booking } from "@/types/bookings";
import type { User as UserType } from "@/types/users";
import type { Aircraft } from "@/types/aircraft";
import type { Lesson } from "@/types/lessons";
import type { LessonProgress } from "@/types/lesson_progress";
import LessonProgressComments from "../LessonProgressComments";
import { format, parseISO } from "date-fns";
import FlightExperienceDisplay from "@/components/debrief/FlightExperienceDisplay";
import type { FlightExperience } from "@/types/flight_experience";
import type { ExperienceType } from "@/types/experience_types";

// Define a type for the joined booking object
interface BookingWithJoins extends Booking {
  user?: UserType;
  instructor?: UserType;
  lesson?: Lesson;
  aircraft?: Aircraft;
}

// Define a type for lesson progress with instructor join
interface LessonProgressWithInstructor extends LessonProgress {
  instructor?: {
    id: string;
    user?: {
      id: string;
      first_name?: string;
      last_name?: string;
      email?: string;
    };
  };
}

interface DebriefViewClientProps {
  booking: BookingWithJoins;
  lessonProgress: LessonProgressWithInstructor | null;
  lesson: Lesson | null;
  flightExperiences: FlightExperience[];
  experienceTypes: ExperienceType[];
}

export default function DebriefViewClient({
  booking,
  lessonProgress,
  lesson,
  flightExperiences,
  experienceTypes,
}: DebriefViewClientProps) {
  const router = useRouter();
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleSendEmail = async () => {
    if (!booking.user?.email) {
      toast.error("Student has no email address");
      return;
    }

    setIsEmailLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/send-debrief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Debrief report sent to ${booking.user.email}`);
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error("Failed to send email");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/debrief-pdf`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create a blob URL
      const url = window.URL.createObjectURL(blob);

      // Open PDF in a new window
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        // Wait for PDF to load, then trigger print dialog
        printWindow.onload = () => {
          printWindow.print();
          // Cleanup the blob URL after a delay to ensure print dialog has opened
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 100);
        };
      } else {
        // Fallback if popup was blocked
        window.URL.revokeObjectURL(url);
        toast.error('Please allow popups to print the debrief');
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to print PDF');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleViewBooking = () => {
    window.open(`/dashboard/bookings/view/${booking.id}`, '_blank');
  };

  const handleViewMember = () => {
    if (booking.user?.id) {
      window.open(`/dashboard/members/view/${booking.user.id}`, '_blank');
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/debrief-pdf`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename
      const studentName = booking.user?.first_name && booking.user?.last_name
        ? `${booking.user.first_name}-${booking.user.last_name}`
        : 'Student';
      const date = lessonProgress?.date
        ? new Date(lessonProgress.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      a.download = `Debrief-${studentName}-${date}.pdf`;

      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Debrief PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        {/* Page Header with Actions */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 px-4 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2">
                Options
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={handleSendEmail}
                  disabled={isEmailLoading}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isEmailLoading ? 'Sending...' : 'Send Email'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint} disabled={isPrinting}>
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  {isPrinting ? 'Generating PDF...' : 'Print'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleViewBooking}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Booking
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewMember}>
                  <User className="w-4 h-4 mr-2" />
                  View Member
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Header Section - Enhanced */}
        <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
          <div className="flex flex-col gap-6">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <Plane className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Flight Debrief Report</h1>
            </div>

            {/* Student and Instructor Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <UserCircle2 className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">
                    {booking.user?.first_name} {booking.user?.last_name}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Student Pilot</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <UserCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <div className="font-semibold text-gray-900">
                    {lessonProgress?.instructor?.user ?
                      `${lessonProgress.instructor.user.first_name ?? ''} ${lessonProgress.instructor.user.last_name ?? ''}`.trim() || lessonProgress.instructor.user.email :
                      'Not assigned'
                    }
                  </div>
                  <div className="text-sm text-green-600 font-medium">Flight Instructor</div>
                </div>
              </div>
            </div>

            {/* Flight Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Date</div>
                <div className="font-semibold text-gray-900">
                  {lessonProgress?.date ? format(parseISO(lessonProgress.date), "d MMM yyyy") : '—'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Aircraft</div>
                <div className="font-semibold text-gray-900">
                  {booking.flight_logs?.[0]?.checked_out_aircraft ? booking.flight_logs[0].checked_out_aircraft.registration : '—'}
                </div>
                {booking.flight_logs?.[0]?.checked_out_aircraft?.type && (
                  <div className="text-xs text-gray-500">{booking.flight_logs[0].checked_out_aircraft.type}</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Flight Time</div>
                <div className="font-semibold text-gray-900">
                  {booking.flight_logs?.[0]?.flight_time != null ? `${booking.flight_logs[0].flight_time}h` : '—'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Lesson</div>
                <div className="font-semibold text-gray-900 text-sm">
                  {lesson?.name || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="flex flex-col gap-6">
          {/* Instructor Comments */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Instructor Comments</h2>
              </div>
              {lessonProgress?.status && (
                <Badge
                  className={
                    lessonProgress.status === 'pass'
                      ? 'bg-green-600 text-white text-sm px-3 py-1.5 font-semibold'
                      : lessonProgress.status === 'not yet competent'
                      ? 'bg-red-600 text-white text-sm px-3 py-1.5 font-semibold'
                      : 'bg-yellow-500 text-white text-sm px-3 py-1.5 font-semibold'
                  }
                >
                  {lessonProgress.status.charAt(0).toUpperCase() + lessonProgress.status.slice(1)}
                </Badge>
              )}
            </div>
            <div className="text-base text-gray-800 min-h-[60px]">
              <LessonProgressComments comments={lessonProgress?.instructor_comments} />
            </div>
          </div>

          {/* Lesson Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
              <ListChecks className="w-5 h-5 text-[#6564db]" />
              <h2 className="text-xl font-bold text-gray-900">Lesson Assessment</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Lesson Highlights */}
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Lesson Highlights
                </h3>
                <div className="text-base text-gray-900 whitespace-pre-line leading-relaxed">
                  {lessonProgress?.lesson_highlights || 'No highlights recorded.'}
                </div>
              </div>

              {/* General Airmanship */}
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  General Airmanship
                </h3>
                <div className="text-base text-gray-900 whitespace-pre-line leading-relaxed">
                  {lessonProgress?.airmanship || 'No airmanship notes recorded.'}
                </div>
              </div>

              {/* Student Strengths */}
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Student Strengths
                </h3>
                <div className="text-base text-gray-900 whitespace-pre-line leading-relaxed">
                  {lessonProgress?.focus_next_lesson || 'No strengths recorded.'}
                </div>
              </div>

              {/* Areas for Improvement */}
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Areas for Improvement
                </h3>
                <div className="text-base text-gray-900 whitespace-pre-line leading-relaxed">
                  {lessonProgress?.areas_for_improvement || 'No areas for improvement recorded.'}
                </div>
              </div>
            </div>
          </div>

          {/* Flight Details */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
              <ClipboardList className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Flight Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  Weather Conditions
                </h3>
                <div className="text-base text-gray-900 whitespace-pre-line leading-relaxed">
                  {lessonProgress?.weather_conditions || 'No weather conditions recorded.'}
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Safety Observations
                </h3>
                <div className="text-base text-gray-900 whitespace-pre-line leading-relaxed">
                  {lessonProgress?.safety_concerns || 'No safety observations recorded.'}
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <ArrowRightCircle className="w-5 h-5 text-[#6564db]" />
              <h2 className="text-xl font-bold text-gray-900">Next Steps</h2>
            </div>
            <div className="text-base text-gray-900 whitespace-pre-line leading-relaxed">
              {lessonProgress?.focus_next_lesson || 'No next steps recorded.'}
            </div>
          </div>

          {/* Flight Experience Section */}
          {lessonProgress && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <Clock className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Flight Experience</h2>
              </div>
              <FlightExperienceDisplay
                flightExperiences={flightExperiences}
                experienceTypes={experienceTypes}
              />
            </div>
          )}
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Generated on {format(new Date(), "d MMMM yyyy 'at' HH:mm")}</p>
          <p className="mt-1">Flight Desk Pro - Flight Training Management System</p>
        </div>
      </div>
    </div>
  );
}