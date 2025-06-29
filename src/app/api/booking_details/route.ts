import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

// GET /api/booking_details?booking_id=...
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const bookingId = req.nextUrl.searchParams.get("booking_id");
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("booking_details")
    .select("*")
    .eq("booking_id", bookingId)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

// PATCH /api/booking_details
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, booking_id, ...fields } = body;
  if (!id && !booking_id) {
    return NextResponse.json({ error: "Missing id or booking_id" }, { status: 400 });
  }
  // Find the record by id or booking_id
  const match = id ? { id } : { booking_id };
  const { error } = await supabase
    .from("booking_details")
    .update(fields)
    .match(match);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
} 