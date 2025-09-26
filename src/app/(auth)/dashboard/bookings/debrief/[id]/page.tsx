import { createClient } from "@/lib/SupabaseServerClient";
import { redirect } from 'next/navigation';
import React from "react";
import type { Booking } from "@/types/bookings";
import DebriefClientShell from "./DebriefClientShell";
import { BOOKING_STAGES, BookingStages } from "@/components/bookings/BookingStages";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

interface BookingDebriefPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function BookingDebriefPage({ params, user, userRole }: BookingDebriefPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  let booking: Booking | null = null;
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`
      *,
      user:user_id(*),
      authorization_override,
      authorization_override_by,
      authorization_override_at,
      authorization_override_reason,
      flight_logs(
        *,
        checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
        checked_out_instructor:checked_out_instructor_id(*)
      )
    `)
    .eq("id", bookingId)
    .single();
  booking = bookingData;

  // If booking or booking.user is missing, redirect to bookings list
  if (!booking || !booking.user) {
    redirect('/dashboard/bookings');
  }

  // Check if user has permission to view this booking
  // Students can only view their own bookings, instructors/admins/owners can view all
  if (booking.user_id !== user.id) {
    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      redirect('/dashboard/bookings');
    }
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

// Export protected component with role restriction for instructors and above
/* eslint-disable @typescript-eslint/no-explicit-any */
export default withRoleProtection(BookingDebriefPage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any; 