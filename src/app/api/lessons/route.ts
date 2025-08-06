import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const insertSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  syllabus_id: z.string().uuid("Valid syllabus ID is required"),
  order: z.number().int().positive().optional(),
  is_required: z.boolean().optional(),
  syllabus_stage: z.enum([
    'basic syllabus',
    'advances syllabus', 
    'circuit training',
    'terrain and weather awareness',
    'instrument flying and flight test revision'
  ]).nullable().optional(),
});

const updateSchema = insertSchema.partial().extend({
  id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const searchParams = req.nextUrl.searchParams;
  const lessonId = searchParams.get("id");
  const syllabusId = searchParams.get("syllabus_id");

  let query = supabase
    .from("lessons")
    .select("*")
    .order("order", { ascending: true });

  if (lessonId) {
    query = query.eq("id", lessonId);
    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ lesson: data });
  }

  if (syllabusId) {
    query = query.eq("syllabus_id", syllabusId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ lessons: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parse = insertSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  // If no order provided, set to next available
  if (!parse.data.order) {
    const { data: existingLessons } = await supabase
      .from("lessons")
      .select("order")
      .eq("syllabus_id", parse.data.syllabus_id)
      .order("order", { ascending: false })
      .limit(1);
    
    parse.data.order = existingLessons?.[0]?.order ? existingLessons[0].order + 1 : 1;
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert([parse.data])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lesson: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...rest } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing lesson ID" }, { status: 400 });
  }

  const parse = updateSchema.safeParse(rest);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lessons")
    .update(parse.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lesson: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Missing lesson ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 