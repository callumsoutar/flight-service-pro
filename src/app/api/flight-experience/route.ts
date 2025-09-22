import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const insertSchema = z.object({
  lesson_progress_id: z.string().uuid(),
  booking_id: z.string().uuid(),
  user_id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  experience_type_id: z.string().uuid(),
  duration_hours: z.number().positive().max(999.99),
  notes: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
});

const updateSchema = insertSchema.partial().omit({ lesson_progress_id: true, booking_id: true, user_id: true });

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const lesson_progress_id = searchParams.get("lesson_progress_id");
  const booking_id = searchParams.get("booking_id");
  const user_id = searchParams.get("user_id");
  const experience_type_id = searchParams.get("experience_type_id");
  const include_details = searchParams.get("include_details") === "true";

  let query = supabase.from("flight_experience").select(
    include_details
      ? `
        *,
        experience_type:experience_types(id, name, description),
        user:users(id, first_name, last_name),
        instructor:instructors(id, first_name, last_name),
        lesson_progress:lesson_progress(id, lesson_id, date),
        booking:bookings(id, start_time, end_time, flight_time)
      `
      : "*"
  );

  if (id) query = query.eq("id", id);
  if (lesson_progress_id) query = query.eq("lesson_progress_id", lesson_progress_id);
  if (booking_id) query = query.eq("booking_id", booking_id);
  if (user_id) query = query.eq("user_id", user_id);
  if (experience_type_id) query = query.eq("experience_type_id", experience_type_id);

  const { data, error } = await query.order("created_at", { ascending: false });
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
  const { data, error } = await supabase.from("flight_experience").insert([parse.data]).select().single();
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
  const { data, error } = await supabase.from("flight_experience").update(parse.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("flight_experience").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
