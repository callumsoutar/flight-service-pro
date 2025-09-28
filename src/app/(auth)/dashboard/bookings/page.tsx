import { createClient } from "@/lib/SupabaseServerClient";
import type { Booking } from "@/types/bookings";
import BookingsPageClient from "./BookingsPageClient";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

async function BookingsPage({ user, userRole }: ProtectedPageProps) {
  const supabase = await createClient();
  let bookings: Booking[] = [];
  let members: { id: string; name: string }[] = [];
  let instructors: { id: string; name: string }[] = [];
  let aircraftList: { id: string; registration: string; type: string }[] = [];

  // Build query based on user role
  let bookingsQuery = supabase
    .from("bookings")
    .select(`
      id,
      aircraft_id,
      user_id,
      instructor_id,
      start_time,
      end_time,
      status,
      purpose,
      remarks,
      lesson_id,
      flight_type_id,
      booking_type,
      created_at,
      updated_at
    `);

  // If user is member or student, only show their own bookings and exclude cancelled ones
  if (userRole === 'member' || userRole === 'student') {
    bookingsQuery = bookingsQuery.eq('user_id', user.id).neq('status', 'cancelled');
  }

  const { data } = await bookingsQuery.order("start_time", { ascending: false });
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
  let instructorRows: { id: string; first_name?: string; last_name?: string }[] = [];
  if (uniqueInstructorIds.length > 0) {
    const { data: instructorData } = await supabase
      .from("instructors")
      .select("id, first_name, last_name")
      .in("id", uniqueInstructorIds);
    instructorRows = instructorData || [];
  }
  instructors = instructorRows.map(instructor => ({
    id: instructor.id,
    name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.id,
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
      userRole={userRole}
    />
  );
}

// Export protected component - all authenticated users can access bookings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(BookingsPage, ROLE_CONFIGS.AUTHENTICATED_ONLY) as any; 