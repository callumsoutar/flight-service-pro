import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const aircraftId = searchParams.get("aircraft_id");
  const flightTypeId = searchParams.get("flight_type_id");

  if (!aircraftId || !flightTypeId) {
    return NextResponse.json({ error: "Missing aircraft_id or flight_type_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("aircraft_charge_rates")
    .select("id, aircraft_id, flight_type_id, rate_per_hour, charge_hobbs, charge_tacho")
    .eq("aircraft_id", aircraftId)
    .eq("flight_type_id", flightTypeId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ charge_rate: data });
} 