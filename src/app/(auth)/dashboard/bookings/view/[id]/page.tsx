import BookingDetails from "../BookingDetails";
import BookingResources from "../BookingResources";
import { BookingStages, BOOKING_STAGES, STATUS_TO_STAGE_IDX } from "@/components/bookings/BookingStages";
import { Booking } from "@/types/bookings";
import React from "react";
import { createClient } from "@/lib/SupabaseServerClient";
import BookingStagesOptions from "@/components/bookings/BookingStagesOptions";
import BookingHistoryCollapse from "../BookingHistoryCollapse";
import { User } from "@/types/users";
import { Aircraft } from "@/types/aircraft";
import BookingActions from "@/components/bookings/BookingActions";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import BookingConfirmActionClient from "@/components/bookings/BookingConfirmActionClient";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { JoinedInstructor } from "../BookingResources";

interface BookingViewPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingViewPage({ params }: BookingViewPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  let booking: Booking | null = null;
  let member: User | null = null;
  let instructor: JoinedInstructor | null = null;
  const lesson: Record<string, unknown> | null = null;
  let aircraft: Aircraft | null = null;
  const flightType: Record<string, unknown> | null = null;
  let members: { id: string; name: string }[] = [];
  let instructors: { id: string; name: string }[] = [];
  let aircraftList: { id: string; registration: string; type: string }[] = [];
  let lessons: { id: string; name: string }[] = [];
  let flightTypes: { id: string; name: string }[] = [];

  // Fetch booking with full user, instructor, aircraft, and flight_type objects
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`*, user:user_id(*), instructor:instructor_id(*, users:users!instructors_user_id_fkey(*)), aircraft:aircraft_id(*), flight_type:flight_type_id(*), lesson_id, authorization_override, authorization_override_by, authorization_override_at, authorization_override_reason`)
    .eq("id", bookingId)
    .single();
  booking = bookingData;

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
  console.log("INSTRUCTORS FOR DEBUG:", instructors);

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

  // Fetch all bookings for conflict checking
  const { data: allBookingsData } = await supabase
    .from("bookings")
    .select("id, aircraft_id, instructor_id, start_time, end_time, status");
  const allBookings = (allBookingsData || []).map(booking => ({
    ...booking,
    // Add required fields with default values for conflict checking
    user_id: null,
    purpose: "",
    remarks: null,
    lesson_id: null,
    flight_type_id: null,
    booking_type: "flight" as const,
    hobbs_start: null,
    hobbs_end: null,
    tach_start: null,
    tach_end: null,

    created_at: "",
    updated_at: ""
  })) as Booking[];

  // Assign member, instructor, and aircraft only if booking is not null
  if (booking) {
    // Use booking.user, booking.instructor, and booking.aircraft if present (from Supabase join), else fallback to lookup and expand to full object
    const fallbackUser = (u: { id: string; name: string } | undefined): User | null =>
      u ? { 
        id: u.id, 
        first_name: u.name.split(" ")[0] || "", 
        last_name: u.name.split(" ").slice(1).join(" ") || "", 
        email: "", 
        account_balance: 0,
        is_active: true,
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
        last_maintenance_date: null, 
        next_maintenance_date: null, 
        status: "active", 
        capacity: null, 
        for_ato: false, 
        fuel_consumption: null, 
        prioritise_scheduling: false, 
        record_tacho: false, 
        record_hobbs: false, 
        record_airswitch: false, 
        on_line: true, 
        aircraft_image_url: null, 
        engine_count: 1 
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

  const debugData = {
    booking,
    member,
    instructor,
    lesson,
    aircraft,
    flightType,
  };

  // Log to terminal for debugging
  console.log("DEBUG BOOKING DATA:", debugData);

  const status = booking?.status ?? "unconfirmed";
  const currentStage = STATUS_TO_STAGE_IDX[status] ?? 0;

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Booking Details</h1>
            {booking && booking.user_id && (
              <BookingMemberLink
                userId={booking.user_id}
                firstName={booking.user?.first_name || member?.first_name}
                lastName={booking.user?.last_name || member?.last_name}
              />
            )}
          </div>
          <StatusBadge status={status} className="text-lg px-4 py-2 font-semibold" />
          <div className="flex-none flex items-center justify-end gap-3">
            {/* Render Confirm button if booking is unconfirmed (client component wrapper) */}
            {booking && booking.id && (
              <BookingConfirmActionClient bookingId={booking.id} status={booking.status} />
            )}
            {booking && booking.id && (
              <BookingActions booking={booking} status={status} bookingId={booking.id} />
            )}
            {booking && booking.id && (
              <BookingStagesOptions bookingId={booking.id} bookingStatus={booking.status} />
            )}
          </div>
        </div>
        <BookingStages stages={BOOKING_STAGES} currentStage={currentStage} />

        
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
            />
          </div>
        </div>
      </div>
      {/* Booking History Collapsible */}
      <BookingHistoryCollapse bookingId={bookingId || ""} lessons={lessons} />
    </div>
  );
} 