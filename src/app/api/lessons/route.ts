import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Org check
  const orgId = req.cookies.get("current_org_id")?.value;
  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }
  const searchParams = req.nextUrl.searchParams;
  const lessonId = searchParams.get("id");

  let query = supabase
    .from("lessons")
    .select("*")
    .eq("organization_id", orgId);

  if (lessonId) {
    query = query.eq("id", lessonId);
    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ lesson: data });
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ lessons: data ?? [] });
} 