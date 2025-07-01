import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Get current organization from cookie
  const currentOrgId = req.cookies.get("current_org_id")?.value;
  if (!currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }
  // Get search query and type filter
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() || "";
  const type = searchParams.get("type") || "";

  // Fetch chargeables for the org
  let query = supabase
    .from("chargeables")
    .select("id, name, description, rate, type")
    .eq("organization_id", currentOrgId)
    .order("name", { ascending: true })
    .limit(50);

  if (type) {
    query = query.eq("type", type);
  }
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,description.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ chargeables: data || [] });
}

export async function POST() {
  // TODO: Implement POST chargeable
  return NextResponse.json({ message: "POST chargeable" });
}

export async function PATCH() {
  // TODO: Implement PATCH chargeable
  return NextResponse.json({ message: "PATCH chargeable" });
}

export async function DELETE() {
  // TODO: Implement DELETE chargeable
  return NextResponse.json({ message: "DELETE chargeable" });
} 