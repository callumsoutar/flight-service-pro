import { BookingStages, BOOKING_STAGES } from "@/components/bookings/BookingStages";
import BookingStagesOptions from "@/components/bookings/BookingStagesOptions";
import { createClient } from "@/lib/SupabaseServerClient";
import BookingCheckInClient from "./BookingCheckInClient";
import BookingActions from "@/components/bookings/BookingActions";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { notFound } from "next/navigation";

interface BookingCheckInPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingCheckInPage({ params }: BookingCheckInPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  // Fetch booking with user, flight_type, and flight_logs joins in a single query
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      *,
      user:user_id(
        id,
        first_name,
        last_name,
        email
      ),
      flight_type:flight_type_id(*),
      authorization_override,
      authorization_override_by,
      authorization_override_at,
      authorization_override_reason,
      flight_logs(
        *,
        checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
        checked_out_instructor:checked_out_instructor_id(
          *,
          users:users!instructors_user_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        )
      )
    `)
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    notFound();
  }

  // Fetch instructor comments count and instructors in parallel
  const [instructorCommentsResult, instructorsResult] = await Promise.all([
    supabase
      .from("instructor_comments")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", booking.id),
    supabase
      .from("instructors")
      .select(`
        id,
        user_id,
        users!inner(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("status", "active")
  ]);

  const instructorCommentsCount = instructorCommentsResult.count || 0;
  const instructors = (instructorsResult.data || []).map((row) => {
    // Use type assertion only for the user property since we know the structure
    const user = (row as { users?: { id?: string; first_name?: string; last_name?: string; email?: string } }).users;
    let name = user?.id || (row as { id: string }).id;
    if (user?.first_name || user?.last_name) {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
      if (fullName) {
        name = fullName;
      } else if (user.email) {
        name = user.email;
      }
    }
    return {
      id: (row as { id: string }).id, // Use instructor table ID, not user ID
      name,
    };
  });

  const status = booking?.status ?? "unconfirmed";

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Check-In Booking</h1>
            <BookingMemberLink
              userId={booking.user_id}
              firstName={booking.user?.first_name}
              lastName={booking.user?.last_name}
            />
          </div>
          <StatusBadge status={status} className="text-lg px-4 py-2 font-semibold" />
          <div className="flex-none flex items-center justify-end gap-3">
            <BookingActions booking={booking} status={status} bookingId={booking.id} mode="check-in" />
            <BookingStagesOptions bookingId={bookingId} bookingStatus={booking.status} instructorCommentsCount={instructorCommentsCount} />
          </div>
        </div>
        <BookingStages stages={BOOKING_STAGES} currentStage={3} />
        {/* Main content row: 40% left, 60% right */}
        <BookingCheckInClient
          booking={booking}
          instructors={instructors}
        />
      </div>
    </div>
  );
} 