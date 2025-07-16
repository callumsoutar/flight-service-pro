import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Mail, Eye, User, Printer, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/SupabaseServerClient";
import { cookies } from "next/headers";
import { CheckCircle, MessageCircle, ListChecks, ArrowRightCircle, UserCircle2, ClipboardList } from "lucide-react";
import React from "react";
import type { LessonProgress } from "@/types/lesson_progress";
import type { Booking } from "@/types/bookings";
import type { User as UserType } from "@/types/users";
import type { Aircraft } from "@/types/aircraft";
import type { Lesson } from "@/types/lessons";
import LessonProgressComments from "../LessonProgressComments";
import { format, parseISO } from "date-fns";

// Define a type for the joined booking object
interface BookingWithJoins extends Booking {
  user?: UserType;
  instructor?: UserType;
  lesson?: Lesson;
  aircraft?: Aircraft;
}

export default async function DebriefViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;
  const supabase = await createClient();
  const cookiesList = await cookies();
  const orgId = cookiesList.get("current_org_id")?.value;

  let booking: BookingWithJoins | null = null;
  if (orgId) {
    const { data: bookingData } = await supabase
      .from("bookings")
      .select(`*, user:user_id(*), instructor:instructor_id(*), lesson:lesson_id(*), aircraft:checked_out_aircraft_id(*)`)
      .eq("organization_id", orgId)
      .eq("id", bookingId)
      .single();
    booking = bookingData;
  }

  if (!booking) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-xl w-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Debrief not found</h2>
          <p className="text-muted-foreground">We couldn&apos;t find the debrief record. Please check the link or contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  // Fetch lesson_progress for this booking
  let lessonProgress: LessonProgress | null = null;
  let lesson: Lesson | null = null;
  if (booking?.id) {
    const { data: lpData } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    lessonProgress = lpData;
    // Fetch lesson details if lesson_id exists
    if (lessonProgress?.lesson_id) {
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonProgress.lesson_id)
        .single();
      lesson = lessonData;
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gray-50">
      <div className="w-full max-w-5xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and student info */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[2.5rem] font-extrabold tracking-tight text-gray-900 leading-tight">Flight Debrief</h1>
          </div>
          <div className="flex flex-row items-center gap-3">
            {lessonProgress?.status && (
              <Badge
                className={
                  lessonProgress.status === 'pass'
                    ? 'bg-green-600 text-white text-lg px-4 py-2 font-semibold'
                    : lessonProgress.status === 'needs improvement' || lessonProgress.status === 'fail'
                    ? 'bg-red-600 text-white text-lg px-4 py-2 font-semibold'
                    : 'bg-yellow-500 text-white text-lg px-4 py-2 font-semibold'
                }
              >
                {lessonProgress.status.charAt(0).toUpperCase() + lessonProgress.status.slice(1)}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="ml-1 font-semibold text-base px-4 py-2 rounded-lg flex items-center gap-2 h-[40px]"
                >
                  Options
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-base py-3">
                  <Mail className="w-4 h-4 mr-2" /> Send Email
                </DropdownMenuItem>
                <DropdownMenuItem className="text-base py-3">
                  <Printer className="w-4 h-4 mr-2" /> Print
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-base py-3">
                  <Eye className="w-4 h-4 mr-2" /> View Booking
                </DropdownMenuItem>
                <DropdownMenuItem className="text-base py-3">
                  <User className="w-4 h-4 mr-2" /> View Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-row gap-8">
          {/* Left Column */}
          <div className="flex-[2] flex flex-col gap-6 min-w-0">
            {/* Lesson Assessment */}
            <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-1" />
                <span className="text-lg font-bold">Lesson Assessment</span>
              </div>
              <div className="flex flex-row items-center gap-3 mb-3 flex-wrap bg-gray-50 rounded-lg px-3 py-2">
                <UserCircle2 className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-base">{booking.user?.first_name} {booking.user?.last_name}</span>
                <span className="text-xs text-muted-foreground ml-1">Student Pilot</span>
                <span className="text-gray-300 mx-2">|</span>
                <span className="font-semibold text-base">{booking.instructor ? `${booking.instructor.first_name ?? ''} ${booking.instructor.last_name ?? ''}`.trim() : '—'}</span>
                <span className="text-xs text-muted-foreground ml-1">Instructor</span>
              </div>
              <hr className="my-4 border-gray-200" />
              <div className="flex flex-row items-center gap-8 mb-4 flex-wrap">
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Date:</span> {lessonProgress?.date ? format(parseISO(lessonProgress.date), "d MMMM yyyy") : <span className="text-muted-foreground">-</span>}
                </span>
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Aircraft:</span> {booking.aircraft ? `${booking.aircraft.registration}${booking.aircraft.type ? ` (${booking.aircraft.type})` : ''}` : <span className="text-muted-foreground">-</span>}
                </span>
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Flight Time:</span> {booking.flight_time != null ? `${booking.flight_time} hours` : <span className="text-muted-foreground">-</span>}
                </span>
              </div>
              {lesson && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-700 font-medium">Lesson:</span>
                  <span className="text-base text-gray-900 font-semibold">{lesson.name}</span>
                </div>
              )}
            </div>
            {/* Instructor Comments */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-row items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5 text-blue-600 mr-1" />
                <span className="text-lg font-bold">Instructor Comments</span>
              </div>
              <div className="text-base text-gray-800 min-h-[60px]">
                <LessonProgressComments comments={lessonProgress?.comments} />
              </div>
            </div>
            {/* Lesson Breakdown */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-row items-center gap-2 mb-4">
                <ListChecks className="w-5 h-5 text-violet-600 mr-1" />
                <span className="text-xl font-bold">Lesson Breakdown</span>
              </div>
              <div className="flex flex-col gap-6">
                {/* Lesson Highlights */}
                <div>
                  <h4 className="text-base font-semibold text-gray-700 mb-1 tracking-tight">Lesson Highlights</h4>
                  <div className="text-base text-gray-900 whitespace-pre-line min-h-[32px]">{lessonProgress?.lesson_highlights || <span className="text-muted-foreground">-</span>}</div>
                </div>
                <hr className="my-2 border-gray-200" />
                {/* General Airmanship */}
                <div>
                  <h4 className="text-base font-semibold text-gray-700 mb-1 tracking-tight">General Airmanship</h4>
                  <div className="text-base text-gray-900 whitespace-pre-line min-h-[32px]">{lessonProgress?.airmanship || <span className="text-muted-foreground">-</span>}</div>
                </div>
                <hr className="my-2 border-gray-200" />
                {/* Student Strengths & Areas for Improvement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-base font-semibold text-gray-700 mb-1 tracking-tight">Student Strengths</h4>
                    <div className="text-base text-gray-900 whitespace-pre-line min-h-[32px]">{lessonProgress?.focus_next_lesson || <span className="text-muted-foreground">-</span>}</div>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-700 mb-1 tracking-tight">Areas for Improvement</h4>
                    <div className="text-base text-gray-900 whitespace-pre-line min-h-[32px]">{lessonProgress?.areas_for_improvement || <span className="text-muted-foreground">-</span>}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Flight Details (moved here, same width as Lesson Breakdown) */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-row items-center gap-2 mb-2">
                <ClipboardList className="w-5 h-5 text-gray-700 mr-1" />
                <span className="text-lg font-bold">Flight Details</span>
              </div>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Weather Conditions</span>
                    <div className="text-base text-gray-800 whitespace-pre-line min-h-[32px]">{lessonProgress?.weather_conditions || <span className="text-muted-foreground">-</span>}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Safety Observations</span>
                    <div className="text-base text-gray-800 whitespace-pre-line min-h-[32px]">{lessonProgress?.safety_concerns || <span className="text-muted-foreground">-</span>}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Next Steps */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-row items-center gap-2 mb-2">
                <ArrowRightCircle className="w-5 h-5 text-indigo-600 mr-1" />
                <span className="text-lg font-bold">Next Steps</span>
              </div>
              <div className="text-base text-gray-800 whitespace-pre-line min-h-[40px]">
                {lessonProgress?.focus_next_lesson || <span className="text-muted-foreground">-</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 