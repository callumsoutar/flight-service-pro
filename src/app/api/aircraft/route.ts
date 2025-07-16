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
  const aircraftId = searchParams.get("id");

  let query = supabase.from("aircraft").select("*").eq("organization_id", orgId); // total_time_method is included
  if (aircraftId) {
    query = query.eq("id", aircraftId);
    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ aircraft: data });
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ aircrafts: data ?? [] });
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
  const searchParams = req.nextUrl.searchParams;
  const aircraftId = searchParams.get("id");
  if (!aircraftId) {
    return NextResponse.json({ error: "No aircraft ID provided" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  // Only allow updating fields present in the body
  const allowedFields = [
    "manufacturer", "type", "year_manufactured", "registration", "capacity", "on_line", "prioritise_scheduling", "aircraft_image_url", "total_hours", "current_tach", "current_hobbs", "record_tacho", "record_hobbs", "record_airswitch", "fuel_consumption", "total_time_method"
  ];
  const updateData: Record<string, unknown> = {};
  if (typeof body === 'object' && body !== null) {
    for (const key of allowedFields) {
      if (key in body) updateData[key] = (body as Record<string, unknown>)[key];
    }
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("aircraft")
    .update(updateData)
    .eq("id", aircraftId)
    .eq("organization_id", orgId)
    .select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  let updated = data?.[0];
  if (!updated) {
    // No rows updated (could be RLS or no-op), fetch the current row
    const { data: existing, error: fetchError } = await supabase
      .from("aircraft")
      .select("*")
      .eq("id", aircraftId)
      .eq("organization_id", orgId)
      .single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: "Aircraft not found" }, { status: 404 });
    }
    // Check if any field actually changed
    let changed = false;
    for (const key of Object.keys(updateData)) {
      if (existing[key] !== updateData[key]) {
        changed = true;
        break;
      }
    }
    if (changed) {
      // RLS blocked the update
      return NextResponse.json({ error: "You do not have permission to update this aircraft." }, { status: 403 });
    }
    // No change needed (no-op update)
    updated = existing;
  }
  return NextResponse.json({ aircraft: updated });
} 