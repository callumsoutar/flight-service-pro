import { createClient } from "@/lib/SupabaseServerClient";
import type { Booking } from "@/types/bookings";
import { cookies } from "next/headers";
import BookingsPageClient from "./BookingsPageClient";

export default async function BookingsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("current_org_id")?.value;
  let bookings: Booking[] = [];
  let members: { id: string; name: string }[] = [];
  let instructors: { id: string; name: string }[] = [];
  let aircraftList: { id: string; registration: string; type: string }[] = [];
  if (orgId) {
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
        organization_id,
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
      .eq("organization_id", orgId)
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
    members = memberUsers.map(u => {
      let name = u.id;
      const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      if (fullName) {
        name = fullName;
      }
      return { id: u.id, name };
    });

    // --- Instructor lookup for table: fetch all users referenced by instructor_id in bookings ---
    const uniqueInstructorIds = Array.from(new Set(bookings.map(b => b.instructor_id).filter(Boolean)));
    let instructorUsers: { id: string; first_name?: string; last_name?: string; email?: string }[] = [];
    if (uniqueInstructorIds.length > 0) {
      const { data: instructorUserRows } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", uniqueInstructorIds);
      instructorUsers = instructorUserRows || [];
    }
    instructors = instructorUsers.map(u => {
      let name = u.id;
      const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      if (fullName) {
        name = fullName;
      } else if (u.email) {
        name = u.email;
      }
      return { id: u.id, name };
    });

    // Fetch all aircraft
    const { data: aircraftRows } = await supabase
      .from("aircraft")
      .select("id, registration, type")
      .eq("organization_id", orgId);
    aircraftList = (aircraftRows || []).map((a: { id: string; registration: string; type: string }) => ({
      id: a.id,
      registration: a.registration,
      type: a.type,
    }));
  }

  return (
    <BookingsPageClient
      bookings={bookings}
      members={members}
      instructors={instructors}
      aircraftList={aircraftList}
    />
  );
} 