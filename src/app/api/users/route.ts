import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ users: [] }, { status: 401 });
  }
  
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q")?.toLowerCase() || "";
  const id = searchParams.get("id");
  const ids = searchParams.get("ids");

  // Simple fetch of all users - minimal fields to avoid stack depth issues
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, account_balance")
    .order("last_name", { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ users: [] }, { status: 500 });
  }

  let users = (data || []).map((user: { id: string; first_name?: string; last_name?: string; email: string; account_balance?: number }) => ({
    id: user.id,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    account_balance: user.account_balance || 0,
    role: 'member', // Default role for now
  }));

  if (ids) {
    // Filter by specific IDs (comma-separated)
    const idArray = ids.split(",").map(id => id.trim());
    users = users.filter(u => idArray.includes(u.id));
  } else if (id) {
    users = users.filter(u => u.id === id);
  } else if (q) {
    users = users.filter(u =>
      (u.first_name && u.first_name.toLowerCase().includes(q)) ||
      (u.last_name && u.last_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { email, first_name, last_name, phone, date_of_birth, notes, role = "member" } = body;
  
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Create user in Supabase Auth first
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: "tempPassword123!", // This should be changed by the user
    email_confirm: true,
    user_metadata: {
      first_name,
      last_name,
    },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  // Create user record in users table (without role column)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .insert([{
      id: authData.user.id,
      email,
      first_name,
      last_name,
      phone,
      date_of_birth,
      notes,
    }])
    .select()
    .single();

  if (userError) {
    // If user creation fails, we should clean up the auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // Assign role to user via user_roles table
  const { data: roleData } = await supabase
    .from("roles")
    .select("id")
    .eq("name", role)
    .single();

  if (roleData?.id) {
    await supabase
      .from("user_roles")
      .insert([{
        user_id: authData.user.id,
        role_id: roleData.id,
        granted_by: authData.user.id,
      }]);
  }

  return NextResponse.json({ user: userData });
} 