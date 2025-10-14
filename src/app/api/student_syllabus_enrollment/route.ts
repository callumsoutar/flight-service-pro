import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const insertSchema = z.object({
  user_id: z.string().uuid(),
  syllabus_id: z.string().uuid(),
  enrolled_at: z.string().optional(),
  completed_at: z.string().nullable().optional(),
  status: z.string().optional(),
  primary_instructor_id: z.string().uuid().nullable().optional(),
  aircraft_type: z.string().uuid().nullable().optional(),
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
  const user_id = searchParams.get("user_id");
  const syllabus_id = searchParams.get("syllabus_id");

  // STEP 3: Resource-level authorization
  // Instructors+ can view all enrollments, members/students can only view their own
  const isPrivileged = ['instructor', 'admin', 'owner'].includes(userRole);

  let query = supabase.from("student_syllabus_enrollment").select(`
    *,
    aircraft_type_details:aircraft_type(id, name, category, description)
  `);
  if (id) query = query.eq("id", id);
  if (syllabus_id) query = query.eq("syllabus_id", syllabus_id);

  // If user_id is specified, check if user can access it
  if (user_id) {
    if (!isPrivileged && user_id !== user.id) {
      return NextResponse.json({
        error: 'Forbidden: Cannot access other users\' enrollments'
      }, { status: 403 });
    }
    query = query.eq("user_id", user_id);
  } else if (!isPrivileged) {
    // Non-privileged users can only see their own enrollments
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

  // STEP 2: Authorization - Only instructors+ can enroll students in syllabi
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Enrolling students requires instructor, admin, or owner role'
    }, { status: 403 });
  }

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

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Only instructors+ can update enrollments
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Updating enrollments requires instructor, admin, or owner role'
    }, { status: 403 });
  }

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

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Only admin/owner can delete enrollments (sensitive training data)
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Deleting enrollments requires admin or owner role'
    }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("student_syllabus_enrollment").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 