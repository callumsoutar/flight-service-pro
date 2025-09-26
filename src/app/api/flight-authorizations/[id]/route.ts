import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { updateFlightAuthorizationSchema } from "@/lib/validations/flight-authorization";

// GET /api/flight-authorizations/[id] - Get specific authorization
export async function GET(
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
    const { data: authorization, error } = await supabase
      .from("flight_authorizations")
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
      .eq("id", authorizationId)
      .single();

    if (error || !authorization) {
      return NextResponse.json(
        { error: "Flight authorization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      authorization,
      success: true
    });

  } catch (error) {
    console.error("Error in GET /api/flight-authorizations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/flight-authorizations/[id] - Update authorization
export async function PATCH(
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
    const body = await req.json();
    
    // Validate request body
    const validationResult = updateFlightAuthorizationSchema.safeParse({
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...updateData } = validationResult.data;

    console.log('Updating flight authorization:', authorizationId, 'with data:', updateData);

    // Check if authorization exists and user has permission
    const { data: existingAuth, error: fetchError } = await supabase
      .from("flight_authorizations")
      .select("id, student_id, status")
      .eq("id", authorizationId)
      .single();

    if (fetchError || !existingAuth) {
      return NextResponse.json(
        { error: "Flight authorization not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (existingAuth.student_id !== user.id) {
      // Check if user is admin/instructor
      const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
      if (!userRole || !['admin', 'owner', 'instructor'].includes(userRole)) {
        return NextResponse.json(
          { error: "You can only update your own authorizations" },
          { status: 403 }
        );
      }
    }

    // Prevent students from updating approved authorizations (but allow updating rejected ones for resubmission)
    if (existingAuth.student_id === user.id && existingAuth.status === 'approved') {
      return NextResponse.json(
        { error: "Cannot update approved authorizations" },
        { status: 403 }
      );
    }

    // Update authorization
    const { data: authorization, error: updateError } = await supabase
      .from("flight_authorizations")
      .update({
        ...updateData,
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
      console.error("Error updating flight authorization:", updateError);
      return NextResponse.json(
        { error: "Failed to update flight authorization" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorization,
      success: true
    });

  } catch (error) {
    console.error("Error in PATCH /api/flight-authorizations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/flight-authorizations/[id] - Delete authorization
export async function DELETE(
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
    // Check if authorization exists and user has permission
    const { data: existingAuth, error: fetchError } = await supabase
      .from("flight_authorizations")
      .select("id, student_id, status")
      .eq("id", authorizationId)
      .single();

    if (fetchError || !existingAuth) {
      return NextResponse.json(
        { error: "Flight authorization not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (existingAuth.student_id !== user.id) {
      // Check if user is admin
      const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
      if (!userRole || !['admin', 'owner'].includes(userRole)) {
        return NextResponse.json(
          { error: "You can only delete your own authorizations" },
          { status: 403 }
        );
      }
    }

    // Prevent deletion of approved authorizations
    if (existingAuth.status === 'approved') {
      return NextResponse.json(
        { error: "Cannot delete approved authorizations" },
        { status: 403 }
      );
    }

    // Delete authorization
    const { error: deleteError } = await supabase
      .from("flight_authorizations")
      .delete()
      .eq("id", authorizationId);

    if (deleteError) {
      console.error("Error deleting flight authorization:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete flight authorization" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Flight authorization deleted successfully"
    });

  } catch (error) {
    console.error("Error in DELETE /api/flight-authorizations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
