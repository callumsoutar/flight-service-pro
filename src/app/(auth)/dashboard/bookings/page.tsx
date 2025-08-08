import { createClient } from "@/lib/SupabaseServerClient";
import type { Booking } from "@/types/bookings";
import BookingsPageClient from "./BookingsPageClient";

export default async function BookingsPage() {
  const supabase = await createClient();
  let bookings: Booking[] = [];
  let members: { id: string; name: string }[] = [];
  let instructors: { id: string; name: string }[] = [];
  let aircraftList: { id: string; registration: string; type: string }[] = [];
  
  const { data } = await supabase
    .from("bookings")
    .select(`
      id,
      start_time,
      end_time,
      status,
      user_id,
      instructor_id,
      aircraft_id,
      purpose,
      booking_type,
      remarks,
      lesson_id,
      flight_type_id,
      briefing_completed,
      checked_out_aircraft_id,
      checked_out_instructor_id,
      hobbs_start,
      hobbs_end,
      tach_start,
      tach_end,
      flight_time,
      created_at,
      updated_at
    `)
    .order("start_time", { ascending: false });
  bookings = (data ?? []) as Booking[];

  // Fetch only members referenced by bookings (user_id in bookings)
  const uniqueMemberIds = Array.from(new Set(bookings.map(b => b.user_id).filter(Boolean)));
  let memberUsers: { id: string; first_name?: string; last_name?: string }[] = [];
  if (uniqueMemberIds.length > 0) {
    const { data: memberUserRows } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", uniqueMemberIds);
    memberUsers = memberUserRows || [];
  }
  members = memberUsers.map(user => ({
    id: user.id,
    name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.id,
  }));

  // Fetch only instructors referenced by bookings (instructor_id in bookings)
  const uniqueInstructorIds = Array.from(new Set(bookings.map(b => b.instructor_id).filter(Boolean)));
  let instructorUsers: { id: string; first_name?: string; last_name?: string }[] = [];
  if (uniqueInstructorIds.length > 0) {
    const { data: instructorUserRows } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", uniqueInstructorIds);
    instructorUsers = instructorUserRows || [];
  }
  instructors = instructorUsers.map(user => ({
    id: user.id,
    name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.id,
  }));

  // Fetch only aircraft referenced by bookings (aircraft_id in bookings)
  const uniqueAircraftIds = Array.from(new Set(bookings.map(b => b.aircraft_id).filter(Boolean)));
  let aircraft: { id: string; registration: string; type: string }[] = [];
  if (uniqueAircraftIds.length > 0) {
    const { data: aircraftRows } = await supabase
      .from("aircraft")
      .select("id, registration, type")
      .in("id", uniqueAircraftIds);
    aircraft = aircraftRows || [];
  }
  aircraftList = aircraft.map(a => ({
    id: a.id,
    registration: a.registration,
    type: a.type || "Unknown",
  }));

  return (
    <BookingsPageClient
      bookings={bookings}
      members={members}
      instructors={instructors}
      aircraftList={aircraftList}
    />
  );
} 