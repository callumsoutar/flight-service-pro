import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { 
  createFlightAuthorizationSchema, 
  authorizationStatusOptions 
} from "@/lib/validations/flight-authorization";

// GET /api/flight-authorizations - List authorizations with filtering
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const student_id = searchParams.get("student_id");
    const booking_id = searchParams.get("booking_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("flight_authorizations")
      .select(`
        *,
        booking:booking_id(*),
        student:student_id(id, first_name, last_name, email),
        aircraft:aircraft_id(id, registration, type),
        flight_type:flight_type_id(*),
        authorizing_instructor:authorizing_instructor_id(
          *,
          users:users!instructors_user_id_fkey(
            id, first_name, last_name, email
          )
        ),
        approving_instructor:approving_instructor_id(
          *,
          users:users!instructors_user_id_fkey(
            id, first_name, last_name, email
          )
        )
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status && authorizationStatusOptions.includes(status as typeof authorizationStatusOptions[number])) {
      query = query.eq("status", status);
    }
    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (booking_id) {
      query = query.eq("booking_id", booking_id);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: authorizations, error, count } = await query;

    if (error) {
      console.error("Error fetching flight authorizations:", error);
      return NextResponse.json(
        { error: "Failed to fetch flight authorizations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorizations: authorizations || [],
      count: count || 0,
      success: true
    });

  } catch (error) {
    console.error("Error in GET /api/flight-authorizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/flight-authorizations - Create new authorization
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Validate request body
    const validationResult = createFlightAuthorizationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Fetch booking to get required fields
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id, aircraft_id, flight_type_id, start_time")
      .eq("id", data.booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify user can create authorization for this booking
    if (booking.user_id !== user.id) {
      // Check if user is admin/instructor who can create on behalf of student
      const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
      if (!userRole || !['admin', 'owner', 'instructor'].includes(userRole)) {
        return NextResponse.json(
          { error: "You can only create authorizations for your own bookings" },
          { status: 403 }
        );
      }
    }

    // Check if authorization already exists for this booking
    const { data: existingAuth } = await supabase
      .from("flight_authorizations")
      .select("id")
      .eq("booking_id", data.booking_id)
      .single();

    if (existingAuth) {
      return NextResponse.json(
        { error: "Flight authorization already exists for this booking" },
        { status: 409 }
      );
    }

    // Create authorization record
    const insertData = {
      booking_id: data.booking_id,
      student_id: booking.user_id,
      aircraft_id: booking.aircraft_id,
      flight_type_id: booking.flight_type_id,
      flight_date: booking.start_time,
      purpose_of_flight: data.purpose_of_flight,
      ...(data.passenger_names && { passenger_names: data.passenger_names }),
      runway_in_use: data.runway_in_use || null,
      fuel_level_liters: data.fuel_level_liters || null,
      oil_level_quarts: data.oil_level_quarts || null,
      notams_reviewed: data.notams_reviewed || false,
      weather_briefing_complete: data.weather_briefing_complete || false,
      payment_method: data.payment_method || null,
      authorizing_instructor_id: data.authorizing_instructor_id || null,
      student_signature_data: data.student_signature_data || null,
      instructor_notes: data.instructor_notes || null,
      instructor_limitations: data.instructor_limitations || null,
      status: 'draft' as const
    };

    const { data: authorization, error: insertError } = await supabase
      .from("flight_authorizations")
      .insert([insertData])
      .select(`
        *,
        booking:booking_id(*),
        student:student_id(id, first_name, last_name, email),
        aircraft:aircraft_id(id, registration, type),
        flight_type:flight_type_id(*),
        authorizing_instructor:authorizing_instructor_id(
          *,
          users:users!instructors_user_id_fkey(
            id, first_name, last_name, email
          )
        )
      `)
      .single();

    if (insertError) {
      console.error("Error creating flight authorization:", insertError);
      return NextResponse.json(
        { error: "Failed to create flight authorization" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorization,
      success: true
    }, { status: 201 });

  } catch (error) {
    console.error("Error in POST /api/flight-authorizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
