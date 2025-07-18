import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Org check
  const orgId = req.cookies.get("current_org_id")?.value;
  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }
  const searchParams = req.nextUrl.searchParams;
  const bookingId = searchParams.get("id");

  let query = supabase
    .from("bookings")
    .select(`
      id,
      start_time,
      end_time,
      status,
      purpose,
      user:user_id(id, first_name, last_name),
      instructor:instructor_id(id, first_name, last_name),
      aircraft:aircraft_id(id, registration, type)
    `)
    .eq("organization_id", orgId);

  if (bookingId) {
    query = query.eq("id", bookingId);
    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ booking: normalizeBookingTimestamps(data) });
  }

  const { data, error } = await query.order("start_time", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bookings: (data ?? []).map(normalizeBookingTimestamps) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Org check
  const orgId = req.cookies.get("current_org_id")?.value;
  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }
  const body = await req.json();
  const requiredFields = ["user_id", "aircraft_id", "start_time", "end_time", "purpose", "booking_type"];
  for (const field of requiredFields) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }
  // Compose insert payload
  const insertPayload: Record<string, unknown> = {
    organization_id: orgId,
    user_id: body.user_id,
    aircraft_id: body.aircraft_id,
    start_time: body.start_time,
    end_time: body.end_time,
    purpose: body.purpose,
    booking_type: body.booking_type,
    // Optional fields
    instructor_id: body.instructor_id || null,
    remarks: body.remarks || null,
    lesson_id: body.lesson_id || null,
    flight_type_id: body.flight_type_id || null,
    status: body.status || "unconfirmed",
    cancellation_reason: body.cancellation_reason || null,
    cancellation_category_id: body.cancellation_category_id || null,
  };
  const { data, error } = await supabase
    .from("bookings")
    .insert([insertPayload])
    .select()
    .single();
  if (error) {
    // Handle exclusion constraint (double-booking) errors
    if (
      error.code === "23P01" ||
      (error.message && (
        error.message.includes("no_aircraft_overlap") ||
        error.message.includes("no_instructor_overlap")
      ))
    ) {
      let msg = "This resource is already booked for the selected time.";
      if (error.message.includes("no_aircraft_overlap")) {
        msg = "The selected aircraft is already booked for this time.";
      } else if (error.message.includes("no_instructor_overlap")) {
        msg = "The selected instructor is already booked for this time.";
      }
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ booking: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Org check
  const orgId = req.cookies.get("current_org_id")?.value;
  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }
  const body = await req.json();
  const { id, ...updateFields } = body;
  if (!id) {
    return NextResponse.json({ error: "Booking id is required" }, { status: 400 });
  }
  // Only allow patching safe fields
  const allowedFields = [
    "start_time", "end_time", "purpose", "remarks", "instructor_id", "user_id", "aircraft_id", "lesson_id", "flight_type_id", "booking_type", "status",
    "checked_out_aircraft_id", "checked_out_instructor_id", // <-- allow these fields
    // Add meter fields for patching
    "hobbs_start", "hobbs_end", "tach_start", "tach_end",
    // Add cancellation fields
    "cancellation_reason", "cancellation_category_id"
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updateFields) {
      updates[key] = updateFields[key];
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  // Always scope by org
  const { error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) {
    // Handle exclusion constraint (double-booking) errors
    if (
      error.code === "23P01" ||
      (error.message && (
        error.message.includes("no_aircraft_overlap") ||
        error.message.includes("no_instructor_overlap")
      ))
    ) {
      let msg = "This resource is already booked for the selected time.";
      if (error.message.includes("no_aircraft_overlap")) {
        msg = "The selected aircraft is already booked for this time.";
      } else if (error.message.includes("no_instructor_overlap")) {
        msg = "The selected instructor is already booked for this time.";
      }
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Fetch and return the updated booking (including flight_time)
  const { data: updatedBooking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  return NextResponse.json({ booking: normalizeBookingTimestamps(updatedBooking) });
}

function isLegacyDateString(val: string) {
  // Matches 'YYYY-MM-DD HH:MM:SS+00' (legacy format)
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00$/.test(val);
}

function normalizeBookingTimestamps(booking: Record<string, unknown> | null) {
  if (!booking) return booking;
  // Normalize start_time and end_time to ISO 8601 (with T and Z) only if legacy format
  if (booking.start_time && typeof booking.start_time === 'string' && isLegacyDateString(booking.start_time)) {
    const d = new Date(booking.start_time.replace(' ', 'T').replace('+00', 'Z'));
    booking.start_time = isNaN(d.getTime()) ? booking.start_time : d.toISOString();
  }
  if (booking.end_time && typeof booking.end_time === 'string' && isLegacyDateString(booking.end_time)) {
    const d = new Date(booking.end_time.replace(' ', 'T').replace('+00', 'Z'));
    booking.end_time = isNaN(d.getTime()) ? booking.end_time : d.toISOString();
  }
  return booking;
} 