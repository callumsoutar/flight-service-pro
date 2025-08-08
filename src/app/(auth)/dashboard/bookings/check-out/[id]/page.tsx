import { BookingStages, BOOKING_STAGES } from "@/components/bookings/BookingStages";
import BookingActions from "@/components/bookings/BookingActions";
import { Booking } from "@/types/bookings";
import React from "react";
import { createClient } from "@/lib/SupabaseServerClient";
import BookingHistoryCollapse from "../../view/BookingHistoryCollapse";
import CheckOutForm from "@/components/bookings/CheckOutForm";
import { BookingDetails } from "@/types/booking_details";
import BookingStagesOptions from "@/components/bookings/BookingStagesOptions";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import { StatusBadge } from "@/components/bookings/StatusBadge";

interface BookingCheckOutPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingCheckOutPage({ params }: BookingCheckOutPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  let booking: Booking | null = null;
  let members: { id: string; name: string }[] = [];
  let instructors: { id: string; name: string }[] = [];
  let aircraftList: { id: string; registration: string; type: string }[] = [];
  let lessons: { id: string; name: string }[] = [];
  let flightTypes: { id: string; name: string }[] = [];
  let bookingDetails: BookingDetails | null = null;

  // Fetch booking with full user, instructor, and aircraft objects, plus lesson_id and flight_type_id
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`*, user:user_id(*), instructor:instructor_id(*), aircraft:aircraft_id(*), lesson_id, flight_type_id`)
    .eq("id", bookingId)
    .single();
  booking = bookingData;

  // Fetch all members (users)
  const { data: memberRows } = await supabase
    .from("users")
    .select("id, first_name, last_name");
  members = (memberRows || []).map((user) => ({
    id: user.id,
    name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.id,
  }));

  // Fetch all instructors from the instructors table (consistent with booking view page)
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

  // Fetch all lessons
  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("id, name");
  lessons = (lessonRows || []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }));

  // Fetch all flight types
  const { data: flightTypeRows } = await supabase
    .from("flight_types")
    .select("id, name");
  flightTypes = (flightTypeRows || []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }));

  // Fetch booking_details for this booking
  if (booking && booking.id) {
    const { data: detailsData } = await supabase
      .from("booking_details")
      .select("*")
      .eq("booking_id", booking.id)
      .single();
    bookingDetails = detailsData;
  }

  const status = booking?.status ?? "unconfirmed";

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Booking Check-Out</h1>
            {booking && (
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
              <BookingActions status={status} bookingId={booking.id} hideCheckOutButton={true} />
            )}
            {booking && booking.id && (
              <BookingStagesOptions bookingId={booking.id} />
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
            bookingDetails={bookingDetails}
          />
        )}
      </div>
      {/* Booking History Collapsible */}
      <BookingHistoryCollapse bookingId={bookingId || ""} lessons={lessons} />
    </div>
  );
} 