import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import type { InstructorAircraftRatingInsert } from "@/types/instructor_aircraft_ratings";

// GET /api/instructor-aircraft-ratings - List instructor aircraft ratings
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const instructor_id = searchParams.get("instructor_id");
    const aircraft_type_id = searchParams.get("aircraft_type_id");
    const id = searchParams.get("id");

    if (id) {
      // Get single rating
      const { data, error } = await supabase
        .from("instructor_aircraft_ratings")
        .select(`
          *,
          instructor:instructor_id(
            *,
            user:user_id(id, first_name, last_name, email)
          ),
          aircraft_type:aircraft_type_id(*)
        `)
        .eq("id", id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ rating: data });
    }

    // Build query for multiple ratings
    let query = supabase
      .from("instructor_aircraft_ratings")
      .select(`
        *,
        instructor:instructor_id(
          *,
          user:user_id(id, first_name, last_name, email)
        ),
        aircraft_type:aircraft_type_id(*)
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (instructor_id) {
      query = query.eq("instructor_id", instructor_id);
    }
    if (aircraft_type_id) {
      query = query.eq("aircraft_type_id", aircraft_type_id);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ratings: data || [] });
  } catch (error) {
    console.error("Error in /api/instructor-aircraft-ratings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/instructor-aircraft-ratings - Create new instructor aircraft rating
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // STEP 2: Authorization - Role check (only admin/owner can create ratings)
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Creating instructor aircraft ratings requires admin or owner role'
    }, { status: 403 });
  }

  try {
    const body: InstructorAircraftRatingInsert = await req.json();
    
    // Validation
    if (!body.instructor_id || !body.aircraft_type_id) {
      return NextResponse.json({ 
        error: "instructor_id and aircraft_type_id are required" 
      }, { status: 400 });
    }

    // Validate that instructor exists
    const { data: instructor, error: instructorError } = await supabase
      .from("instructors")
      .select("id")
      .eq("id", body.instructor_id)
      .single();

    if (instructorError || !instructor) {
      return NextResponse.json({ error: "Instructor not found" }, { status: 404 });
    }

    // Validate that aircraft type exists
    const { data: aircraftType, error: aircraftTypeError } = await supabase
      .from("aircraft_types")
      .select("id")
      .eq("id", body.aircraft_type_id)
      .single();

    if (aircraftTypeError || !aircraftType) {
      return NextResponse.json({ error: "Aircraft type not found" }, { status: 404 });
    }


    const insertData: InstructorAircraftRatingInsert = {
      instructor_id: body.instructor_id,
      aircraft_type_id: body.aircraft_type_id,
      certified_date: body.certified_date || null,
      notes: body.notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from("instructor_aircraft_ratings")
      .insert([insertData])
      .select(`
        *,
        instructor:instructor_id(
          *,
          user:user_id(id, first_name, last_name, email)
        ),
        aircraft_type:aircraft_type_id(*)
      `)
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json({ 
          error: "Instructor already has a rating for this aircraft type" 
        }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rating: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating instructor aircraft rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
