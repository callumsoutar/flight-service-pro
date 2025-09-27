import { createClient } from "@/lib/SupabaseServerClient";
import { NextRequest, NextResponse } from "next/server";
import { TaskStats } from "@/types/tasks";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters for filtering stats
    const { searchParams } = new URL(request.url);
    const assigned_to_user_id = searchParams.get("assigned_to_user_id");
    const assigned_to_instructor_id = searchParams.get("assigned_to_instructor_id");
    const related_booking_id = searchParams.get("related_booking_id");
    const related_aircraft_id = searchParams.get("related_aircraft_id");
    const related_user_id = searchParams.get("related_user_id");
    const related_instructor_id = searchParams.get("related_instructor_id");

    // Build a query with filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildQuery = (baseQuery: any) => {
      let query = baseQuery;
      if (assigned_to_user_id) query = query.eq("assigned_to_user_id", assigned_to_user_id);
      if (assigned_to_instructor_id) query = query.eq("assigned_to_instructor_id", assigned_to_instructor_id);
      if (related_booking_id) query = query.eq("related_booking_id", related_booking_id);
      if (related_aircraft_id) query = query.eq("related_aircraft_id", related_aircraft_id);
      if (related_user_id) query = query.eq("related_user_id", related_user_id);
      if (related_instructor_id) query = query.eq("related_instructor_id", related_instructor_id);
      return query;
    };

    // Get total count
    const totalQuery = buildQuery(supabase.from("tasks").select("*", { count: "exact", head: true }));
    const { count: total, error: totalError } = await totalQuery;
    if (totalError) {
      console.error("Error getting total count:", totalError);
      return NextResponse.json({ error: "Failed to get task stats" }, { status: 500 });
    }

    // Get counts by status
    const statusQuery = buildQuery(supabase.from("tasks").select("status"));
    const { data: statusCounts, error: statusError } = await statusQuery;

    if (statusError) {
      console.error("Error getting status counts:", statusError);
      return NextResponse.json({ error: "Failed to get task stats" }, { status: 500 });
    }

    // Get counts by priority
    const priorityQuery = buildQuery(supabase.from("tasks").select("priority"));
    const { data: priorityCounts, error: priorityError } = await priorityQuery;

    if (priorityError) {
      console.error("Error getting priority counts:", priorityError);
      return NextResponse.json({ error: "Failed to get task stats" }, { status: 500 });
    }

    // Get counts by category
    const categoryQuery = buildQuery(supabase.from("tasks").select("category"));
    const { data: categoryCounts, error: categoryError } = await categoryQuery;

    if (categoryError) {
      console.error("Error getting category counts:", categoryError);
      return NextResponse.json({ error: "Failed to get task stats" }, { status: 500 });
    }

    // Calculate overdue tasks
    const overdueQuery = buildQuery(supabase.from("tasks"))
      .select("id")
      .lt("due_date", new Date().toISOString().split('T')[0])
      .neq("status", "completed");

    const { data: overdueTasks, error: overdueError } = await overdueQuery;

    if (overdueError) {
      console.error("Error getting overdue tasks:", overdueError);
      return NextResponse.json({ error: "Failed to get task stats" }, { status: 500 });
    }

    // Process status counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assigned = statusCounts?.filter((t: any) => t.status === "assigned").length || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inProgress = statusCounts?.filter((t: any) => t.status === "inProgress").length || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = statusCounts?.filter((t: any) => t.status === "completed").length || 0;
    const overdue = overdueTasks?.length || 0;

    // Process priority counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lowPriority = priorityCounts?.filter((t: any) => t.priority === "low").length || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mediumPriority = priorityCounts?.filter((t: any) => t.priority === "medium").length || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highPriority = priorityCounts?.filter((t: any) => t.priority === "high").length || 0;

    // Process category counts
    const categoryStats: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categoryCounts?.forEach((task: any) => {
      const category = task.category;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    const stats: TaskStats = {
      total: total || 0,
      assigned,
      inProgress,
      completed,
      overdue,
      by_priority: {
        low: lowPriority,
        medium: mediumPriority,
        high: highPriority
      },
      by_category: categoryStats
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error in tasks stats GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
