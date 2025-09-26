import { createClient } from "@/lib/SupabaseServerClient";
import { NextRequest, NextResponse } from "next/server";
import { CreateTaskRequest } from "@/types/tasks";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role authorization - tasks access requires instructor/admin/owner role
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden: Tasks access requires instructor, admin, or owner role' 
      }, { status: 403 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const assigned_to_user_id = searchParams.get("assigned_to_user_id");
    const assigned_to_instructor_id = searchParams.get("assigned_to_instructor_id");
    const related_booking_id = searchParams.get("related_booking_id");
    const related_aircraft_id = searchParams.get("related_aircraft_id");
    const related_user_id = searchParams.get("related_user_id");
    const related_instructor_id = searchParams.get("related_instructor_id");
    const due_date_from = searchParams.get("due_date_from");
    const due_date_to = searchParams.get("due_date_to");
    const search = searchParams.get("search");
    
    // Build query
    let query = supabase
      .from("tasks")
      .select(`
        *,
        assigned_to_user:assigned_to_user_id(id, first_name, last_name, email),
        assigned_to_instructor:assigned_to_instructor_id(id, first_name, last_name, user_id),
        created_by:created_by_user_id(id, first_name, last_name, email),
        related_booking:related_booking_id(id, start_time, end_time, purpose),
        related_aircraft:related_aircraft_id(id, registration, type),
        related_user:related_user_id(id, first_name, last_name, email),
        related_instructor:related_instructor_id(id, first_name, last_name, user_id)
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (category) query = query.eq("category", category);
    if (assigned_to_user_id) query = query.eq("assigned_to_user_id", assigned_to_user_id);
    if (assigned_to_instructor_id) query = query.eq("assigned_to_instructor_id", assigned_to_instructor_id);
    if (related_booking_id) query = query.eq("related_booking_id", related_booking_id);
    if (related_aircraft_id) query = query.eq("related_aircraft_id", related_aircraft_id);
    if (related_user_id) query = query.eq("related_user_id", related_user_id);
    if (related_instructor_id) query = query.eq("related_instructor_id", related_instructor_id);
    
    if (due_date_from) query = query.gte("due_date", due_date_from);
    if (due_date_to) query = query.lte("due_date", due_date_to);
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error("Error in tasks GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateTaskRequest = await request.json();
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Prepare task data
    const taskData = {
      title: body.title,
      description: body.description || null,
      status: body.status || "pending",
      priority: body.priority || "medium",
      category: body.category || "Other",
      due_date: body.due_date || null,
      assigned_to_user_id: body.assigned_to_user_id || null,
      assigned_to_instructor_id: body.assigned_to_instructor_id || null,
      created_by_user_id: user.id,
      related_booking_id: body.related_booking_id || null,
      related_aircraft_id: body.related_aircraft_id || null,
      related_user_id: body.related_user_id || null,
      related_instructor_id: body.related_instructor_id || null,
      estimated_hours: body.estimated_hours || null,
      start_date: body.start_date || null,
      attachments: []
    };

    const { data: task, error } = await supabase
      .from("tasks")
      .insert(taskData)
      .select(`
        *,
        assigned_to_user:assigned_to_user_id(id, first_name, last_name, email),
        assigned_to_instructor:assigned_to_instructor_id(id, first_name, last_name, user_id),
        created_by:created_by_user_id(id, first_name, last_name, email),
        related_booking:related_booking_id(id, start_time, end_time, purpose),
        related_aircraft:related_aircraft_id(id, registration, type),
        related_user:related_user_id(id, first_name, last_name, email),
        related_instructor:related_instructor_id(id, first_name, last_name, user_id)
      `)
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Error in tasks POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
