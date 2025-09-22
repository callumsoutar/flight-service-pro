import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import {
  updateUsersEndorsementSchema,
} from "@/types/users_endorsements";

// GET /api/users-endorsements/[id] - Retrieve a specific user endorsement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the specific user endorsement
    const { data, error } = await supabase
      .from("users_endorsements")
      .select(`
        *,
        endorsement:endorsements(id, name, description, is_active),
        user:users(id, first_name, last_name, email)
      `)
      .eq("id", id)
      .is("voided_at", null) // Only return non-voided endorsements
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "User endorsement not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching user endorsement:", error);
      return NextResponse.json(
        { error: "Failed to fetch user endorsement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user_endorsement: data });
  } catch (error: unknown) {
    console.error("Error in GET /api/users-endorsements/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/users-endorsements/[id] - Update a user endorsement
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    
    // Validate request body
    const validatedData = updateUsersEndorsementSchema.parse(body);

    // Update the user endorsement
    const { data, error } = await supabase
      .from("users_endorsements")
      .update(validatedData)
      .eq("id", id)
      .is("voided_at", null) // Only update non-voided endorsements
      .select(`
        *,
        endorsement:endorsements(id, name, description, is_active),
        user:users(id, first_name, last_name, email)
      `)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "User endorsement not found" },
          { status: 404 }
        );
      }
      console.error("Error updating user endorsement:", error);
      return NextResponse.json(
        { error: "Failed to update user endorsement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user_endorsement: data });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/users-endorsements/[id]:", error);
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json(
        { error: "Invalid request data", details: (error as { errors: unknown }).errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/users-endorsements/[id] - Void a user endorsement (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete by setting voided_at timestamp
    const { data, error } = await supabase
      .from("users_endorsements")
      .update({ voided_at: new Date().toISOString() })
      .eq("id", id)
      .is("voided_at", null) // Only void non-voided endorsements
      .select(`
        *,
        endorsement:endorsements(id, name, description, is_active),
        user:users(id, first_name, last_name, email)
      `)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "User endorsement not found or already voided" },
          { status: 404 }
        );
      }
      console.error("Error voiding user endorsement:", error);
      return NextResponse.json(
        { error: "Failed to void user endorsement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "User endorsement voided successfully",
      user_endorsement: data 
    });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/users-endorsements/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
