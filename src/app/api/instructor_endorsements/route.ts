import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const instructorEndorsementSchema = z.object({
  instructor_id: z.string().uuid(),
  endorsement_id: z.string().uuid(),
  granted_at: z.string().datetime().optional(),
});

// GET: List all instructor endorsements for an instructor
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const instructorId = searchParams.get("instructor_id");
  if (!instructorId) return NextResponse.json({ instructor_endorsements: [], error: "Missing instructor_id" }, { status: 400 });
  const { data, error } = await supabase
    .from("instructor_endorsements")
    .select("*")
    .eq("instructor_id", instructorId);
  if (error) return NextResponse.json({ instructor_endorsements: [], error: error.message }, { status: 500 });
  return NextResponse.json({ instructor_endorsements: data ?? [] });
}

// POST: Create a new instructor endorsement
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = instructorEndorsementSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("instructor_endorsements")
    .insert([{
      ...parse.data,
      granted_at: parse.data.granted_at || new Date().toISOString(),
    }])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instructor_endorsement: data });
}

// DELETE: Remove an instructor endorsement by id
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase
    .from("instructor_endorsements")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 