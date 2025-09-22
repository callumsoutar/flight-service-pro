import { createClient } from "@/lib/SupabaseServerClient";
import { NextRequest, NextResponse } from "next/server";
import { UpdateTaskRequest } from "@/types/tasks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: task, error } = await supabase
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
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      console.error("Error fetching task:", error);
      return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error in task GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateTaskRequest = await request.json();
    
    // Check if task exists first
    const { error: fetchError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      console.error("Error checking task existence:", fetchError);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    // Update the task
    const { data: task, error } = await supabase
      .from("tasks")
      .update(body)
      .eq("id", id)
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
      console.error("Error updating task:", error);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error in task PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if task exists first
    const { error: fetchError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      console.error("Error checking task existence:", fetchError);
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }

    // Delete the task
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error in task DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
