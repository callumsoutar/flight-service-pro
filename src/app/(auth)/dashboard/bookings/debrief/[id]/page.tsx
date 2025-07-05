import { BookingStages, BOOKING_STAGES } from "@/components/bookings/BookingStages";
import { Badge } from "@/components/ui/badge";
import { Booking } from "@/types/bookings";
import { createClient } from "@/lib/SupabaseServerClient";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import React from "react";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import DebriefFormClient from "./DebriefFormClient";

interface BookingDebriefPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<Booking["status"], { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800" },
  unconfirmed: { label: "Unconfirmed", color: "bg-gray-100 text-gray-800" },
  briefing: { label: "Briefing", color: "bg-yellow-100 text-yellow-800" },
  flying: { label: "Flying", color: "bg-blue-100 text-blue-800" },
  complete: { label: "Complete", color: "bg-violet-100 text-violet-800" },
};

export default async function BookingDebriefPage({ params }: BookingDebriefPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();
  const cookiesList = await cookies();
  const orgId = cookiesList.get("current_org_id")?.value;

  let booking: Booking | null = null;
  if (orgId) {
    const { data: bookingData } = await supabase
      .from("bookings")
      .select(`*, user:user_id(*)`)
      .eq("organization_id", orgId)
      .eq("id", bookingId)
      .single();
    booking = bookingData;
  }

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
        {/* Title and actions row */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Debrief Booking</h1>
            <BookingMemberLink
              userId={booking.user_id}
              firstName={booking.user.first_name}
              lastName={booking.user.last_name}
            />
          </div>
          <Badge className={STATUS_BADGE[status].color + " text-lg px-4 py-2 font-semibold"}>{STATUS_BADGE[status].label}</Badge>
          <div className="flex-none flex items-center justify-end gap-3">
            <Button className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
              Save and Continue
            </Button>
          </div>
        </div>
        <BookingStages stages={BOOKING_STAGES} currentStage={currentStage} />
        <DebriefFormClient booking={booking} member={booking.user} />
      </div>
    </div>
  );
} 