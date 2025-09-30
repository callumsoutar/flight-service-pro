import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

const ALLOWED_FIELDS = [
  "booking_id", "checked_out_aircraft_id", "checked_out_instructor_id",
  "actual_start", "actual_end", "eta", "hobbs_start", "hobbs_end", 
  "tach_start", "tach_end", "flight_time_hobbs", "flight_time_tach", 
  "flight_time", "fuel_on_board", "passengers", "route", "equipment",
  "briefing_completed", "authorization_completed", 
  "flight_remarks"
];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { booking_id, ...fields } = body;
  
  if (!booking_id) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }

  // Check for existing flight log for this booking
  const { data: existing } = await supabase
    .from("flight_logs")
    .select("id")
    .eq("booking_id", booking_id)
    .maybeSingle();

  if (existing && existing.id) {
    return NextResponse.json({ error: "Flight log already exists for this booking." }, { status: 409 });
  }

  // Insert new flight log
  const insertPayload: Record<string, unknown> = {
    booking_id,
  };
  
  for (const key of ALLOWED_FIELDS) {
    if (key in fields) insertPayload[key] = fields[key];
  }

  const { data, error } = await supabase
    .from("flight_logs")
    .insert([insertPayload])
    .select(`
      *,
      checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
      checked_out_instructor:checked_out_instructor_id(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flight_log: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { id, ...fields } = body;
  
  if (!id) {
    return NextResponse.json({ error: "Missing flight log id" }, { status: 400 });
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {};
  
  for (const key of ALLOWED_FIELDS) {
    if (key in fields) updatePayload[key] = fields[key];
  }

  // Add updated_at timestamp
  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("flight_logs")
    .update(updatePayload)
    .eq("id", id)
    .select(`
      *,
      checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
      checked_out_instructor:checked_out_instructor_id(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flight_log: data });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id");
  const aircraftId = searchParams.get("aircraft_id");

  try {
    let query = supabase
      .from("flight_logs")
      .select(`
        *,
        checked_out_aircraft:checked_out_aircraft_id(id, registration, type),
        checked_out_instructor:checked_out_instructor_id(*),
        booking:booking_id(
          id,
          aircraft_id,
          user_id,
          instructor_id,
          start_time,
          end_time,
          purpose,
          user:user_id(first_name, last_name),
          instructor:instructor_id(
            id,
            user_id,
            users:users!instructors_user_id_fkey(first_name, last_name)
          ),
          lesson:lesson_id(name)
        )
      `);

    if (bookingId) {
      query = query.eq("booking_id", bookingId);
      const { data, error } = await query.single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ flight_log: data });
    }

    // We need to filter by aircraft through the booking relationship
    // This requires joining with bookings table first
    if (aircraftId) {
      // Use a more explicit approach - filter through booking table
      const { data: bookingIds } = await supabase
        .from("bookings")
        .select("id")
        .eq("aircraft_id", aircraftId);

      if (bookingIds && bookingIds.length > 0) {
        const ids = bookingIds.map(b => b.id);
        query = query.in("booking_id", ids);
      } else {
        // No bookings for this aircraft, return empty
        return NextResponse.json({ flight_logs: [] });
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ flight_logs: data || [] });
  } catch (error) {
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
