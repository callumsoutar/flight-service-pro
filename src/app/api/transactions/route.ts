import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const organization_id = searchParams.get("organization_id");

  let query = supabase.from("transactions").select("*");
  if (user_id) query = query.eq("user_id", user_id);
  if (organization_id) query = query.eq("organization_id", organization_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data ?? [] });
} 