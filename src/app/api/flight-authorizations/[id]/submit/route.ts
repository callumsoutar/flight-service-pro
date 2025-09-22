import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { flightAuthorizationFormSchema } from "@/lib/validations/flight-authorization";

// POST /api/flight-authorizations/[id]/submit - Submit authorization for approval
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
    // Get the current authorization
    const { data: authorization, error: fetchError } = await supabase
      .from("flight_authorizations")
      .select("*")
      .eq("id", authorizationId)
      .single();

    if (fetchError || !authorization) {
      return NextResponse.json(
        { error: "Flight authorization not found" },
        { status: 404 }
      );
    }

    // Check permissions - only student or admin can submit
    if (authorization.student_id !== user.id) {
      const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
      if (!userRole || !['admin', 'owner'].includes(userRole)) {
        return NextResponse.json(
          { error: "You can only submit your own authorizations" },
          { status: 403 }
        );
      }
    }

    // Check current status - can only submit draft or rejected authorizations
    if (!['draft', 'rejected'].includes(authorization.status)) {
      return NextResponse.json(
        { error: `Cannot submit authorization with status: ${authorization.status}` },
        { status: 400 }
      );
    }

    // Validate that all required fields are filled for submission
    const validationResult = flightAuthorizationFormSchema.safeParse({
      purpose_of_flight: authorization.purpose_of_flight,
      passenger_names: authorization.passenger_names || [],
      runway_in_use: authorization.runway_in_use,
      fuel_level_liters: authorization.fuel_level_liters,
      oil_level_quarts: authorization.oil_level_quarts,
      notams_reviewed: authorization.notams_reviewed,
      weather_briefing_complete: authorization.weather_briefing_complete,
      payment_method: authorization.payment_method,
      authorizing_instructor_id: authorization.authorizing_instructor_id,
      student_signature_data: authorization.student_signature_data,
      instructor_notes: authorization.instructor_notes,
      instructor_limitations: authorization.instructor_limitations,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Authorization is incomplete and cannot be submitted",
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    // Update status to pending and set submitted timestamp
    const { data: updatedAuth, error: updateError } = await supabase
      .from("flight_authorizations")
      .update({
        status: 'pending',
        submitted_at: new Date().toISOString(),
        student_signed_at: authorization.student_signature_data ? new Date().toISOString() : null,
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
        )
      `)
      .single();

    if (updateError) {
      console.error("Error submitting flight authorization:", updateError);
      return NextResponse.json(
        { error: "Failed to submit flight authorization" },
        { status: 500 }
      );
    }

    // TODO: In the future, send notification to instructors about pending authorization
    // This could be done via email, in-app notifications, etc.

    return NextResponse.json({
      authorization: updatedAuth,
      success: true,
      message: "Flight authorization submitted successfully and is awaiting instructor approval"
    });

  } catch (error) {
    console.error("Error in POST /api/flight-authorizations/[id]/submit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
