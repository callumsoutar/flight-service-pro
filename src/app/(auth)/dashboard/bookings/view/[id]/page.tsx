import BookingDetails from "../BookingDetails";
import BookingResources from "../BookingResources";
import { BookingStages, BOOKING_STAGES, STATUS_TO_STAGE_IDX } from "@/components/bookings/BookingStages";
import { Booking } from "@/types/bookings";
import React from "react";
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from "@/lib/SupabaseServerClient";
import BookingStagesOptions from "@/components/bookings/BookingStagesOptions";
import BookingHistoryCollapse from "../BookingHistoryCollapse";
import { User } from "@/types/users";
import { Aircraft } from "@/types/aircraft";
import { Observation } from "@/types/observations";
import BookingActions from "@/components/bookings/BookingActionsClient";
import BookingConfirmActionClient from "@/components/bookings/BookingConfirmActionClient";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { JoinedInstructor } from "../BookingResources";
import {
  withRoleProtection,
  ProtectedPageProps,
  validateBookingAccess
} from "@/lib/rbac-page-wrapper";

async function BookingViewPage(props: ProtectedPageProps & { params: Promise<{ id: string }> }) {
  const { params, user, userRole, isRestrictedUser } = props;
  const { id: bookingId } = await params;
  const supabase = await createClient();

  let booking: Booking | null = null;
  let member: User | null = null;
  let instructor: JoinedInstructor | null = null;
  let aircraft: Aircraft | null = null;
  let members: { id: string; name: string }[] = [];
  let instructors: { id: string; name: string }[] = [];
  let aircraftList: { id: string; registration: string; type: string }[] = [];
  let lessons: { id: string; name: string }[] = [];
  let flightTypes: { id: string; name: string }[] = [];
  let hasLessonProgress = false;
  let aircraftObservations: Observation[] = [];
  let flightAuthorization = null;
  let requireFlightAuthorization = true;

  // Fetch booking with full user, instructor, aircraft, and flight_type objects
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`*, user:user_id(*), instructor:instructor_id(*, users:users!instructors_user_id_fkey(*)), aircraft:aircraft_id(*), flight_type:flight_type_id(*), lesson_id, authorization_override, authorization_override_by, authorization_override_at, authorization_override_reason`)
    .eq("id", bookingId)
    .single();

  // Fetch instructor comments count and lesson progress in parallel
  const [
    { count: instructorCommentsCount },
    { data: lessonProgressData }
  ] = await Promise.all([
    supabase
      .from("instructor_comments")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .then(result => ({ count: result.count || 0 })),
    supabase
      .from("lesson_progress")
      .select("id")
      .eq("booking_id", bookingId)
      .limit(1)
      .then(result => ({ data: result.data || [] }))
  ]);

  hasLessonProgress = !!(lessonProgressData && lessonProgressData.length > 0);

  booking = bookingData;

  // Redirect if booking not found
  if (!booking) {
    redirect('/dashboard/bookings');
  }

  // Fetch aircraft observations if aircraft exists
  if (booking.aircraft_id) {
    const { data: observationsData, error: observationsError } = await supabase
      .from("observations")
      .select("*")
      .eq("aircraft_id", booking.aircraft_id)
      .in("stage", ["open", "investigation"]);
    
    if (observationsError) {
      console.error('Failed to fetch aircraft observations:', observationsError);
    }
    
    aircraftObservations = observationsData || [];
  }

  // Check if user has permission to view this specific booking
  const canAccessBooking = await validateBookingAccess({
    user,
    userRole,
    bookingUserId: booking.user_id || ''
  });

  if (!canAccessBooking) {
    redirect('/dashboard/bookings');
  }

  // Fetch all members (users) with their roles
  const { data: memberRows } = await supabase
    .from("users")
    .select(`
      id, 
      first_name, 
      last_name,
      user_roles(
        roles(name)
      )
    `);
  members = (memberRows || []).map((user) => ({
    id: user.id,
    name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.id,
  }));

  // Fetch all instructors from the instructors table
  const { data: instructorRows } = await supabase
    .from("instructors")
    .select(`
      id,
      user_id,
      users!instructors_user_id_fkey (
        id,
        first_name,
        last_name,
        email
      )
    `);
  
  instructors = (instructorRows || []).map((instructor) => {
    const user = instructor.users?.[0]; // users is an array, get first element
    let name = instructor.id;
    if (user?.first_name || user?.last_name) {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
      if (fullName) {
        name = fullName;
      } else if (user.email) {
        name = user.email;
      }
    }
    return {
      id: instructor.id, // This is now the instructor ID, not user ID
      name,
    };
  });

  // Fetch all aircraft
  const { data: aircraftRows } = await supabase
    .from("aircraft")
    .select("id, registration, type");
  aircraftList = (aircraftRows || []).map((a: { id: string; registration: string; type: string }) => ({
    id: a.id,
    registration: a.registration,
    type: a.type,
  }));

  // Fetch all lessons ordered by order column
  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("id, name, order")
    .order("order", { ascending: true });
  lessons = (lessonRows || []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }));

  // Fetch all flight types
  const { data: flightTypeRows } = await supabase
    .from("flight_types")
    .select("id, name, instruction_type");
  flightTypes = (flightTypeRows || []).map((f: { id: string; name: string; instruction_type?: string }) => ({ id: f.id, name: f.name, instruction_type: f.instruction_type }));

  // Fetch bookings for conflict checking (filtered by date range for performance)
  // Only fetch bookings within ±7 days of the current booking to reduce payload
  let allBookings: Booking[] = [];
  if (booking?.start_time && booking?.end_time) {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);

    // Calculate date range (7 days before start, 7 days after end)
    const rangeStart = new Date(bookingStart);
    rangeStart.setDate(rangeStart.getDate() - 7);
    const rangeEnd = new Date(bookingEnd);
    rangeEnd.setDate(rangeEnd.getDate() + 7);

    const { data: allBookingsData } = await supabase
      .from("bookings")
      .select("id, aircraft_id, instructor_id, start_time, end_time, status")
      .gte("start_time", rangeStart.toISOString())
      .lte("end_time", rangeEnd.toISOString());

    allBookings = (allBookingsData || []).map(booking => ({
      ...booking,
      // Add required fields with default values for conflict checking
      user_id: null,
      purpose: "",
      remarks: null,
      lesson_id: null,
      flight_type_id: null,
      booking_type: "flight" as const,
      voucher_number: null,
      hobbs_start: null,
      hobbs_end: null,
      tach_start: null,
      tach_end: null,
      created_at: "",
      updated_at: ""
    })) as Booking[];
  }

  // Fetch flight authorization if booking exists
  if (booking?.id) {
    const { data: authData } = await supabase
      .from("flight_authorizations")
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle();

    flightAuthorization = authData;
  }

  // Fetch flight authorization setting
  const { data: settingsData } = await supabase
    .from("settings")
    .select("setting_value")
    .eq("category", "bookings")
    .eq("setting_key", "require_flight_authorization_for_solo")
    .maybeSingle();

  if (settingsData?.setting_value !== undefined) {
    requireFlightAuthorization = Boolean(settingsData.setting_value);
  }

  // Assign member, instructor, and aircraft only if booking is not null
  if (booking) {
    // Use booking.user, booking.instructor, and booking.aircraft if present (from Supabase join), else fallback to lookup and expand to full object
    const fallbackUser = (u: { id: string; name: string } | undefined): User | null =>
      u ? {
        id: u.id,
        first_name: u.name.split(" ")[0] || "",
        last_name: u.name.split(" ").slice(1).join(" ") || "",
        email: "",
        is_active: true,
        public_directory_opt_in: false,
        created_at: "",
        updated_at: ""
      } : null;
    const fallbackAircraft = (a: { id: string; registration: string; type: string } | undefined): Aircraft | null =>
      a ? {
        id: a.id,
        registration: a.registration,
        type: a.type,
        total_hours: 0,
        updated_at: "",
        current_tach: 0,
        current_hobbs: 0,
        manufacturer: null,
        year_manufactured: null,
        status: "active",
        capacity: null,
        for_ato: false,
        fuel_consumption: null,
        prioritise_scheduling: false,
        record_tacho: false,
        record_hobbs: false,
        record_airswitch: false,
        on_line: true,
        aircraft_image_url: null
      } : null;
    member = booking.user ?? fallbackUser(members.find((m) => m.id === booking.user_id));
    instructor =
      booking.instructor &&
      typeof booking.instructor === "object" &&
      "users" in booking.instructor &&
      "user_id" in booking.instructor
        ? (booking.instructor as JoinedInstructor)
        : null;
    aircraft = booking.aircraft ?? fallbackAircraft(aircraftList.find((a) => a.id === booking.aircraft_id));
  }

  const status = booking?.status ?? "unconfirmed";
  const currentStage = STATUS_TO_STAGE_IDX[status] ?? 0;

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Simplified Booking Header */}
        <header className="flex flex-col gap-6">
          {/* Top row: Member info and actions */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left: Member name and status */}
            <div className="flex-1 min-w-0">
              {booking && booking.user_id && (
                <div className="flex flex-wrap items-center gap-3">
                  {(() => {
                    const memberName = [booking.user?.first_name || member?.first_name, booking.user?.last_name || member?.last_name].filter(Boolean).join(" ") || booking.user_id;
                    const isPrivileged = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

                    return isPrivileged ? (
                      <Link
                        href={`/dashboard/members/view/${booking.user_id}`}
                        className="text-3xl font-bold text-gray-900 hover:text-[#6564db] transition-colors"
                      >
                        {memberName}
                      </Link>
                    ) : (
                      <h1 className="text-3xl font-bold text-gray-900">
                        {memberName}
                      </h1>
                    );
                  })()}
                  <StatusBadge status={status} className="text-sm px-3 py-1" />
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {booking && booking.id && !isRestrictedUser && (
                <BookingConfirmActionClient bookingId={booking.id} status={booking.status} />
              )}
              {booking && booking.id && (
                <BookingActions
                  booking={booking}
                  status={status}
                  bookingId={booking.id}
                  currentUserId={user.id}
                  flightAuthorization={flightAuthorization}
                  requireFlightAuthorization={requireFlightAuthorization}
                  isRestrictedUser={isRestrictedUser}
                />
              )}
              {booking && booking.id && (
                <BookingStagesOptions
                  bookingId={booking.id}
                  bookingStatus={booking.status}
                  instructorCommentsCount={instructorCommentsCount || 0}
                  hasLessonProgress={hasLessonProgress}
                />
              )}
            </div>
          </div>

          {/* Booking Stages - Only show for non-restricted users */}
          {!isRestrictedUser && (
            <div className="pt-4 border-t border-gray-200">
              <BookingStages stages={BOOKING_STAGES} currentStage={currentStage} />
            </div>
          )}
        </header>

        
        {/* Main content row: 2/3 and 1/3 split using flex */}
        <div className="flex flex-row w-full max-w-6xl mx-auto gap-4">
          <div className="flex-[2]">
            {booking ? (
              <BookingDetails
                booking={booking}
                members={members}
                instructors={instructors}
                aircraft={aircraftList}
                lessons={lessons}
                flightTypes={flightTypes}
                bookings={allBookings}
                isRestrictedUser={isRestrictedUser}
              />
            ) : (
              <div className="p-8 text-center text-muted-foreground">Booking not found.</div>
            )}
          </div>
          <div className="flex-[1]">
            <BookingResources
              member={member}
              instructor={instructor}
              aircraft={aircraft}
              bookingStatus={status}
              aircraftObservations={aircraftObservations}
              isRestrictedUser={isRestrictedUser}
            />
          </div>
        </div>
      </div>
      {/* Booking History Collapsible - Only show for non-restricted users */}
      {!isRestrictedUser && (
        <BookingHistoryCollapse bookingId={bookingId || ""} lessons={lessons} />
      )}
    </div>
  );
}

// Export the protected component with custom validation
export default withRoleProtection(BookingViewPage, {
  allowedRoles: ['student', 'member', 'instructor', 'admin', 'owner'],
  fallbackUrl: '/dashboard/bookings',
  // Note: The booking-specific access validation is handled inside the component
  // after fetching the booking data, since we need the booking's user_id
}); 