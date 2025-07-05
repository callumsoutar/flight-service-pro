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
    return NextResponse.json({ booking: data });
  }

  const { data, error } = await query.order("start_time", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bookings: data ?? [] });
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
    // Add meter fields for patching
    "hobbs_start", "hobbs_end", "tach_start", "tach_end"
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
  return NextResponse.json({ booking: updatedBooking });
} 