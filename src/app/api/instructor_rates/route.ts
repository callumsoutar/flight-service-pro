import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const organizationId = searchParams.get("organization_id");
  const instructorId = searchParams.get("instructor_id");

  if (!organizationId || !instructorId) {
    return NextResponse.json({ error: "Missing organization_id or instructor_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("instructor_rates")
    .select("id, organization_id, instructor_id, rate, currency, effective_from, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("instructor_id", instructorId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ instructor_rate: data });
} 