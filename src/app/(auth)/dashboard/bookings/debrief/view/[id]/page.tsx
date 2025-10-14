import { createClient } from "@/lib/SupabaseServerClient";
import React from "react";
import type { Booking } from "@/types/bookings";
import type { User as UserType } from "@/types/users";
import type { Aircraft } from "@/types/aircraft";
import type { Lesson } from "@/types/lessons";
import type { LessonProgress } from "@/types/lesson_progress";
import type { FlightExperience } from "@/types/flight_experience";
import type { ExperienceType } from "@/types/experience_types";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps, validateBookingAccess } from "@/lib/rbac-page-wrapper";
import { redirect } from 'next/navigation';
import DebriefViewClient from './DebriefViewClient';

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
    <DebriefViewClient
      booking={booking}
      lessonProgress={lessonProgress}
      lesson={lesson}
      flightExperiences={flightExperiences}
      experienceTypes={experienceTypes}
    />
  );
}

// Export protected component with booking access validation
export default withRoleProtection(DebriefViewPage, {
  ...ROLE_CONFIGS.AUTHENTICATED_ONLY,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  customValidation: async ({ user: _user, userRole: _userRole, context: _context }) => {
    // Additional validation is handled within the component
    // since we need to fetch the booking first to get the user_id
    return true;
  }
});