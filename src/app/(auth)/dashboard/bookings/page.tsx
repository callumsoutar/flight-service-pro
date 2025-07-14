import { createClient } from "@/lib/SupabaseServerClient";
import BookingsTable from "./BookingsTable";
import type { Booking } from "@/types/bookings";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarDays, Clock, AlertCircle, Send } from "lucide-react";

function getStatusCounts(bookings: Booking[]) {
  const counts = { total: bookings.length, today: 0, unconfirmed: 0, confirmed: 0, flying: 0 };
  const todayStr = new Date().toISOString().slice(0, 10);
  for (const b of bookings) {
    if (b.start_time.slice(0, 10) === todayStr) counts.today++;
    if (b.status === "unconfirmed") counts.unconfirmed++;
    if (b.status === "confirmed") counts.confirmed++;
    if (b.status === "flying") counts.flying++;
  }
  return counts;
}

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

    // Fetch all members (users in org)
    const { data: memberRows } = await supabase
      .from("user_organizations")
      .select("user_id, users(first_name, last_name)")
      .eq("organization_id", orgId);
    members = (memberRows || []).map((row: { user_id: string; users?: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] }) => {
      const userObj = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        id: row.user_id,
        name: userObj ? `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() : row.user_id,
      };
    });

    // Fetch all instructors (users in org with instructor/admin/owner role)
    const { data: instructorRows } = await supabase
      .from("user_organizations")
      .select("user_id, users(first_name, last_name, email), role")
      .eq("organization_id", orgId)
      .in("role", ["instructor", "admin", "owner"]);
    instructors = (instructorRows || []).map((row: { user_id: string; users?: { first_name?: string; last_name?: string; email?: string } | { first_name?: string; last_name?: string; email?: string }[]; role: string }) => {
      let name = row.user_id;
      const userObj = Array.isArray(row.users) ? row.users[0] : row.users;
      if (userObj) {
        const fullName = `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim();
        if (fullName) {
          name = fullName;
        } else if (userObj.email) {
          name = userObj.email;
        }
      }
      return {
        id: row.user_id,
        name,
      };
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
  const statusCounts = getStatusCounts(bookings);

  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-2">Manage and track all your flight bookings</p>
        </div>
        <Link href="/dashboard/bookings/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2">
            <Send className="w-5 h-5" /> New Booking
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><CalendarDays className="w-6 h-6 text-indigo-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Total</h3>
          <p className="text-3xl font-bold text-indigo-600">{statusCounts.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><Clock className="w-6 h-6 text-green-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Today</h3>
          <p className="text-3xl font-bold text-green-600">{statusCounts.today}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><AlertCircle className="w-6 h-6 text-yellow-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Unconfirmed</h3>
          <p className="text-3xl font-bold text-yellow-600">{statusCounts.unconfirmed}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><Send className="w-6 h-6 text-blue-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Flying</h3>
          <p className="text-3xl font-bold text-blue-600">{statusCounts.flying}</p>
        </div>
      </div>
      <BookingsTable bookings={bookings} members={members} instructors={instructors} aircraftList={aircraftList} />
    </main>
  );
} 