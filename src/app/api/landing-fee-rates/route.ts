import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const chargeable_id = searchParams.get("chargeable_id");

  let query = supabase
    .from("landing_fee_rates")
    .select("*")
    .order("created_at", { ascending: true });

  if (chargeable_id) {
    query = query.eq("chargeable_id", chargeable_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ landing_fee_rates: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { chargeable_id, aircraft_type_id, rate } = body;

    if (!chargeable_id || !aircraft_type_id || rate === undefined || rate === null) {
      return NextResponse.json(
        { error: "chargeable_id, aircraft_type_id, and rate are required" },
        { status: 400 }
      );
    }

    // Verify the chargeable is a landing fee
    const { data: chargeable } = await supabase
      .from("chargeables")
      .select("type")
      .eq("id", chargeable_id)
      .single();

    if (!chargeable || chargeable.type !== "landing_fee") {
      return NextResponse.json(
        { error: "Chargeable must be of type 'landing_fee'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("landing_fee_rates")
      .insert([{
        chargeable_id,
        aircraft_type_id,
        rate: Number(rate),
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ landing_fee_rate: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, chargeable_id, aircraft_type_id, rate } = body;

    // Support updating by id OR by (chargeable_id, aircraft_type_id)
    if (!id && (!chargeable_id || !aircraft_type_id)) {
      return NextResponse.json(
        { error: "Either id OR (chargeable_id and aircraft_type_id) are required" },
        { status: 400 }
      );
    }

    if (rate === undefined || rate === null) {
      return NextResponse.json({ error: "Rate is required" }, { status: 400 });
    }

    let query = supabase
      .from("landing_fee_rates")
      .update({ rate: Number(rate) });

    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.eq("chargeable_id", chargeable_id).eq("aircraft_type_id", aircraft_type_id);
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Landing fee rate not found" }, { status: 404 });
    }

    return NextResponse.json({ landing_fee_rate: data[0] });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const chargeable_id = searchParams.get("chargeable_id");
  const aircraft_type_id = searchParams.get("aircraft_type_id");

  if (!id && (!chargeable_id || !aircraft_type_id)) {
    return NextResponse.json(
      { error: "Either id OR (chargeable_id and aircraft_type_id) are required" },
      { status: 400 }
    );
  }

  let query = supabase.from("landing_fee_rates").delete();

  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.eq("chargeable_id", chargeable_id!).eq("aircraft_type_id", aircraft_type_id!);
  }

  const { data, error } = await query.select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Landing fee rate not found" }, { status: 404 });
  }

  return NextResponse.json({ landing_fee_rate: data[0] });
}
