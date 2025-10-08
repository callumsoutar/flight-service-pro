import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { z } from "zod";

const ChargeableTypeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

const UpdateChargeableTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active_only") === "true";

  let query = supabase
    .from("chargeable_types")
    .select("*")
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching chargeable types:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chargeable_types: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = ChargeableTypeSchema.parse(body);

    // Generate code from name if not provided or sanitize it
    const code = validatedData.code
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');

    const { data, error } = await supabase
      .from("chargeable_types")
      .insert([{
        code,
        name: validatedData.name,
        description: validatedData.description || null,
        is_active: validatedData.is_active,
        is_system: false, // Custom types are never system types
      }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json(
          { error: "A chargeable type with this code already exists" },
          { status: 409 }
        );
      }
      console.error("Error creating chargeable type:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chargeable_type: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating chargeable type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = UpdateChargeableTypeSchema.parse(body);

    // Check if the type is a system type
    const { data: existingType } = await supabase
      .from("chargeable_types")
      .select("is_system")
      .eq("id", validatedData.id)
      .single();

    if (existingType?.is_system) {
      return NextResponse.json(
        { error: "Cannot modify system chargeable types" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active;

    const { data, error } = await supabase
      .from("chargeable_types")
      .update(updateData)
      .eq("id", validatedData.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating chargeable type:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Chargeable type not found" }, { status: 404 });
    }

    return NextResponse.json({ chargeable_type: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating chargeable type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Check if the type is a system type
  const { data: existingType } = await supabase
    .from("chargeable_types")
    .select("is_system")
    .eq("id", id)
    .single();

  if (existingType?.is_system) {
    return NextResponse.json(
      { error: "Cannot delete system chargeable types" },
      { status: 403 }
    );
  }

  // Soft delete by deactivating
  const { data, error } = await supabase
    .from("chargeable_types")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error deleting chargeable type:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Chargeable type not found" }, { status: 404 });
  }

  return NextResponse.json({ chargeable_type: data });
}
