import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

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

  // If ids param is present, fetch only those users
  if (ids) {
    const idList = ids.split(",").map((id) => id.trim()).filter(Boolean);
    if (idList.length === 0) {
      return NextResponse.json([], { status: 200 });
    }
    const { data, error } = await supabase
      .from("users")
      .select(`
        id, 
        first_name, 
        last_name, 
        email, 
        profile_image_url,
        user_roles!user_roles_user_id_fkey (
          roles (
            name
          )
        )
      `)
      .in("id", idList);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const users = (data || []).map((user) => {
      const typedUser = user as unknown as { 
        id: string; 
        first_name?: string; 
        last_name?: string; 
        email: string;
        user_roles?: Array<{ roles: { name: string } }>;
      };
      const primaryRole = typedUser.user_roles && typedUser.user_roles.length > 0 
        ? typedUser.user_roles[0]?.roles?.name || 'member'
        : 'member';
      
      return {
        id: typedUser.id,
        first_name: typedUser.first_name || "",
        last_name: typedUser.last_name || "",
        email: typedUser.email,
        profile_image_url: undefined, // This field doesn't exist in our data
        role: primaryRole,
      };
    });
    return NextResponse.json(users, { status: 200 });
  }

  // Build query: select users with roles, filter by search, paginate
  let query = supabase
    .from("users")
    .select(`
      id, 
      first_name, 
      last_name, 
      email, 
      profile_image_url,
      user_roles!user_roles_user_id_fkey (
        roles (
          name
        )
      )
    `)
    .order("last_name", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Type-safe mapping for members with roles
  const members = (data || []).map((user) => {
    const typedUser = user as unknown as { 
      id: string; 
      first_name?: string; 
      last_name?: string; 
      email: string;
      user_roles?: Array<{ roles: { name: string } }>;
    };
    const primaryRole = typedUser.user_roles && typedUser.user_roles.length > 0 
      ? typedUser.user_roles[0]?.roles?.name || 'member'
      : 'member';
    
    return {
      id: typedUser.id,
      first_name: typedUser.first_name || "",
      last_name: typedUser.last_name || "",
      email: typedUser.email,
      profile_image_url: undefined, // This field doesn't exist in our data
      role: primaryRole,
    };
  });

  return NextResponse.json({
    members,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

// PATCH /api/members?id=USER_ID
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  console.log('PATCH /api/members called with id:', id);
  
  if (!id) {
    console.error('Missing member id in PATCH request');
    return NextResponse.json({ error: "Missing member id" }, { status: 400 });
  }

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Authentication error in PATCH:', userError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log('Authenticated user:', user.id);

  // Parse body for updatable fields
  let body;
  try {
    body = await req.json();
    console.log('PATCH /api/members received body:', body);
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

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
    "date_of_birth",
    "pilot_license_number",
    "pilot_license_type",
    "pilot_license_id",
    "pilot_license_expiry",

    "medical_certificate_expiry",
    "role"
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
    date_of_birth?: string | null;
    pilot_license_number?: string;
    pilot_license_type?: string;
    pilot_license_id?: string | null;
    pilot_license_expiry?: string | null;

    medical_certificate_expiry?: string | null;
    role?: string;
  }
  
  const updates: UpdateUserFields = {};
  for (const field of allowedFields) {
    if (field in body) {
      const value = body[field];
      
      // Handle date fields - convert empty strings to null
      if (field === 'date_of_birth' || field === 'pilot_license_expiry' || field === 'medical_certificate_expiry') {
        updates[field as keyof UpdateUserFields] = value === '' ? null : value;
      }
      // Handle UUID fields - convert empty strings to null
      else if (field === 'pilot_license_id') {
        updates[field as keyof UpdateUserFields] = value === '' ? null : value;
      }
      // Handle other optional fields - only include if not empty string
      else if (value !== '' || field === 'first_name' || field === 'last_name' || field === 'email') {
        updates[field as keyof UpdateUserFields] = value;
      }
    }
  }

  console.log('Filtered updates:', updates);

  if (Object.keys(updates).length === 0) {
    console.error('No valid fields to update');
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Update the user
  console.log('Updating user with ID:', id);
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('Update successful, returned data:', data);

  return NextResponse.json({
    member: {
      id: data.id,
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      email: data.email || "",
      profile_image_url: data.profile_image_url,
      role: data.role,
    },
  });
} 