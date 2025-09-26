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
  const flightTypeId = searchParams.get("id");

  let query = supabase.from("flight_types").select("*").is("voided_at", null);
  if (flightTypeId) {
    query = query.eq("id", flightTypeId);
    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ flight_type: data });
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ flight_types: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, instruction_type, is_active } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (instruction_type && !['dual', 'solo', 'trial'].includes(instruction_type)) {
      return NextResponse.json({ error: "Invalid instruction type" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("flight_types")
      .insert([{
        name,
        description: description || null,
        instruction_type: instruction_type || null,
        is_active: is_active ?? true
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flight_type: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, description, instruction_type, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (instruction_type && !['dual', 'solo', 'trial'].includes(instruction_type)) {
      return NextResponse.json({ error: "Invalid instruction type" }, { status: 400 });
    }

    // Check if the record exists and is not voided
    const { data: existingRecord, error: fetchError } = await supabase
      .from("flight_types")
      .select("voided_at")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Flight type not found" }, { status: 404 });
    }

    if (existingRecord.voided_at) {
      return NextResponse.json({ error: "Cannot update voided flight type" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("flight_types")
      .update({
        name,
        description: description || null,
        instruction_type: instruction_type || null,
        is_active: is_active ?? true
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flight_type: data });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const flightTypeId = searchParams.get("id");

  if (!flightTypeId) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Check if the record exists and is not already voided
  const { data: existingRecord, error: fetchError } = await supabase
    .from("flight_types")
    .select("voided_at")
    .eq("id", flightTypeId)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: "Flight type not found" }, { status: 404 });
  }

  if (existingRecord.voided_at) {
    return NextResponse.json({ error: "Flight type is already voided" }, { status: 400 });
  }

  // Soft delete by setting voided_at timestamp
  const { data, error } = await supabase
    .from("flight_types")
    .update({ voided_at: new Date().toISOString() })
    .eq("id", flightTypeId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flight_type: data });
} 