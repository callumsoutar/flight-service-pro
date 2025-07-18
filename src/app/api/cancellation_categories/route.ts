import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ categories: [] }, { status: 401 });
  }
  // Org check
  const orgId = req.cookies.get("current_org_id")?.value;
  if (!orgId) {
    return NextResponse.json({ categories: [] }, { status: 400 });
  }
  // Fetch categories for org
  const { data, error } = await supabase
    .from("cancellation_categories")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
  return NextResponse.json({ categories: data ?? [] });
} 