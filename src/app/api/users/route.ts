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
    console.error("[API /users] Unauthorized", userError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Get current organization from cookie
  const currentOrgId = req.cookies.get("current_org_id")?.value;
  console.log("[API /users] currentOrgId:", currentOrgId);
  if (!currentOrgId) {
    console.error("[API /users] No organization selected");
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }
  // Get search query
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() || "";
  console.log("[API /users] search query:", q);
  const id = searchParams.get("id");

  // Fetch all users in the org (as in BookingDetails.tsx)
  const { data, error } = await supabase
    .from("user_organizations")
    .select("user_id, users(first_name, last_name, email)")
    .eq("organization_id", currentOrgId);

  if (error) {
    console.error("[API /users] Supabase error:", error.message, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log("[API /users] Raw data:", JSON.stringify(data));

  // Map and filter in JS
  let users = (data || []).map((row: { user_id: string; users: { first_name?: string; last_name?: string; email?: string } | { first_name?: string; last_name?: string; email?: string }[] }) => {
    const userObj = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.user_id,
      first_name: userObj?.first_name || "",
      last_name: userObj?.last_name || "",
      email: userObj?.email || "",
    };
  });

  if (id) {
    users = users.filter(u => u.id === id);
  } else if (q) {
    users = users.filter(u =>
      (u.first_name && u.first_name.toLowerCase().includes(q)) ||
      (u.last_name && u.last_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }

  // Sort by last_name, then first_name
  users.sort((a, b) => {
    const lastA = a.last_name?.toLowerCase() || "";
    const lastB = b.last_name?.toLowerCase() || "";
    if (lastA < lastB) return -1;
    if (lastA > lastB) return 1;
    const firstA = a.first_name?.toLowerCase() || "";
    const firstB = b.first_name?.toLowerCase() || "";
    return firstA.localeCompare(firstB);
  });

  console.log("[API /users] Final users:", JSON.stringify(users));
  return NextResponse.json({ users });
} 