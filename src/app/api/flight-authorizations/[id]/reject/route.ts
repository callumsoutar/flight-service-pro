import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { rejectFlightAuthorizationSchema } from "@/lib/validations/flight-authorization";

// POST /api/flight-authorizations/[id]/reject - Reject authorization (instructors only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: authorizationId } = await params;
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is instructor/admin
    const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      return NextResponse.json(
        { error: "Only instructors can reject flight authorizations" },
        { status: 403 }
      );
    }

    // Get instructor record if user is instructor
    let instructorId = null;
    if (userRole === 'instructor') {
      const { data: instructor } = await supabase
        .from("instructors")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (instructor) {
        instructorId = instructor.id;
      }
    }

    const body = await req.json();
    
    // Validate request body
    const validationResult = rejectFlightAuthorizationSchema.safeParse({
      id: authorizationId,
      ...body
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { rejection_reason } = validationResult.data;

    // Get the current authorization
    const { data: authorization, error: fetchError } = await supabase
      .from("flight_authorizations")
      .select("id, status, student_id")
      .eq("id", authorizationId)
      .single();

    if (fetchError || !authorization) {
      return NextResponse.json(
        { error: "Flight authorization not found" },
        { status: 404 }
      );
    }

    // Check current status - can only reject pending authorizations
    if (authorization.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot reject authorization with status: ${authorization.status}` },
        { status: 400 }
      );
    }

    // Update authorization to rejected
    const { data: updatedAuth, error: updateError } = await supabase
      .from("flight_authorizations")
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason,
        approving_instructor_id: instructorId,
        updated_at: new Date().toISOString()
      })
      .eq("id", authorizationId)
      .select(`
        *,
        booking:booking_id(*),
        student:student_id(id, first_name, last_name, email),
        aircraft:aircraft_id(id, registration, type),
        flight_type:flight_type_id(*),
        authorizing_instructor:authorizing_instructor_id(
          *,
          users:users!instructors_user_id_fkey(
            id, first_name, last_name, email
          )
        ),
        approving_instructor:approving_instructor_id(
          *,
          users:users!instructors_user_id_fkey(
            id, first_name, last_name, email
          )
        )
      `)
      .single();

    if (updateError) {
      console.error("Error rejecting flight authorization:", updateError);
      return NextResponse.json(
        { error: "Failed to reject flight authorization" },
        { status: 500 }
      );
    }

    // TODO: In the future, send notification to student about rejection
    // This could be done via email, in-app notifications, etc.

    return NextResponse.json({
      authorization: updatedAuth,
      success: true,
      message: "Flight authorization rejected"
    });

  } catch (error) {
    console.error("Error in POST /api/flight-authorizations/[id]/reject:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
