import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const aircraftId = searchParams.get("aircraft_id");
  const flightTypeId = searchParams.get("flight_type_id");

  // If both parameters are provided, get a specific rate
  if (aircraftId && flightTypeId) {
    const { data, error } = await supabase
      .from("aircraft_charge_rates")
      .select("id, aircraft_id, flight_type_id, rate_per_hour, charge_hobbs, charge_tacho, charge_airswitch")
      .eq("aircraft_id", aircraftId)
      .eq("flight_type_id", flightTypeId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ charge_rate: data });
  }

  // If only aircraft_id is provided, get all rates for that aircraft
  if (aircraftId) {
    const { data, error } = await supabase
      .from("aircraft_charge_rates")
      .select("id, aircraft_id, flight_type_id, rate_per_hour, charge_hobbs, charge_tacho, charge_airswitch")
      .eq("aircraft_id", aircraftId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rates: data || [] });
  }

  return NextResponse.json({ error: "aircraft_id is required" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await req.json();
    const { aircraft_id, flight_type_id, rate_per_hour, charge_hobbs, charge_tacho, charge_airswitch } = body;

    if (!aircraft_id || !flight_type_id || rate_per_hour == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if rate already exists for this aircraft and flight type
    const { data: existing } = await supabase
      .from("aircraft_charge_rates")
      .select("id")
      .eq("aircraft_id", aircraft_id)
      .eq("flight_type_id", flight_type_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Rate already exists for this aircraft and flight type" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("aircraft_charge_rates")
      .insert({
        aircraft_id,
        flight_type_id,
        rate_per_hour,
        charge_hobbs: charge_hobbs || false,
        charge_tacho: charge_tacho || false,
        charge_airswitch: charge_airswitch || false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rate: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await req.json();
    const { id, flight_type_id, rate_per_hour, charge_hobbs, charge_tacho, charge_airswitch } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing rate id" }, { status: 400 });
    }

    const updates: Record<string, string | number | boolean> = {};
    if (flight_type_id !== undefined) updates.flight_type_id = flight_type_id;
    if (rate_per_hour !== undefined) updates.rate_per_hour = rate_per_hour;
    if (charge_hobbs !== undefined) updates.charge_hobbs = charge_hobbs;
    if (charge_tacho !== undefined) updates.charge_tacho = charge_tacho;
    if (charge_airswitch !== undefined) updates.charge_airswitch = charge_airswitch;

    const { data, error } = await supabase
      .from("aircraft_charge_rates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rate: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing rate id" }, { status: 400 });
    }

    const { error } = await supabase
      .from("aircraft_charge_rates")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
} 