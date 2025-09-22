import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import type { InstructorAircraftRatingUpdate } from "@/types/instructor_aircraft_ratings";

// GET /api/instructor-aircraft-ratings/[id] - Get single instructor aircraft rating
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
  } catch (error) {
    console.error("Error fetching instructor aircraft rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/instructor-aircraft-ratings/[id] - Update instructor aircraft rating
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: InstructorAircraftRatingUpdate = await req.json();
    
    // Build update object (only include non-undefined fields)
    const updateData: Record<string, string | null> = {};
    if (body.certified_date !== undefined) {
      updateData.certified_date = body.certified_date;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }


    const { data, error } = await supabase
      .from("instructor_aircraft_ratings")
      .update(updateData)
      .eq("id", id)
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rating: data });
  } catch (error) {
    console.error("Error updating instructor aircraft rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/instructor-aircraft-ratings/[id] - Delete instructor aircraft rating
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from("instructor_aircraft_ratings")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting instructor aircraft rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
