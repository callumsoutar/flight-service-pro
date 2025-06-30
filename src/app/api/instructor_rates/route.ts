import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const organizationId = searchParams.get("organization_id");
  const userId = searchParams.get("user_id");

  if (!organizationId || !userId) {
    return NextResponse.json({ error: "Missing organization_id or user_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("instructor_rates")
    .select("id, organization_id, user_id, rate, currency")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ instructor_rate: data });
} 