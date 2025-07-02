import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/SupabaseServerClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PATCH(req: NextRequest, { params }: { params: any }) {
  const { id } = params;
  const supabase = await createClient();
  const body = await req.json();

  // Allow updating these fields
  const updatableFields = [
    "reference", "issue_date", "due_date", "user_id", "notes", "status"
  ];
  const updateData: Record<string, string | number | undefined> = {};
  for (const key of updatableFields) {
    if (body[key] !== undefined) {
      updateData[key] = body[key];
    }
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoice: data });
} 