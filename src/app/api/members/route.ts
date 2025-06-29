import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/SupabaseServerClient";

interface SupabaseUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
}

// GET /api/members?page=1&limit=20&search=foo
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || "";

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

  // If ids param is present, fetch only those users
  if (ids) {
    const idList = ids.split(",").map((id) => id.trim()).filter(Boolean);
    if (idList.length === 0) {
      return NextResponse.json([], { status: 200 });
    }
    const { data, error } = await supabase
      .from("user_organizations")
      .select("user_id, users:users!inner(id, first_name, last_name, email, profile_image_url)")
      .eq("organization_id", currentOrgId)
      .in("user_id", idList);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const users = (data || []).map((row: { user_id: string; users: { first_name?: string; last_name?: string; email?: string; profile_image_url?: string } | { first_name?: string; last_name?: string; email?: string; profile_image_url?: string }[] }) => {
      const u = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        id: row.user_id,
        first_name: u?.first_name,
        last_name: u?.last_name,
        email: u?.email,
        profile_image_url: u?.profile_image_url,
      };
    });
    return NextResponse.json(users, { status: 200 });
  }

  // Build query: join user_organizations and users, filter by org, search, paginate
  let query = supabase
    .from("user_organizations")
    .select(
      `id, role, user_id, users:users!inner(id, first_name, last_name, email, profile_image_url)`
    )
    .eq("organization_id", currentOrgId)
    .order("users.last_name", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.ilike("users.email", `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Type-safe mapping for members
  type UserOrgRaw = { users: SupabaseUser | SupabaseUser[] | null; user_id: string; role: string };
  const members = (data || []).map((row: UserOrgRaw) => {
    let users: SupabaseUser | null = null;
    if (Array.isArray(row.users)) {
      users = row.users[0] ?? null;
    } else {
      users = row.users;
    }
    return {
      id: row.user_id,
      first_name: users?.first_name,
      last_name: users?.last_name,
      email: users?.email,
      profile_image_url: users?.profile_image_url,
      role: row.role,
    };
  });

  return NextResponse.json({
    members,
    page,
    limit,
    total: count ?? members.length,
  });
}

// PATCH /api/members?id=USER_ID
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing member id" }, { status: 400 });
  }

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

  // Check that the user to update is in the current org
  const { data: userOrg, error: orgError } = await supabase
    .from("user_organizations")
    .select("user_id")
    .eq("organization_id", currentOrgId)
    .eq("user_id", id)
    .single();
  if (orgError || !userOrg) {
    return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });
  }

  // Parse body for updatable fields
  const body = await req.json();
  console.log('PATCH /api/members received body:', body);
  const allowedFields = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "company_name",
    "occupation",
    "employer",
    "notes",
    "next_of_kin_name",
    "next_of_kin_phone",
    "street_address",
    "gender",
    "date_of_birth"
  ];
  interface UpdateUserFields {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company_name?: string;
    occupation?: string;
    employer?: string;
    notes?: string;
    next_of_kin_name?: string;
    next_of_kin_phone?: string;
    street_address?: string;
    gender?: string;
    date_of_birth?: string;
  }
  const updateData: UpdateUserFields = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined && body[key] !== "") {
      updateData[key as keyof UpdateUserFields] = body[key];
    }
  }
  console.log('PATCH /api/members updateData:', updateData);
  if (Object.keys(updateData).length === 0) {
    console.error('PATCH /api/members error: No valid fields to update', { body });
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Update the user
  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ user: updated });
} 