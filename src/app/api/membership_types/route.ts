import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";

const MembershipTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
  duration_months: z.number().int().min(1, "Duration must be at least 1 month"),
  benefits: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active_only") === "true";

  let query = supabase
    .from("membership_types")
    .select("*")
    .order("name");

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching membership types:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ membership_types: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check - RLS policies will handle role-based authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = MembershipTypeSchema.parse(body);

    const { data, error } = await supabase
      .from("membership_types")
      .insert([validatedData])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json({ error: "Name or code already exists" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ membership_type: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating membership type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 