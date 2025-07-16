import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/SupabaseServerClient";
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';

import { z } from 'zod';

const NewUserSchema = z.object({
  organization_id: z.string().uuid(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});


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
    .select("user_id, users(first_name, last_name, email, account_balance)")
    .eq("organization_id", currentOrgId);

  if (error) {
    console.error("[API /users] Supabase error:", error.message, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log("[API /users] Raw data:", JSON.stringify(data));

  // Map and filter in JS
  let users = (data || []).map((row: { user_id: string; users: { first_name?: string; last_name?: string; email?: string; account_balance?: number } | { first_name?: string; last_name?: string; email?: string; account_balance?: number }[] }) => {
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

  console.log("[API /users] Final users:", JSON.stringify(users));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  // Use the service role key for admin actions (never expose to client!)
  // Make sure to set SUPABASE_SERVICE_ROLE_KEY in your environment variables
  const supabaseAdmin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const supabase = await createClient();
  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[API /users] Invalid JSON:", err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parse = NewUserSchema.safeParse(body);
  if (!parse.success) {
    console.error("[API /users] Zod validation error:", parse.error.flatten(), "Payload:", body);
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { organization_id, email, first_name, last_name, phone, date_of_birth, notes } = parse.data;
  console.log("[API /users] Creating auth user and linking to org:", organization_id, email);

  // 1. Try to create the auth user (admin API)
  let userId: string | null = null;
  let userWasCreated = false;
  let userResult;
  let authError;
  try {
    const result = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false, // Set to true to send invite email
      user_metadata: { first_name, last_name, phone, date_of_birth, notes }
    });
    userResult = result.data;
    authError = result.error;
    if (authError && authError.code === 'email_exists') {
      // Email already exists, fetch the user by email
      const { data: usersPage, error: fetchAuthError } = await supabaseAdmin.auth.admin.listUsers();
      if (fetchAuthError || !usersPage?.users?.length) {
        console.error("[API /users] Error fetching existing auth user:", fetchAuthError, usersPage);
        return NextResponse.json({ error: 'User with this email exists but could not be fetched' }, { status: 500 });
      }
      const existingUser = usersPage.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!existingUser) {
        console.error("[API /users] No user found with this email in admin listUsers result", email);
        return NextResponse.json({ error: 'User with this email exists but could not be found' }, { status: 500 });
      }
      userId = existingUser.id;
      userWasCreated = false;
    } else if (authError || !userResult?.user) {
      console.error("[API /users] Error creating auth user:", authError?.message, authError);
      return NextResponse.json({ error: authError?.message || 'Failed to create auth user' }, { status: 500 });
    } else {
      userId = userResult.user.id;
      userWasCreated = true;
    }
  } catch (err) {
    console.error("[API /users] Exception creating/fetching auth user:", err);
    return NextResponse.json({ error: 'Failed to create or fetch auth user' }, { status: 500 });
  }

  // 1.5. Fetch the 'member' role_id from the roles table
  const { data: memberRole, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'member')
    .single();
  if (roleError || !memberRole?.id) {
    console.error("[API /users] Error fetching 'member' role_id:", roleError, memberRole);
    return NextResponse.json({ error: "Could not find 'member' role in roles table" }, { status: 500 });
  }
  const memberRoleId = memberRole.id;

  // 2. Check if user is already linked to this org
  const { data: existingLink, error: linkError } = await supabase
    .from('user_organizations')
    .select('user_id')
    .eq('user_id', userId)
    .eq('organization_id', organization_id)
    .maybeSingle();
  if (linkError) {
    console.error("[API /users] Error checking user_organizations link:", linkError);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }
  if (existingLink) {
    return NextResponse.json({ error: 'User is already a member of this organization.' }, { status: 409 });
  }

  // 3. Link to organization using role_id
  const { error: orgError } = await supabase
    .from('user_organizations')
    .insert([{ user_id: userId, organization_id, role_id: memberRoleId }]);
  if (orgError) {
    console.error("[API /users] Error inserting user_organizations:", orgError.message, orgError, { userId, organization_id, memberRoleId });
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  // 4. (Optional) Update users table with additional fields
  const { error: updateError } = await supabase
    .from('users')
    .update({ first_name, last_name, phone, date_of_birth, notes })
    .eq('id', userId);
  if (updateError) {
    console.error("[API /users] Error updating users profile:", updateError.message, updateError, { userId });
    // Not fatal, continue
  }

  // 5. Fetch the user record to return
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (fetchError) {
    console.error("[API /users] Error fetching user:", fetchError.message, fetchError, { userId });
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ user }, { status: userWasCreated ? 201 : 200 });
} 