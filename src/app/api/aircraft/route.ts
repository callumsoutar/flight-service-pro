import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  let query = supabase.from("aircraft").select(`
    *,
    aircraft_type:aircraft_type_id(id, name, category, description)
  `);

  if (id) {
    query = query.eq("id", id);
    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ aircraft: data });
  }

  const { data, error } = await query.order("registration");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ aircrafts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { data, error } = await supabase
    .from("aircraft")
    .insert([body])
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ aircraft: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { id, ...updateFields } = body;
  
  if (!id) {
    return NextResponse.json({ error: "Aircraft id is required" }, { status: 400 });
  }
  
  // Validate that we have fields to update
  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  
  // Validate meter readings if they're being updated
  if (updateFields.current_hobbs !== undefined) {
    const hobbsValue = Number(updateFields.current_hobbs);
    if (isNaN(hobbsValue) || hobbsValue < 0) {
      return NextResponse.json({ error: "Invalid Hobbs reading - must be a positive number" }, { status: 400 });
    }
    updateFields.current_hobbs = hobbsValue;
  }
  
  if (updateFields.current_tach !== undefined) {
    const tachValue = Number(updateFields.current_tach);
    if (isNaN(tachValue) || tachValue < 0) {
      return NextResponse.json({ error: "Invalid Tacho reading - must be a positive number" }, { status: 400 });
    }
    updateFields.current_tach = tachValue;
  }
  
  console.log('Updating aircraft:', { id, updateFields });
  
  const { error } = await supabase
    .from("aircraft")
    .update(updateFields)
    .eq("id", id);
    
  if (error) {
    console.error('Aircraft update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Fetch and return the updated aircraft
  const { data: updatedAircraft, error: fetchError } = await supabase
    .from("aircraft")
    .select("*")
    .eq("id", id)
    .single();
    
  if (fetchError) {
    console.error('Aircraft fetch error:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  
  console.log('Aircraft updated successfully:', { id, current_hobbs: updatedAircraft.current_hobbs, current_tach: updatedAircraft.current_tach });
  return NextResponse.json({ aircraft: updatedAircraft });
} 