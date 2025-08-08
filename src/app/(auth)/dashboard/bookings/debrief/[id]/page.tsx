import { createClient } from "@/lib/SupabaseServerClient";
import React from "react";
import type { Booking } from "@/types/bookings";
import DebriefClientShell from "./DebriefClientShell";
import { BOOKING_STAGES, BookingStages } from "@/components/bookings/BookingStages";

interface BookingDebriefPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDebriefPage({ params }: BookingDebriefPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  let booking: Booking | null = null;
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`*, user:user_id(*)`)
    .eq("id", bookingId)
    .single();
  booking = bookingData;

  // If booking or booking.user is missing, show a user-friendly message and do not render debrief content
  if (!booking || !booking.user) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-xl w-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{!booking ? "Booking not found" : "Member not found"}</h2>
          <p className="text-muted-foreground">We couldn&apos;t find the necessary information to display this debrief. Please check the booking details or contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  const status = booking.status ?? "unconfirmed";
  const debriefStageIdx = BOOKING_STAGES.findIndex(s => s.key === 'debrief');
  const currentStage = debriefStageIdx >= 0 ? debriefStageIdx : BOOKING_STAGES.length - 1;

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        <DebriefClientShell
          booking={booking}
          member={booking.user}
          status={status}
          BookingStages={<BookingStages stages={BOOKING_STAGES} currentStage={currentStage} />}
        />
      </div>
    </div>
  );
} 