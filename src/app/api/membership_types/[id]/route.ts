import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";

const UpdateMembershipTypeSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().min(1, "Code is required").optional(),
  description: z.string().optional(),
  duration_months: z.number().int().min(1, "Duration must be at least 1 month").optional(),
  benefits: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  chargeable_id: z.string().uuid().nullable().optional(),
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
    console.log("PATCH request body:", body);
    console.log("Membership type ID:", id);

    const validatedData = UpdateMembershipTypeSchema.parse(body);
    console.log("Validated data:", validatedData);

    // First check if the membership type exists
    const { data: existingType, error: checkError } = await supabase
      .from("membership_types")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking membership type:", checkError);
      throw checkError;
    }

    if (!existingType) {
      console.error("Membership type not found:", id);
      return NextResponse.json({ error: "Membership type not found" }, { status: 404 });
    }

    // Perform the update (without select to avoid RLS issues)
    const { error: updateError } = await supabase
      .from("membership_types")
      .update(validatedData)
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      if (updateError.code === "23505") {
        return NextResponse.json({ error: "Name or code already exists" }, { status: 409 });
      }
      throw updateError;
    }

    // Fetch the updated data with joined chargeables
    const { data, error: fetchError } = await supabase
      .from("membership_types")
      .select(`
        *,
        chargeables (
          id,
          name,
          rate,
          is_taxable
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch error after update:", fetchError);
      throw fetchError;
    }

    if (!data) {
      console.error("No data returned after update");
      return NextResponse.json({ error: "Update failed - no data returned" }, { status: 500 });
    }

    console.log("Update successful:", data);
    return NextResponse.json({ membership_type: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating membership type:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
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