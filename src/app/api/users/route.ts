import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ users: [] }, { status: 401 });
  }
  // Org check
  const orgId = req.cookies.get("current_org_id")?.value;
  if (!orgId) {
    return NextResponse.json({ users: [] }, { status: 400 });
  }
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q")?.toLowerCase() || "";
  const id = searchParams.get("id");

  const query = supabase
    .from("user_organizations")
    .select("user_id, users(first_name, last_name, email, account_balance)")
    .eq("organization_id", orgId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ users: [] }, { status: 500 });
  }
  let users = (data || []).map((row: { user_id: string; users: { first_name?: string; last_name?: string; email?: string; account_balance?: number } | { first_name?: string; last_name?: string; email?: string; account_balance?: number }[] | null }) => {
    const userObj = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.user_id,
      first_name: userObj?.first_name || "",
      last_name: userObj?.last_name || "",
      email: userObj?.email || "",
      account_balance: userObj?.account_balance ?? 0,
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

  return NextResponse.json({ users });
} 