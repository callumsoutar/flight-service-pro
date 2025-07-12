import { BookingStages, BOOKING_STAGES } from "@/components/bookings/BookingStages";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/SupabaseServerClient";
import { cookies } from "next/headers";
import { CheckCircle, MessageCircle, ListChecks, ArrowRightCircle, UserCircle2, ClipboardList } from "lucide-react";
import React from "react";
import type { LessonProgress } from "@/types/lesson_progress";
import type { Lesson } from "@/types/lessons";
import LessonProgressComments from "../LessonProgressComments";

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as any)?.then === "function";
}

// Utility to strip HTML tags for SSR-safe rendering
function htmlToPlainText(html: string): string {
  if (!html) return "";
  // Simple regex to remove tags (not perfect, but safe for display)
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function DebriefViewPage({ params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  let resolvedParams: { id: string };
  if (isPromise(params)) {
    resolvedParams = await params;
  } else {
    resolvedParams = params;
  }
  const bookingId = resolvedParams.id;
  const supabase = await createClient();
  const cookiesList = await cookies();
  const orgId = cookiesList.get("current_org_id")?.value;

  let booking: any = null;
  if (orgId) {
    const { data: bookingData } = await supabase
      .from("bookings")
      .select(`*, user:user_id(*), lesson:lesson_id(*), aircraft:checked_out_aircraft_id(*)`)
      .eq("organization_id", orgId)
      .eq("id", bookingId)
      .single();
    booking = bookingData;
  }

  if (!booking || !booking.user) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-xl w-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Debrief not found</h2>
          <p className="text-muted-foreground">We couldn&apos;t find the debrief record. Please check the link or contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  const status = booking.status ?? "unconfirmed";
  const debriefStageIdx = BOOKING_STAGES.findIndex(s => s.key === 'debrief');
  const currentStage = debriefStageIdx >= 0 ? debriefStageIdx : BOOKING_STAGES.length - 1;

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
            <div className="flex items-center gap-2 mt-1">
              <UserCircle2 className="w-6 h-6 text-gray-500" />
              <span className="font-semibold text-lg">{booking.user.first_name} {booking.user.last_name}</span>
              <span className="text-xs text-muted-foreground ml-2">Student Pilot</span>
            </div>
          </div>
          <Badge className="{STATUS_BADGE[status]?.color || ''} text-lg px-4 py-2 font-semibold">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
        </div>
        <BookingStages stages={BOOKING_STAGES} currentStage={currentStage} />
        <div className="flex flex-row gap-8">
          {/* Left Column */}
          <div className="flex-[2] flex flex-col gap-6 min-w-0">
            {/* Lesson Assessment */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-row items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-1" />
                <span className="text-lg font-bold">Lesson Assessment</span>
              </div>
              <div className="flex gap-4 items-center mt-2">
                <span className="text-sm font-medium text-gray-700">Lesson Status:</span>
                <span className="inline-block bg-gray-100 text-gray-800 font-semibold px-3 py-1 rounded">
                  {lessonProgress?.status || <span className="text-muted-foreground">-</span>}
                </span>
                {lesson && (
                  <span className="inline-block bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded ml-2">
                    {lesson.name}
                  </span>
                )}
              </div>
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
          {/* Right Column */}
          <div className="flex-[1] flex flex-col gap-6 min-w-0">
            {/* Flight Summary */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-row items-center gap-2 mb-2">
                <UserCircle2 className="w-5 h-5 text-gray-500 mr-1" />
                <span className="text-lg font-bold">Flight Summary</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-semibold">{booking.user.first_name} {booking.user.last_name}</div>
                <div className="text-xs text-muted-foreground">Student Pilot</div>
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">Aircraft</span>
                  <div className="font-medium">{booking.aircraft ? `${booking.aircraft.registration} (${booking.aircraft.type || "Unknown"})` : <span className="text-muted-foreground">-</span>}</div>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <div className="font-medium">{booking.flight_time != null ? `${booking.flight_time} hours` : <span className="text-muted-foreground">-</span>}</div>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">Lesson</span>
                  <div className="font-medium">{booking.lesson ? booking.lesson.name : <span className="text-muted-foreground">-</span>}</div>
                </div>
              </div>
            </div>
            {/* Flight Details */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-row items-center gap-2 mb-2">
                <ClipboardList className="w-5 h-5 text-gray-700 mr-1" />
                <span className="text-lg font-bold">Flight Details</span>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Flight Hours Logged</span>
                  <div className="text-base text-gray-800">{booking.flight_hours_logged != null ? booking.flight_hours_logged : <span className="text-muted-foreground">-</span>}</div>
                </div>
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
        </div>
      </div>
    </div>
  );
} 