import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";

const MembershipTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  duration_months: z.number().int().min(1, "Duration must be at least 1 month"),
  benefits: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  chargeable_id: z.string().uuid().nullable().optional(), // Optional: can select existing or create new
});

const UpdateMembershipTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  duration_months: z.number().int().min(1).optional(),
  benefits: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  chargeable_id: z.string().uuid().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // STEP 2: Authorization - Role check
  // Only instructors and above can view membership types (contains pricing info)
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Viewing membership types requires instructor, admin, or owner role'
    }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active_only") === "true";

  let query = supabase
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

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // STEP 2: Authorization - Only admin/owner can create membership types
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Creating membership types requires admin or owner role'
    }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = MembershipTypeSchema.parse(body);

    let chargeableId = validatedData.chargeable_id;

    // If no chargeable_id provided, create a new chargeable
    if (!chargeableId) {
      // Get the membership_fee chargeable type
      const { data: chargeableType } = await supabase
        .from("chargeable_types")
        .select("id")
        .eq("code", "membership_fee")
        .single();

      if (!chargeableType) {
        return NextResponse.json(
          { error: "Membership fee chargeable type not found" },
          { status: 500 }
        );
      }

      // Create a new chargeable for this membership type
      const { data: newChargeable, error: chargeableError } = await supabase
        .from("chargeables")
        .insert([{
          name: `${validatedData.name} Fee`,
          description: `Membership fee for ${validatedData.name}`,
          chargeable_type_id: chargeableType.id,
          rate: 0, // Default rate - should be updated via chargeable management
          is_taxable: true, // Membership fees are typically taxable
          is_active: validatedData.is_active,
        }])
        .select()
        .single();

      if (chargeableError || !newChargeable) {
        console.error("Error creating chargeable:", chargeableError);
        return NextResponse.json(
          { error: "Failed to create associated chargeable" },
          { status: 500 }
        );
      }

      chargeableId = newChargeable.id;
    }

    // Create the membership type with the chargeable_id
    const { data, error } = await supabase
      .from("membership_types")
      .insert([{
        ...validatedData,
        chargeable_id: chargeableId,
      }])
      .select(`
        *,
        chargeables (
          id,
          name,
          rate,
          is_taxable
        )
      `)
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

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // STEP 2: Authorization - Only admin/owner can update membership types
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Updating membership types requires admin or owner role'
    }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = UpdateMembershipTypeSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.code !== undefined) updateData.code = validatedData.code;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.duration_months !== undefined) updateData.duration_months = validatedData.duration_months;
    if (validatedData.benefits !== undefined) updateData.benefits = validatedData.benefits;
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active;
    if (validatedData.chargeable_id !== undefined) updateData.chargeable_id = validatedData.chargeable_id;

    const { data, error } = await supabase
      .from("membership_types")
      .update(updateData)
      .eq("id", validatedData.id)
      .select(`
        *,
        chargeables (
          id,
          name,
          rate,
          is_taxable
        )
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Name or code already exists" }, { status: 409 });
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: "Membership type not found" }, { status: 404 });
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
