import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const insertSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(['pass', 'not yet competent']),
  attempt: z.number().optional(),
  syllabus_id: z.string().uuid().nullable().optional(),
  lesson_id: z.string().uuid().nullable().optional(),
  booking_id: z.string().uuid().nullable().optional(),
  instructor_comments: z.string().nullable().optional(),
  instructor_id: z.string().uuid().nullable().optional(),
  date: z.string().optional(),
  lesson_highlights: z.string().nullable().optional(),
  areas_for_improvement: z.string().nullable().optional(),
  airmanship: z.string().nullable().optional(),
  focus_next_lesson: z.string().nullable().optional(),
  weather_conditions: z.string().nullable().optional(),
  safety_concerns: z.string().nullable().optional(),
});

const updateSchema = insertSchema.partial();

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Role check
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole) {
    return NextResponse.json({
      error: 'Forbidden: Access requires a valid role'
    }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const booking_id = searchParams.get("booking_id");
  const user_id = searchParams.get("user_id");

  // STEP 3: Resource-level authorization
  // Instructors+ can view all progress, members/students can only view their own
  const isPrivileged = ['instructor', 'admin', 'owner'].includes(userRole);

  let query = supabase.from("lesson_progress").select("*");
  if (id) query = query.eq("id", id);
  if (booking_id) query = query.eq("booking_id", booking_id);

  // If user_id is specified, check if user can access it
  if (user_id) {
    if (!isPrivileged && user_id !== user.id) {
      return NextResponse.json({
        error: 'Forbidden: Cannot access other users\' progress'
      }, { status: 403 });
    }
    query = query.eq("user_id", user_id);
  } else if (!isPrivileged) {
    // Non-privileged users can only see their own progress
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Only instructors+ can create lesson progress records
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Creating lesson progress requires instructor, admin, or owner role'
    }, { status: 403 });
  }

  const body = await req.json();
  const parse = insertSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase.from("lesson_progress").insert([parse.data]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Only instructors+ can update lesson progress
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Updating lesson progress requires instructor, admin, or owner role'
    }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parse = updateSchema.safeParse(rest);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase.from("lesson_progress").update(parse.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Only admin/owner can delete lesson progress (sensitive training records)
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Deleting lesson progress requires admin or owner role'
    }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("lesson_progress").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 