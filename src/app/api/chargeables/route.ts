import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Get search query and type filter
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() || "";
  const type = searchParams.get("type") || "";

  // Fetch chargeables (only non-voided)
  let query = supabase
    .from("chargeables")
    .select("*")
    .is("voided_at", null)
    .order("name", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,description.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ chargeables: data || [] });
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
    const { name, description, type, rate, is_active } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    if (rate === undefined || rate === null) {
      return NextResponse.json({ error: "Rate is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("chargeables")
      .insert([{
        name,
        description: description || null,
        type,
        rate: Number(rate),
        is_active: is_active ?? true
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chargeable: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, description, type, rate, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updateData: {
      name?: string;
      description?: string | null;
      type?: string;
      rate?: number;
      is_active?: boolean;
    } = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (type !== undefined) updateData.type = type;
    if (rate !== undefined) updateData.rate = Number(rate);
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from("chargeables")
      .update(updateData)
      .eq("id", id)
      .is("voided_at", null)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Chargeable not found" }, { status: 404 });
    }

    return NextResponse.json({ chargeable: data[0] });
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
  const chargeableId = searchParams.get("id");

  if (!chargeableId) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Soft delete for chargeables
  const { data, error } = await supabase
    .from("chargeables")
    .update({
      voided_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", chargeableId)
    .is("voided_at", null) // Only update if not already voided
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Chargeable not found or already deleted" }, { status: 404 });
  }

  return NextResponse.json({ chargeable: data[0] });
} 