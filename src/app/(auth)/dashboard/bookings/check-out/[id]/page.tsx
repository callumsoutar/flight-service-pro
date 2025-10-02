import { BookingStages, BOOKING_STAGES } from "@/components/bookings/BookingStages";
import BookingActions from "@/components/bookings/BookingActionsClient";
import { Booking } from "@/types/bookings";
import React from "react";
import { createClient } from "@/lib/SupabaseServerClient";
import BookingHistoryCollapse from "../../view/BookingHistoryCollapse";
import CheckOutForm from "@/components/bookings/CheckOutForm";
import { FlightLog } from "@/types/flight_logs";
import BookingStagesOptions from "@/components/bookings/BookingStagesOptions";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import { AircraftComponent } from "@/types/aircraft_components";

interface BookingCheckOutPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function BookingCheckOutPage({ params }: BookingCheckOutPageProps) {
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

  // Fetch booking with full user, instructor, aircraft, and flight_type objects
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`*, user:user_id(*), instructor:instructor_id(*), aircraft:aircraft_id(*), flight_type:flight_type_id(*), lesson_id, authorization_override, authorization_override_by, authorization_override_at, authorization_override_reason`)
    .eq("id", bookingId)
    .single();
  booking = bookingData;

  // Fetch instructor comments count
  const { count: instructorCommentsCount } = await supabase
    .from("instructor_comments")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);

  // Fetch all members (users)
  const { data: memberRows } = await supabase
    .from("users")
    .select("id, first_name, last_name");
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
      id: instructor.id, // 
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
    .select("id, name");
  flightTypes = (flightTypeRows || []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }));

  // Fetch flight_log for this booking
  if (booking && booking.id) {
    const { data: flightLogData } = await supabase
      .from("flight_logs")
      .select(`
        *,
        checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
        checked_out_instructor:checked_out_instructor_id(*)
      `)
      .eq("booking_id", booking.id)
      .single();
    flightLog = flightLogData;
  }

  // Fetch aircraft components for the selected aircraft (from flight log or booking)
  const selectedAircraftId = flightLog?.checked_out_aircraft_id || booking?.aircraft_id;
  if (selectedAircraftId) {
    // Fetch components for this aircraft
    const { data: componentsData } = await supabase
      .from("aircraft_components")
      .select("*")
      .eq("aircraft_id", selectedAircraftId)
      .is("voided_at", null);

    aircraftComponents = componentsData || [];

    // Fetch current aircraft hours
    const { data: aircraftData } = await supabase
      .from("aircraft")
      .select("total_hours")
      .eq("id", selectedAircraftId)
      .single();

    currentAircraftHours = aircraftData?.total_hours ? Number(aircraftData.total_hours) : null;
  }

  const status = booking?.status ?? "unconfirmed";

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Booking Check-Out</h1>
            {booking && booking.user_id && (
              <BookingMemberLink
                userId={booking.user_id}
                firstName={booking.user?.first_name}
                lastName={booking.user?.last_name}
              />
            )}
          </div>
          <StatusBadge status={status} className="text-lg px-4 py-2 font-semibold" />
          <div className="flex-none flex items-center justify-end gap-3">
            {booking && booking.id && (
              <BookingActions booking={booking} status={status} bookingId={booking.id} hideCheckOutButton={true} />
            )}
            {booking && booking.id && (
              <BookingStagesOptions 
                bookingId={booking.id} 
                bookingStatus={booking.status} 
                instructorCommentsCount={instructorCommentsCount || 0} 
              />
            )}
          </div>
        </div>
        <BookingStages stages={BOOKING_STAGES} currentStage={1} />
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