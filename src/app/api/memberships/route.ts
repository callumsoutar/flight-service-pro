import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const organization_id = searchParams.get("organization_id");

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  let query = supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user_id)
    .order("start_date", { ascending: false });

  if (organization_id) {
    query = query.eq("organization_id", organization_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ memberships: data }, { status: 200 });
} 