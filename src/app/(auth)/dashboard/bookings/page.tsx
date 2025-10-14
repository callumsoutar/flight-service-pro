import { createClient } from "@/lib/SupabaseServerClient";
import type { Booking } from "@/types/bookings";
import BookingsPageClient from "./BookingsPageClient";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

async function BookingsPage({ user, userRole }: ProtectedPageProps) {
  const supabase = await createClient();
  let bookings: Booking[] = [];
  let members: { id: string; name: string }[] = [];
  let instructors: { id: string; user_id: string; first_name?: string; last_name?: string; users?: { email: string }; name: string }[] = [];
  let aircraftList: { id: string; registration: string; type: string }[] = [];

  const isPrivilegedUser = ['instructor', 'admin', 'owner'].includes(userRole);
  const isRestrictedUser = ['member', 'student'].includes(userRole);

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

  if (isRestrictedUser) {
    // Restricted users: only their own bookings, exclude cancelled
    bookingsQuery = bookingsQuery.eq('user_id', user.id).neq('status', 'cancelled');
    const { data } = await bookingsQuery.order("start_time", { ascending: false });
    bookings = (data ?? []) as Booking[];
  } else if (isPrivilegedUser) {
    // Privileged users: fetch unconfirmed, confirmed, and flying bookings initially
    // Advanced search will handle other queries via API
    bookingsQuery = bookingsQuery.in('status', ['unconfirmed', 'confirmed', 'flying']);
    const { data } = await bookingsQuery.order("start_time", { ascending: false });
    bookings = (data ?? []) as Booking[];
  }

  if (isRestrictedUser) {
    // For restricted users: fetch only member/instructor data for their bookings,
    // but fetch ALL aircraft so they can book any available aircraft
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

    const uniqueInstructorIds = Array.from(new Set(bookings.map(b => b.instructor_id).filter(Boolean)));
    let instructorRows: { id: string; user_id: string; first_name?: string; last_name?: string; users?: { email?: string }[] }[] = [];
    if (uniqueInstructorIds.length > 0) {
      const { data: instructorData } = await supabase
        .from("instructors")
        .select("id, user_id, first_name, last_name, users(email)")
        .in("id", uniqueInstructorIds);
      instructorRows = instructorData || [];
    }
    instructors = instructorRows.map(instructor => {
      const userEmail = Array.isArray(instructor.users) && instructor.users.length > 0 ? instructor.users[0] : undefined;
      return {
        id: instructor.id,
        user_id: instructor.user_id,
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        users: userEmail?.email ? { email: userEmail.email } : undefined,
        name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.id,
      };
    });

    // Fetch ALL on_line aircraft for new booking creation (not just ones in existing bookings)
    const { data: aircraftRows } = await supabase
      .from("aircraft")
      .select("id, registration, type, on_line")
      .eq("on_line", true);
    aircraftList = (aircraftRows || []).map(a => ({
      id: a.id,
      registration: a.registration,
      type: a.type || "Unknown",
    }));
  } else if (isPrivilegedUser) {
    // For privileged users: fetch ALL members, instructors, and on_line aircraft for search functionality
    const [memberUsersResponse, instructorDataResponse, aircraftResponse] = await Promise.all([
      supabase.from("users").select("id, first_name, last_name"),
      supabase.from("instructors").select("id, user_id, first_name, last_name, users(email)"),
      supabase.from("aircraft").select("id, registration, type, on_line").eq("on_line", true)
    ]);

    members = (memberUsersResponse.data || []).map(user => ({
      id: user.id,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.id,
    }));

    instructors = (instructorDataResponse.data || []).map(instructor => {
      const userEmail = Array.isArray(instructor.users) && instructor.users.length > 0 ? instructor.users[0] : undefined;
      return {
        id: instructor.id,
        user_id: instructor.user_id,
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        users: userEmail?.email ? { email: userEmail.email } : undefined,
        name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.id,
      };
    });

    aircraftList = (aircraftResponse.data || []).map(a => ({
      id: a.id,
      registration: a.registration,
      type: a.type || "Unknown",
    }));
  }

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
export default withRoleProtection(BookingsPage, ROLE_CONFIGS.AUTHENTICATED_ONLY);