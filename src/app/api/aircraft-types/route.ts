import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import type { AircraftType, AircraftTypeInsert } from "@/types/aircraft_types";

// GET /api/aircraft-types - List all aircraft types
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization check - aircraft types are operational data
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  // Instructors and above can view aircraft types for operational purposes
  const isPrivilegedUser = userRole && ['instructor', 'admin', 'owner'].includes(userRole);

  if (!isPrivilegedUser) {
    return NextResponse.json({ 
      error: 'Forbidden: Aircraft types access requires instructor role or above' 
    }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const includeStats = searchParams.get("include_stats") === "true";
    const id = searchParams.get("id");

    if (id) {
      // Get single aircraft type
      const query = supabase
        .from("aircraft_types")
        .select("*")
        .eq("id", id);

      const { data, error } = await query.single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ aircraft_type: data });
    }

    // Get all aircraft types
    const query = supabase
      .from("aircraft_types")
      .select("*")
      .order("name");

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let result = data || [];

    // Add stats if requested
    if (includeStats && data) {
      const enrichedData = await Promise.all(
        data.map(async (type: AircraftType) => {
          // Count aircraft of this type
          const { count: aircraftCount } = await supabase
            .from("aircraft")
            .select("*", { count: "exact", head: true })
            .eq("aircraft_type_id", type.id);

          // Count instructors with ratings for this type
          const { count: instructorCount } = await supabase
            .from("instructor_aircraft_ratings")
            .select("*", { count: "exact", head: true })
            .eq("aircraft_type_id", type.id);

          return {
            ...type,
            aircraft_count: aircraftCount || 0,
            instructor_count: instructorCount || 0,
          };
        })
      );
      result = enrichedData;
    }

    return NextResponse.json({ aircraft_types: result });
  } catch (error) {
    console.error("Error in /api/aircraft-types:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/aircraft-types - Create new aircraft type
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization check - only admin/owner can create aircraft types
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  const isPrivileged = userRole && ['admin', 'owner'].includes(userRole);

  if (!isPrivileged) {
    return NextResponse.json({ 
      error: 'Forbidden: Aircraft type creation requires admin or owner role' 
    }, { status: 403 });
  }

  try {
    const body: AircraftTypeInsert = await req.json();
    
    // Validation
    if (!body.name || body.name.trim() === "") {
      return NextResponse.json({ error: "Aircraft type name is required" }, { status: 400 });
    }

    const insertData: AircraftTypeInsert = {
      name: body.name.trim(),
      category: body.category?.trim() || null,
      description: body.description?.trim() || null,
    };

    const { data, error } = await supabase
      .from("aircraft_types")
      .insert([insertData])
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json({ error: "Aircraft type name already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ aircraft_type: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating aircraft type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
