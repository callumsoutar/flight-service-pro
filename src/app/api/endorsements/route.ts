import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const endorsementSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// GET: List all endorsements (excluding voided)
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("endorsements")
    .select("*")
    .is("voided_at", null);
  if (error) return NextResponse.json({ endorsements: [], error: error.message }, { status: 500 });
  return NextResponse.json({ endorsements: data ?? [] });
}

// POST: Create a new endorsement
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = endorsementSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("endorsements")
    .insert([parse.data])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ endorsement: data });
}

// PUT: Update an endorsement
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const parse = endorsementSchema.safeParse(updateData);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("endorsements")
    .update(parse.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ endorsement: data });
}

// DELETE: Soft delete an endorsement (set voided_at)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("endorsements")
    .update({ voided_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}