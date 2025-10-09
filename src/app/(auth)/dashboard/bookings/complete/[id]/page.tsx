import React from "react";
import { BookingStages, BOOKING_STAGES } from "@/components/bookings/BookingStages";
import BookingStagesOptions from "@/components/bookings/BookingStagesOptions";
import { createClient } from "@/lib/SupabaseServerClient";
import { notFound } from "next/navigation";
import BookingCompletionClient from "./BookingCompletionClient";
import BookingActions from "@/components/bookings/BookingActionsClient";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import { StatusBadge } from "@/components/bookings/StatusBadge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingCompletePage({ params }: PageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  // Fetch booking with all related data
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      *,
      user:user_id(id, first_name, last_name, email),
      flight_type:flight_type_id(*),
      flight_logs(
        *,
        checked_out_aircraft:checked_out_aircraft_id(*),
        checked_out_instructor:checked_out_instructor_id(
          *,
          users:users!instructors_user_id_fkey(id, first_name, last_name, email)
        )
      )
    `)
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    notFound();
  }

  // Fetch instructor comments count
  const { count: instructorCommentsCount } = await supabase
    .from("instructor_comments")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", booking.id);

  // Check if there's lesson progress (debrief) for this booking
  const { data: lessonProgressData } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("booking_id", booking.id)
    .limit(1)
    .maybeSingle();
  
  const hasLessonProgress = !!lessonProgressData;

  // Get aircraft data (from flight log if available, otherwise booking)
  const aircraftId = booking.flight_logs?.[0]?.checked_out_aircraft_id || booking.aircraft_id;
  const { data: aircraft } = await supabase
    .from("aircraft")
    .select("*")
    .eq("id", aircraftId)
    .single();

  if (!aircraft) {
    notFound();
  }

  // Fetch flight types
  const { data: flightTypesData } = await supabase
    .from("flight_types")
    .select("id, name, instruction_type")
    .eq("is_active", true)
    .order("name");

  const flightTypes = flightTypesData || [];

  // Fetch instructors
  const { data: instructorsData } = await supabase
    .from("instructors")
    .select(`
      id,
      user_id,
      users!inner(id, first_name, last_name, email)
    `)
    .eq("status", "active");

  const instructors = (instructorsData || []).map((row) => {
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    return {
      id: row.id,
      name: fullName || user?.email || 'Unknown',
    };
  });

  // Fetch aircraft charge rate to determine billing method
  let chargingBy: 'hobbs' | 'tacho' | null = null;
  let aircraftRate: number | undefined;
  
  if (booking.flight_type_id) {
    const { data: chargeRateData } = await supabase
      .from("aircraft_charge_rates")
      .select("rate_per_hour, charge_hobbs, charge_tacho")
      .eq("aircraft_id", aircraftId)
      .eq("flight_type_id", booking.flight_type_id)
      .maybeSingle();

    if (chargeRateData) {
      aircraftRate = chargeRateData.rate_per_hour;
      chargingBy = chargeRateData.charge_hobbs ? 'hobbs' : chargeRateData.charge_tacho ? 'tacho' : null;
    }
  }

  // Fetch instructor rate (if needed)
  let instructorRate: number | undefined;
  const instructorId = booking.flight_logs?.[0]?.checked_out_instructor_id;
  
  if (instructorId && booking.flight_type_id) {
    const { data: rateData } = await supabase
      .from("instructor_flight_type_rates")
      .select("rate")
      .eq("instructor_id", instructorId)
      .eq("flight_type_id", booking.flight_type_id)
      .maybeSingle();
    
    if (rateData) {
      instructorRate = rateData.rate;
    }
  }

  // Fetch existing invoice and invoice items (if any) to initialize local state
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  let existingInvoiceItems: import("@/types/invoice_items").InvoiceItem[] = [];
  if (existingInvoice) {
    const { data: itemsData } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", existingInvoice.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    existingInvoiceItems = itemsData || [];
  }

  const status = booking?.status ?? "unconfirmed";

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Complete Flight</h1>
            <BookingMemberLink
              userId={booking.user_id}
              firstName={booking.user?.first_name}
              lastName={booking.user?.last_name}
            />
          </div>
          <StatusBadge status={status} className="text-lg px-4 py-2 font-semibold" />
          <div className="flex-none flex items-center justify-end gap-3">
            <BookingActions
              booking={booking}
              status={status}
              bookingId={booking.id}
              mode="check-in"
              flightAuthorization={null}
              requireFlightAuthorization={false}
            />
            <BookingStagesOptions bookingId={bookingId} bookingStatus={booking.status} instructorCommentsCount={instructorCommentsCount || 0} hasLessonProgress={hasLessonProgress} />
          </div>
        </div>
        <BookingStages stages={BOOKING_STAGES} currentStage={4} />
        {/* Main content */}
        <BookingCompletionClient
          booking={booking}
          aircraft={aircraft}
          flightTypes={flightTypes}
          instructors={instructors}
          aircraftRate={aircraftRate}
          instructorRate={instructorRate}
          chargingBy={chargingBy}
          existingInvoice={existingInvoice}
          existingInvoiceItems={existingInvoiceItems}
        />
      </div>
    </div>
  );
}

