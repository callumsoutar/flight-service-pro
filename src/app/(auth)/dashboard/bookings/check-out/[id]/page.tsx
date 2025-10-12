import { BookingStages, BOOKING_STAGES } from "@/components/bookings/BookingStages";
import BookingActions from "@/components/bookings/BookingActionsClient";
import { Booking } from "@/types/bookings";
import React from "react";
import { redirect } from 'next/navigation';
import { createClient } from "@/lib/SupabaseServerClient";
import BookingHistoryCollapse from "../../view/BookingHistoryCollapse";
import CheckOutForm from "@/components/bookings/CheckOutForm";
import { FlightLog } from "@/types/flight_logs";
import BookingStagesOptions from "@/components/bookings/BookingStagesOptions";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import {
  withRoleProtection,
  ROLE_CONFIGS,
  ProtectedPageProps,
  validateBookingAccess
} from "@/lib/rbac-page-wrapper";
import { AircraftComponent } from "@/types/aircraft_components";

interface BookingCheckOutPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function BookingCheckOutPage(props: BookingCheckOutPageProps) {
  const { params, user, userRole } = props;
  const { id: bookingId } = await params;
  const supabase = await createClient();

  let booking: Booking | null = null;
  let members: { id: string; name: string }[] = [];
  let instructors: { id: string; name: string }[] = [];
  let aircraftList: { id: string; registration: string; type: string }[] = [];
  let lessons: { id: string; name: string }[] = [];
  let flightTypes: { id: string; name: string }[] = [];
  let flightLog: FlightLog | null = null;
  let aircraftComponents: AircraftComponent[] = [];
  let currentAircraftHours: number | null = null;
  let flightAuthorization = null;
  let requireFlightAuthorization = true;
  let hasLessonProgress = false;
  let selectedAircraftMeters: { current_hobbs: number | null; current_tach: number | null; fuel_consumption: number | null } | null = null;
  let canOverrideAuthorization = false;
  let instructorCompliance: { instructor_check_due_date: string | null; class_1_medical_due_date: string | null } | null = null;
  let userCompliance: { class_1_medical_due: string | null; class_2_medical_due: string | null; DL9_due: string | null; BFR_due: string | null; pilot_license_expiry: string | null } | null = null;

  // Fetch booking first to get the booking user_id for access validation
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`*, user:user_id(*), instructor:instructor_id(*, users:users!instructors_user_id_fkey(*)), aircraft:aircraft_id(*), flight_type:flight_type_id(*), lesson_id, authorization_override, authorization_override_by, authorization_override_at, authorization_override_reason`)
    .eq("id", bookingId)
    .single();

  booking = bookingData;

  // Redirect if booking not found
  if (!booking) {
    redirect('/dashboard/bookings');
  }

  // Check if user has permission to access this specific booking
  const canAccessBooking = await validateBookingAccess({
    user,
    userRole,
    bookingUserId: booking.user_id || ''
  });

  if (!canAccessBooking) {
    redirect('/dashboard/bookings');
  }

  // Check if current user can override authorization
  const { data: userRolesData } = await supabase
    .from('user_roles')
    .select('roles!user_roles_role_id_fkey(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = userRolesData?.some((ur: any) =>
    ur.roles?.name === 'admin' || ur.roles?.name === 'owner'
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isInstructorRole = userRolesData?.some((ur: any) =>
    ur.roles?.name === 'instructor'
  );

  const { data: instructorRecord } = await supabase
    .from('instructors')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  canOverrideAuthorization = !!(isAdmin || isInstructorRole || instructorRecord);

  // Parallel fetch all required data for optimal performance
  const [
    { count: instructorCommentsCount },
    { data: lessonProgressData },
    { data: memberRows },
    { data: instructorRows },
    { data: aircraftRows },
    { data: lessonRows },
    { data: flightTypeRows },
    { data: flightLogData },
    { data: authData },
    { data: settingsData }
  ] = await Promise.all([
    // Instructor comments count
    supabase
      .from("instructor_comments")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .then(result => ({ count: result.count || 0 })),

    // Lesson progress check
    supabase
      .from("lesson_progress")
      .select("id")
      .eq("booking_id", bookingId)
      .limit(1)
      .then(result => ({ data: result.data || [] })),

    // All members
    supabase
      .from("users")
      .select("id, first_name, last_name")
      .then(result => ({ data: result.data || [] })),

    // All instructors with proper join structure
    supabase
      .from("instructors")
      .select(`
        id,
        user_id,
        users:users!instructors_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .then(result => ({ data: result.data || [] })),

    // All aircraft
    supabase
      .from("aircraft")
      .select("id, registration, type")
      .then(result => ({ data: result.data || [] })),

    // All lessons
    supabase
      .from("lessons")
      .select("id, name, order")
      .order("order", { ascending: true })
      .then(result => ({ data: result.data || [] })),

    // All flight types
    supabase
      .from("flight_types")
      .select("id, name")
      .then(result => ({ data: result.data || [] })),

    // Flight log with proper instructor join
    supabase
      .from("flight_logs")
      .select(`
        *,
        checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
        checked_out_instructor:checked_out_instructor_id(
          *,
          users:users!instructors_user_id_fkey(id, first_name, last_name, email)
        )
      `)
      .eq("booking_id", bookingId)
      .maybeSingle()
      .then(result => ({ data: result.data || null })),

    // Flight authorization
    supabase
      .from("flight_authorizations")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle()
      .then(result => ({ data: result.data || null })),

    // Flight authorization setting
    supabase
      .from("settings")
      .select("setting_value")
      .eq("category", "bookings")
      .eq("setting_key", "require_flight_authorization_for_solo")
      .maybeSingle()
      .then(result => ({ data: result.data || null }))
  ]);

  // Process fetched data
  hasLessonProgress = !!(lessonProgressData && lessonProgressData.length > 0);
  flightAuthorization = authData;

  if (settingsData?.setting_value !== undefined) {
    requireFlightAuthorization = Boolean(settingsData.setting_value);
  }

  flightLog = flightLogData;

  members = (memberRows || []).map((user) => ({
    id: user.id,
    name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.id,
  }));

  instructors = (instructorRows || []).map((instructor) => {
    // Note: Supabase returns users as array even with alias syntax due to foreign key relationship
    const user = Array.isArray(instructor.users) ? instructor.users[0] : instructor.users;
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
      id: instructor.id,
      name,
    };
  });

  aircraftList = (aircraftRows || []).map((a: { id: string; registration: string; type: string }) => ({
    id: a.id,
    registration: a.registration,
    type: a.type,
  }));

  lessons = (lessonRows || []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }));

  flightTypes = (flightTypeRows || []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }));

  // Fetch aircraft components, meters, and compliance data in parallel
  const selectedAircraftId = flightLog?.checked_out_aircraft_id || booking?.aircraft_id;
  const selectedInstructorId = flightLog?.checked_out_instructor_id || booking?.instructor_id;
  const selectedUserId = booking?.user_id;

  const parallelQueries = [];

  // Aircraft data queries
  if (selectedAircraftId) {
    parallelQueries.push(
      supabase
        .from("aircraft_components")
        .select("*")
        .eq("aircraft_id", selectedAircraftId)
        .is("voided_at", null)
        .then(result => ({ type: 'components', data: result.data || [] })),

      supabase
        .from("aircraft")
        .select("total_hours, current_hobbs, current_tach, fuel_consumption")
        .eq("id", selectedAircraftId)
        .single()
        .then(result => ({ type: 'aircraft', data: result.data || null }))
    );
  }

  // Instructor compliance data
  if (selectedInstructorId) {
    parallelQueries.push(
      supabase
        .from("instructors")
        .select("instructor_check_due_date, class_1_medical_due_date")
        .eq("id", selectedInstructorId)
        .maybeSingle()
        .then(result => ({ type: 'instructorCompliance', data: result.data || null }))
    );
  }

  // User compliance data
  if (selectedUserId) {
    parallelQueries.push(
      supabase
        .from("users")
        .select("class_1_medical_due, class_2_medical_due, DL9_due, BFR_due, pilot_license_expiry")
        .eq("id", selectedUserId)
        .maybeSingle()
        .then(result => ({ type: 'userCompliance', data: result.data || null }))
    );
  }

  // Execute all queries in parallel
  if (parallelQueries.length > 0) {
    const results = await Promise.all(parallelQueries);

    // Process results
    for (const result of results) {
      if (result.type === 'components') {
        aircraftComponents = result.data as AircraftComponent[];
      } else if (result.type === 'aircraft') {
        const aircraftData = result.data as { total_hours?: number; current_hobbs?: number; current_tach?: number; fuel_consumption?: number } | null;
        currentAircraftHours = aircraftData?.total_hours ? Number(aircraftData.total_hours) : null;

        if (aircraftData) {
          selectedAircraftMeters = {
            current_hobbs: typeof aircraftData.current_hobbs === 'number' ? aircraftData.current_hobbs : null,
            current_tach: typeof aircraftData.current_tach === 'number' ? aircraftData.current_tach : null,
            fuel_consumption: typeof aircraftData.fuel_consumption === 'number' ? aircraftData.fuel_consumption : null,
          };
        }
      } else if (result.type === 'instructorCompliance') {
        instructorCompliance = result.data as { instructor_check_due_date: string | null; class_1_medical_due_date: string | null } | null;
      } else if (result.type === 'userCompliance') {
        userCompliance = result.data as { class_1_medical_due: string | null; class_2_medical_due: string | null; DL9_due: string | null; BFR_due: string | null; pilot_license_expiry: string | null } | null;
      }
    }
  }

  const status = booking?.status ?? "unconfirmed";

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Simplified Booking Header */}
        <div className="flex flex-col gap-4">
          {/* Top row: Member info and actions */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left: Member name and status */}
            <div className="flex-1 min-w-0">
              {booking && booking.user_id && (
                <div className="flex flex-wrap items-center gap-3">
                  <BookingMemberLink
                    userId={booking.user_id}
                    firstName={booking.user?.first_name}
                    lastName={booking.user?.last_name}
                    currentUserRole={userRole}
                  />
                  <StatusBadge status={status} className="text-sm px-3 py-1" />
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {booking && booking.id && (
                <BookingActions booking={booking} status={status} bookingId={booking.id} hideCheckOutButton={true} />
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

          {/* Booking Stages */}
          <div className="pt-4 border-t border-gray-200">
            <BookingStages stages={BOOKING_STAGES} currentStage={1} />
          </div>
        </div>

        {booking && (
          <CheckOutForm
            booking={booking}
            members={members}
            instructors={instructors}
            aircraft={aircraftList}
            lessons={lessons}
            flightTypes={flightTypes}
            flightLog={flightLog}
            aircraftComponents={aircraftComponents}
            currentAircraftHours={currentAircraftHours}
            flightAuthorization={flightAuthorization}
            requireFlightAuthorization={requireFlightAuthorization}
            selectedAircraftMeters={selectedAircraftMeters}
            canOverrideAuthorization={canOverrideAuthorization}
            instructorCompliance={instructorCompliance}
            userCompliance={userCompliance}
          />
        )}
      </div>
      {/* Booking History Collapsible */}
      <BookingHistoryCollapse bookingId={bookingId || ""} lessons={lessons} />
    </div>
  );
}

// Export protected component with role restriction for instructors and above
/* eslint-disable @typescript-eslint/no-explicit-any */
export default withRoleProtection(BookingCheckOutPage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any; 