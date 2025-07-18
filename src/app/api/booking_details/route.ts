import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

const ALLOWED_FIELDS = [
  "eta", "passengers", "route", "equipment", "remarks", "authorization_completed", "override_conflict", "actual_start", "actual_end", "fuel_on_board"
];

export async function POST(req: NextRequest) {
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
  const body = await req.json();
  const { booking_id, ...fields } = body;
  if (!booking_id) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }
  // Check for existing record
  const { data: existing } = await supabase
    .from("booking_details")
    .select("id")
    .eq("booking_id", booking_id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (existing && existing.id) {
    return NextResponse.json({ error: "Booking details already exist for this booking." }, { status: 409 });
  }
  // Insert new record
  const insertPayload: Record<string, unknown> = {
    booking_id,
    organization_id: orgId,
  };
  for (const key of ALLOWED_FIELDS) {
    if (key in fields) insertPayload[key] = fields[key];
  }
  const { data, error } = await supabase
    .from("booking_details")
    .insert([insertPayload])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ booking_details: data });
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
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) {
    return NextResponse.json({ error: "Missing booking_details id" }, { status: 400 });
  }
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in fields) updates[key] = fields[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  const { error } = await supabase
    .from("booking_details")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Return updated record
  const { data: updated, error: fetchError } = await supabase
    .from("booking_details")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (fetchError || !updated) {
    return NextResponse.json({ error: "Booking details not found" }, { status: 404 });
  }
  return NextResponse.json({ booking_details: updated });
} 