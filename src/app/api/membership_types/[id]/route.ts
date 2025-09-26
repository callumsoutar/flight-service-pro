import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";

const UpdateMembershipTypeSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().min(1, "Code is required").optional(),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative").optional(),
  duration_months: z.number().int().min(1, "Duration must be at least 1 month").optional(),
  benefits: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = UpdateMembershipTypeSchema.parse(body);

    const { data, error } = await supabase
      .from("membership_types")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Name or code already exists" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ membership_type: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating membership type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("membership_types")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ membership_type: data });
  } catch (error) {
    console.error("Error deleting membership type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}