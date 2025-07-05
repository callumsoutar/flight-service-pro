import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

// TODO: Enforce RLS/auth for all operations

const insertSchema = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  syllabus_id: z.string().uuid(),
  enrolled_at: z.string().optional(),
  completed_at: z.string().nullable().optional(),
  status: z.string().optional(),
  primary_instructor_id: z.string().uuid().nullable().optional(),
});

const updateSchema = insertSchema.partial();

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const user_id = searchParams.get("user_id");
  const syllabus_id = searchParams.get("syllabus_id");

  let query = supabase.from("student_syllabus_enrollment").select("*");
  if (id) query = query.eq("id", id);
  if (user_id) query = query.eq("user_id", user_id);
  if (syllabus_id) query = query.eq("syllabus_id", syllabus_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = insertSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase.from("student_syllabus_enrollment").insert([parse.data]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parse = updateSchema.safeParse(rest);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase.from("student_syllabus_enrollment").update(parse.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("student_syllabus_enrollment").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 