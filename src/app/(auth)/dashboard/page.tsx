import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import { createClient } from "@/lib/SupabaseServerClient";
import DashboardTabbedSection from "@/components/dashboard/DashboardTabbedSection";
import { SettingsProvider } from "@/contexts/SettingsContext";
import type { Booking } from "@/types/bookings";

async function DashboardPage({ userRole }: ProtectedPageProps) {
  const supabase = await createClient();

  // Fetch today's confirmed bookings and currently flying bookings
  const { data: bookingsData } = await supabase
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
      voucher_number,
      created_at,
      updated_at
    `)
    .in('status', ['confirmed', 'flying'])
    .order("start_time", { ascending: true });

  const bookings: Booking[] = bookingsData || [];

  // Fetch related data for today's bookings
  const uniqueMemberIds = Array.from(new Set(bookings.map(b => b.user_id).filter(Boolean)));
  const uniqueInstructorIds = Array.from(new Set(bookings.map(b => b.instructor_id).filter(Boolean)));
  const uniqueAircraftIds = Array.from(new Set(bookings.map(b => b.aircraft_id).filter(Boolean)));

  const [memberUsersResponse, instructorDataResponse, aircraftResponse] = await Promise.all([
    uniqueMemberIds.length > 0
      ? supabase.from("users").select("id, first_name, last_name").in("id", uniqueMemberIds)
      : { data: [] },
    uniqueInstructorIds.length > 0
      ? supabase.from("instructors").select("id, first_name, last_name").in("id", uniqueInstructorIds)
      : { data: [] },
    uniqueAircraftIds.length > 0
      ? supabase.from("aircraft").select("id, registration, type").in("id", uniqueAircraftIds)
      : { data: [] }
  ]);

  const members = (memberUsersResponse.data || []).map(user => ({
    id: user.id,
    name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.id,
  }));

  const instructors = (instructorDataResponse.data || []).map(instructor => ({
    id: instructor.id,
    name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.id,
  }));

  const aircraftList = (aircraftResponse.data || []).map(a => ({
    id: a.id,
    registration: a.registration,
    type: a.type || "Unknown",
  }));
  return (
    <SettingsProvider>
      <div className="flex flex-col gap-8">
        {/* Heading */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-500">Overview of your flight school operations</p>
        </div>

        {/* Main Dashboard Content */}
        <DashboardTabbedSection
          bookings={bookings}
          members={members}
          instructors={instructors}
          aircraftList={aircraftList}
          userRole={userRole}
        />
      </div>
    </SettingsProvider>
  );
}

// Export protected component - all authenticated users can access dashboard
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(DashboardPage, ROLE_CONFIGS.AUTHENTICATED_ONLY) as any; 