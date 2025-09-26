import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";

import {
  createUsersEndorsementSchema,
  queryUsersEndorsementsSchema,
  type CreateUsersEndorsement,
  type QueryUsersEndorsements,
} from "@/types/users_endorsements";

// GET /api/users-endorsements - Retrieve user endorsements
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role authorization check - endorsements are certification data
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    // Instructors and above can view all endorsements, students/members can view their own
    const isPrivilegedUser = userRole && ['instructor', 'admin', 'owner'].includes(userRole);
    const isStudent = userRole && ['student', 'member'].includes(userRole);

    if (!isPrivilegedUser && !isStudent) {
      return NextResponse.json({ 
        error: 'Forbidden: Endorsements access requires a valid role' 
      }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: QueryUsersEndorsements = {};
    
    if (searchParams.get("user_id")) {
      queryParams.user_id = searchParams.get("user_id")!;
    }
    if (searchParams.get("endorsement_id")) {
      queryParams.endorsement_id = searchParams.get("endorsement_id")!;
    }
    if (searchParams.get("include_expired")) {
      queryParams.include_expired = searchParams.get("include_expired") === "true";
    }

    // Validate query parameters
    const validatedQuery = queryUsersEndorsementsSchema.parse(queryParams);

    // Students/members can only access their own endorsements
    if (isStudent && validatedQuery.user_id && validatedQuery.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Forbidden: You can only view your own endorsements' 
      }, { status: 403 });
    }

    // Build the query
    let query = supabase
      .from("users_endorsements")
      .select(`
        *,
        endorsement:endorsements(id, name, description, is_active),
        user:users(id, first_name, last_name, email)
      `);

    // Apply filters
    if (validatedQuery.user_id) {
      query = query.eq("user_id", validatedQuery.user_id);
    } else if (isStudent) {
      // If no user_id specified and user is a student, only show their own endorsements
      query = query.eq("user_id", user.id);
    }
    if (validatedQuery.endorsement_id) {
      query = query.eq("endorsement_id", validatedQuery.endorsement_id);
    }
    if (validatedQuery.include_expired === false) {
      query = query.or(`expiry_date.is.null,expiry_date.gt.${new Date().toISOString()}`);
    }
    
    // Always filter out voided endorsements (soft delete)
    query = query.is("voided_at", null);

    // Execute query
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user endorsements:", error);
      return NextResponse.json(
        { error: "Failed to fetch user endorsements" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user_endorsements: data });
  } catch (error) {
    console.error("Error in GET /api/users-endorsements:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/users-endorsements - Create a new user endorsement
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = createUsersEndorsementSchema.parse(body);
    
    // Set default issued_date if not provided
    const endorsementData: CreateUsersEndorsement = {
      ...validatedData,
      issued_date: validatedData.issued_date || new Date().toISOString(),
    };

    // Insert the new user endorsement
    const { data, error } = await supabase
      .from("users_endorsements")
      .insert(endorsementData)
      .select(`
        *,
        endorsement:endorsements(id, name, description, is_active),
        user:users(id, first_name, last_name, email)
      `)
      .single();

    if (error) {
      console.error("Error creating user endorsement:", error);
      
      // Handle unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "User already has this endorsement" },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to create user endorsement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user_endorsement: data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/users-endorsements:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
