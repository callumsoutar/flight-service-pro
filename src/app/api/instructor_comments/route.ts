import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";

const InstructorCommentSchema = z.object({
  booking_id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  student_id: z.string().uuid().nullable().optional(),
  comment: z.string().min(1, "Comment cannot be empty"),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id");
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("instructor_comments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = InstructorCommentSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("instructor_comments")
    .insert([parse.data])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...update } = body;
  if (!id) {
    return NextResponse.json({ error: "Missing instructor comment id" }, { status: 400 });
  }
  const parse = InstructorCommentSchema.partial().safeParse(update);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("instructor_comments")
    .update(parse.data)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Instructor comment not found" }, { status: 404 });
  }
  return NextResponse.json(data, { status: 200 });
} 