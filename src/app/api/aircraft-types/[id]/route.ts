import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import type { AircraftTypeUpdate } from "@/types/aircraft_types";

// GET /api/aircraft-types/[id] - Get single aircraft type
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
      .from("aircraft_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ aircraft_type: data });
  } catch (error) {
    console.error("Error fetching aircraft type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/aircraft-types/[id] - Update aircraft type
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
    const body: AircraftTypeUpdate = await req.json();
    
    // Build update object (only include non-undefined fields)
    const updateData: Record<string, string | number | null> = {};
    if (body.name !== undefined) {
      if (!body.name || body.name.trim() === "") {
        return NextResponse.json({ error: "Aircraft type name cannot be empty" }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }
    if (body.category !== undefined) {
      updateData.category = body.category?.trim() || null;
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("aircraft_types")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json({ error: "Aircraft type name already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ aircraft_type: data });
  } catch (error) {
    console.error("Error updating aircraft type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/aircraft-types/[id] - Delete aircraft type
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
    // Check if any aircraft are using this type
    const { count: aircraftCount } = await supabase
      .from("aircraft")
      .select("*", { count: "exact", head: true })
      .eq("aircraft_type_id", id);

    if (aircraftCount && aircraftCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete aircraft type: ${aircraftCount} aircraft are currently using this type` 
      }, { status: 409 });
    }

    // Check if any instructor ratings exist for this type
    const { count: ratingCount } = await supabase
      .from("instructor_aircraft_ratings")
      .select("*", { count: "exact", head: true })
      .eq("aircraft_type_id", id);

    if (ratingCount && ratingCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete aircraft type: ${ratingCount} instructor ratings exist for this type` 
      }, { status: 409 });
    }

    const { error } = await supabase
      .from("aircraft_types")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting aircraft type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
