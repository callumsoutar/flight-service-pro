import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";

const InstructorCommentSchema = z.object({
  booking_id: z.string().uuid(),
  instructor_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(), // Allow user_id as alternative to instructor_id
  student_id: z.string().uuid().nullable().optional(),
  comment: z.string().min(1, "Comment cannot be empty"),
}).refine((data) => data.instructor_id || data.user_id, {
  message: "Either instructor_id or user_id must be provided",
});

const InstructorCommentUpdateSchema = z.object({
  booking_id: z.string().uuid().optional(),
  instructor_id: z.string().uuid().optional(),
  student_id: z.string().uuid().nullable().optional(),
  comment: z.string().min(1, "Comment cannot be empty").optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // STEP 2: Authorization - Role check
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id");
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }

  // STEP 3: Resource-level authorization - check booking ownership
  const { data: booking } = await supabase
    .from("bookings")
    .select("user_id")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Users can view comments on their own bookings, instructors+ can view any
  const isPrivileged = userRole && ['instructor', 'admin', 'owner'].includes(userRole);
  const isOwnBooking = booking.user_id === user.id;

  if (!isPrivileged && !isOwnBooking) {
    return NextResponse.json({
      error: 'Forbidden: You can only view comments on your own bookings'
    }, { status: 403 });
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

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // STEP 2: Authorization - Only instructors and above can create comments
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Creating instructor comments requires instructor, admin, or owner role'
    }, { status: 403 });
  }

  const body = await req.json();
  const parse = InstructorCommentSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  let instructorId = parse.data.instructor_id;

  // If user_id is provided instead of instructor_id, lookup the instructor_id
  if (parse.data.user_id && !instructorId) {
    const { data: instructorData, error: instructorError } = await supabase
      .from("instructors")
      .select("id")
      .eq("user_id", parse.data.user_id)
      .single();

    if (instructorError || !instructorData) {
      return NextResponse.json({
        error: "User is not registered as an instructor"
      }, { status: 400 });
    }

    instructorId = instructorData.id;
  }

  const insertData = {
    booking_id: parse.data.booking_id,
    instructor_id: instructorId,
    student_id: parse.data.student_id,
    comment: parse.data.comment,
  };

  const { data, error } = await supabase
    .from("instructor_comments")
    .insert([insertData])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // STEP 2: Authorization - Only instructors and above can update comments
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Updating instructor comments requires instructor, admin, or owner role'
    }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...update } = body;
  if (!id) {
    return NextResponse.json({ error: "Missing instructor comment id" }, { status: 400 });
  }
  const parse = InstructorCommentUpdateSchema.safeParse(update);
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