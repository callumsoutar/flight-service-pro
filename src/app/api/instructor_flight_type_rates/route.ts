import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const rateSchema = z.object({
  instructor_id: z.string().uuid(),
  flight_type_id: z.string().uuid(),
  rate: z.number().min(0),
  currency: z.string().min(1).optional(),
  effective_from: z.string().min(1).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const instructor_id = searchParams.get("instructor_id");
  const flight_type_id = searchParams.get("flight_type_id");

  let query = supabase
    .from("instructor_flight_type_rates")
    .select("*");
  if (instructor_id) query = query.eq("instructor_id", instructor_id);
  if (flight_type_id) query = query.eq("flight_type_id", flight_type_id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // If both are provided, return a single rate (or null)
  if (instructor_id && flight_type_id) {
    return NextResponse.json({ rate: data?.[0] || null }, { status: 200 });
  }
  // Otherwise, return all rates (optionally filtered)
  return NextResponse.json({ rates: data }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = rateSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("instructor_flight_type_rates")
    .insert([parse.data])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rate: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...update } = body;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const parse = rateSchema.partial().safeParse(update);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("instructor_flight_type_rates")
    .update({ ...parse.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ rate: data }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const { error } = await supabase
    .from("instructor_flight_type_rates")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
} 