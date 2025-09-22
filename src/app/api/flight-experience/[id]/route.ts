import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const updateSchema = z.object({
  experience_type_id: z.string().uuid().optional(),
  duration_hours: z.number().positive().max(999.99).optional(),
  notes: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const include_details = searchParams.get("include_details") === "true";

  const { data, error } = await supabase
    .from("flight_experience")
    .select(
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
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await req.json();
  const parse = updateSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("flight_experience")
    .update(parse.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("flight_experience")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
