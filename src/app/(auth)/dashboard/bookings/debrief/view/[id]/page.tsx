import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Mail, Eye, User, Printer, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/SupabaseServerClient";
import { MessageCircle, ListChecks, ArrowRightCircle, UserCircle2, ClipboardList, Plane, Star, Navigation, TrendingUp, Target, Cloud, Shield, Clock } from "lucide-react";
import React from "react";
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
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps, validateBookingAccess } from "@/lib/rbac-page-wrapper";
import { redirect } from 'next/navigation';

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

interface DebriefViewPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function DebriefViewPage({ params, user, userRole }: DebriefViewPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  let booking: BookingWithJoins | null = null;
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`
      *,
      user:user_id(*),
      instructor:instructor_id(*),
      lesson:lesson_id(*),
      flight_logs(
        *,
        checked_out_aircraft:checked_out_aircraft_id(*)
      )
    `)
    .eq("id", bookingId)
    .single();
  booking = bookingData;

  if (!booking) {
    redirect('/dashboard/bookings');
  }

  // Check if user has permission to view this booking
  // Students and members can only view their own bookings, instructors/admins/owners can view all
  const hasAccess = await validateBookingAccess({
    user,
    userRole,
    bookingUserId: booking.user_id || ''
  });

  if (!hasAccess) {
    redirect('/dashboard/bookings');
  }

  // Fetch lesson_progress for this booking with instructor details
  let lessonProgress: LessonProgressWithInstructor | null = null;
  let lesson: Lesson | null = null;
  let flightExperiences: FlightExperience[] = [];
  let experienceTypes: ExperienceType[] = [];
  
  if (booking?.id) {
    const { data: lpData } = await supabase
      .from("lesson_progress")
      .select(`
        *,
        instructor:instructor_id(
          id,
          user:user_id(
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
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
    
    // Fetch flight experiences if lesson progress exists
    if (lessonProgress?.id) {
      const { data: feData } = await supabase
        .from("flight_experience")
        .select("*")
        .eq("lesson_progress_id", lessonProgress.id)
        .order("created_at", { ascending: true });
      flightExperiences = feData || [];
    }
    
    // Fetch experience types
    const { data: etData } = await supabase
      .from("experience_types")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    experienceTypes = etData || [];
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        {/* Top bar with options dropdown */}
        <div className="flex justify-end mb-4 print:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-6 text-base font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-gray-300"
              >
                Options
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-sm py-2">
                <Mail className="w-4 h-4 mr-2" /> Send Email
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm py-2">
                <Printer className="w-4 h-4 mr-2" /> Print
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm py-2">
                <Eye className="w-4 h-4 mr-2" /> View Booking
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm py-2">
                <User className="w-4 h-4 mr-2" /> View Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Header Section - Enhanced */}
        <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
          <div className="flex flex-col gap-6">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Plane className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Flight Debrief Report</h1>
              </div>
              <div className="flex items-center gap-3 print:hidden">
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
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Instructor Comments</h2>
            </div>
            <div className="text-base text-gray-800 min-h-[60px]">
              <LessonProgressComments comments={lessonProgress?.instructor_comments} />
            </div>
          </div>

          {/* Lesson Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
              <ListChecks className="w-5 h-5 text-violet-600" />
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
              <ArrowRightCircle className="w-5 h-5 text-indigo-600" />
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

// Export protected component with booking access validation
/* eslint-disable @typescript-eslint/no-explicit-any */
export default withRoleProtection(DebriefViewPage as any, {
  ...ROLE_CONFIGS.AUTHENTICATED_ONLY,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  customValidation: async ({ user: _user, userRole: _userRole, context: _context }) => {
    // Additional validation is handled within the component
    // since we need to fetch the booking first to get the user_id
    return true;
  }
}) as any; 