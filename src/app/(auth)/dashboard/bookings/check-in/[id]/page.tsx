import { BookingStages, BOOKING_STAGES } from "@/components/bookings/BookingStages";
import BookingStagesOptions from "@/components/bookings/BookingStagesOptions";
import { Badge } from "@/components/ui/badge";
import { Booking } from "@/types/bookings";
import { createClient } from "@/lib/SupabaseServerClient";
import { cookies } from "next/headers";
import BookingCheckInClient from "./BookingCheckInClient";
import BookingActions from "@/components/bookings/BookingActions";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";

interface BookingCheckInPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<Booking["status"], { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800" },
  unconfirmed: { label: "Unconfirmed", color: "bg-gray-100 text-gray-800" },
  briefing: { label: "Briefing", color: "bg-yellow-100 text-yellow-800" },
  flying: { label: "Flying", color: "bg-blue-100 text-blue-800" },
  complete: { label: "Complete", color: "bg-violet-100 text-violet-800" },
};

export default async function BookingCheckInPage({ params }: BookingCheckInPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();
  const cookiesList = await cookies();
  const orgId = cookiesList.get("current_org_id")?.value;

  let booking: Booking | null = null;
  let member: { id: string; first_name?: string; last_name?: string } | null = null;
  let instructorCommentsCount = 0;
  let instructors: { id: string; name: string }[] = [];

  if (orgId) {
    // Fetch booking with user join
    const { data: bookingData } = await supabase
      .from("bookings")
      .select(`*, user:user_id(*)`)
      .eq("organization_id", orgId)
      .eq("id", bookingId)
      .single();
    booking = bookingData;

    // Fallback: fetch all members (users in org)
    if (!booking?.user?.first_name || !booking?.user?.last_name) {
      const { data: memberRows } = await supabase
        .from("user_organizations")
        .select("user_id, users(first_name, last_name)")
        .eq("organization_id", orgId);
      const members = (memberRows || []).map((row: { user_id: string; users?: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] }) => {
        const userObj = Array.isArray(row.users) ? row.users[0] : row.users;
        return {
          id: row.user_id,
          first_name: userObj?.first_name,
          last_name: userObj?.last_name,
        };
      });
      member = members.find(m => m.id === booking?.user_id) || null;
    }

    // Fetch instructor comments count
    if (booking && booking.id) {
      const { count } = await supabase
        .from("instructor_comments")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", booking.id)
        .eq("organization_id", orgId);
      instructorCommentsCount = count || 0;
    }

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
  }

  const status = booking?.status ?? "unconfirmed";

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Check-In Booking</h1>
            {booking && (
              <BookingMemberLink
                userId={booking.user_id}
                firstName={booking.user?.first_name || member?.first_name}
                lastName={booking.user?.last_name || member?.last_name}
              />
            )}
          </div>
          <Badge className={STATUS_BADGE[status].color + " text-lg px-4 py-2 font-semibold"}>{STATUS_BADGE[status].label}</Badge>
          <div className="flex-none flex items-center justify-end gap-3">
            {booking && booking.id && (
              <BookingActions status={status} bookingId={booking.id} mode="check-in" />
            )}
            <BookingStagesOptions bookingId={bookingId} instructorCommentsCount={instructorCommentsCount} />
          </div>
        </div>
        <BookingStages stages={BOOKING_STAGES} currentStage={3} />
        {/* Main content row: 40% left, 60% right */}
        {booking && orgId && (
          <BookingCheckInClient
            booking={booking}
            instructors={instructors}
            orgId={orgId}
          />
        )}
      </div>
    </div>
  );
} 