import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const aircraft_id = searchParams.get("aircraft_id");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");

  if (!user_id && !aircraft_id) {
    return NextResponse.json({ error: "Either user_id or aircraft_id is required" }, { status: 400 });
  }

  try {
    let query = supabase
      .from("flight_history_view")
      .select("*");

    // Filter by user_id or aircraft_id
    if (user_id) {
      query = query.eq("user_id", user_id);
    } else if (aircraft_id) {
      query = query.eq("aircraft_id", aircraft_id);
    }

    // Apply date filters if provided
    if (date_from) {
      query = query.gte("actual_end", date_from);
    }
    if (date_to) {
      query = query.lte("actual_end", date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching flight history:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flight_history: data || [] });
  } catch (error) {
    console.error("Error in flight history API:", error);
    return NextResponse.json(
      { error: "Failed to fetch flight history" },
      { status: 500 }
    );
  }
}
