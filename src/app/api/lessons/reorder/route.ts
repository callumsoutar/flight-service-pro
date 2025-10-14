import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const reorderSchema = z.object({
  syllabus_id: z.string().uuid("Valid syllabus ID is required"),
  lesson_orders: z.array(z.object({
    id: z.string().uuid(),
    order: z.number().int().positive()
  })).min(1, "At least one lesson order is required")
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // STEP 2: Authorization - Only admin/owner can reorder lessons
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Reordering lessons requires admin or owner role'
    }, { status: 403 });
  }

  const body = await req.json();
  const parse = reorderSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { syllabus_id, lesson_orders } = parse.data;

  try {
    // Update each lesson's order in a transaction-like manner
    const updatePromises = lesson_orders.map(({ id, order }) =>
      supabase
        .from("lessons")
        .update({ order })
        .eq("id", id)
        .eq("syllabus_id", syllabus_id) // Ensure lesson belongs to the syllabus
    );

    const results = await Promise.all(updatePromises);
    
    // Check if any updates failed
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: "Failed to update some lesson orders", 
        details: errors.map(e => e.error?.message)
      }, { status: 500 });
    }

    // Fetch updated lessons to return
    const { data: updatedLessons, error: fetchError } = await supabase
      .from("lessons")
      .select("*")
      .eq("syllabus_id", syllabus_id)
      .order("order", { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ lessons: updatedLessons });

  } catch (error) {
    console.error("Error reordering lessons:", error);
    return NextResponse.json({ 
      error: "Internal server error while reordering lessons" 
    }, { status: 500 });
  }
}