import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { User } from "@/types/users";

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
  const email = searchParams.get("email");

  // Fetch all users with all fields
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, phone, date_of_birth, gender, street_address, city, state, postal_code, country, next_of_kin_name, next_of_kin_phone, emergency_contact_relationship, medical_certificate_expiry, pilot_license_number, pilot_license_type, pilot_license_id, pilot_license_expiry, date_of_last_flight, company_name, occupation, employer, notes, account_balance, is_active, created_at, updated_at")
    .order("last_name", { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ users: [] }, { status: 500 });
  }

  let users = (data || []).map((user: User) => ({
    id: user.id,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    phone: user.phone || "",
    date_of_birth: user.date_of_birth || null,
    gender: user.gender || null,
    street_address: user.street_address || "",
    city: user.city || "",
    state: user.state || "",
    postal_code: user.postal_code || "",
    country: user.country || "",
    next_of_kin_name: user.next_of_kin_name || "",
    next_of_kin_phone: user.next_of_kin_phone || "",
    emergency_contact_relationship: user.emergency_contact_relationship || "",

    medical_certificate_expiry: user.medical_certificate_expiry || null,
    pilot_license_number: user.pilot_license_number || "",
    pilot_license_type: user.pilot_license_type || "",
    pilot_license_id: user.pilot_license_id || null,
    pilot_license_expiry: user.pilot_license_expiry || null,
    date_of_last_flight: user.date_of_last_flight || null,
    company_name: user.company_name || "",
    occupation: user.occupation || "",
    employer: user.employer || "",
    notes: user.notes || "",
    account_balance: user.account_balance || 0,
    is_active: user.is_active !== undefined ? user.is_active : true,
    created_at: user.created_at,
    updated_at: user.updated_at,
    role: 'member', // Default role for now
  }));

  if (ids) {
    // Filter by specific IDs (comma-separated)
    const idArray = ids.split(",").map(id => id.trim());
    users = users.filter(u => idArray.includes(u.id));
  } else if (id) {
    users = users.filter(u => u.id === id);
  } else if (email) {
    // Filter by exact email match (for checking existing users)
    users = users.filter(u => u.email && u.email.toLowerCase() === email.toLowerCase());
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
  const { 
    email, 
    first_name, 
    last_name, 
    phone, 
    date_of_birth, 
    gender,
    street_address,
    city,
    state,
    postal_code,
    country,
    next_of_kin_name,
    next_of_kin_phone,
    emergency_contact_relationship,
    medical_certificate_expiry,
    pilot_license_number,
    pilot_license_type,
    pilot_license_id,
    pilot_license_expiry,
    company_name,
    occupation,
    employer,
    notes, 
    role = "member",
    create_auth_user = true // New parameter to control auth user creation
  } = body;
  
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  let userId: string;
  let authData = null;

  if (create_auth_user) {
    // Create user in Supabase Auth first (normal user creation)
    const { data: authResponse, error: authError } = await supabase.auth.admin.createUser({
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

    if (!authResponse.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    authData = authResponse;
    userId = authResponse.user.id;
  } else {
    // Generate a UUID for trial flight users (no auth account)
    userId = crypto.randomUUID();
  }

  // Create user record in users table with all fields
  const { data: userData, error: userError } = await supabase
    .from("users")
    .insert([{
      id: userId,
      email,
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender,
      street_address,
      city,
      state,
      postal_code,
      country,
      next_of_kin_name,
      next_of_kin_phone,
      emergency_contact_relationship,
      medical_certificate_expiry,
      pilot_license_number,
      pilot_license_type,
      pilot_license_id,
      pilot_license_expiry,
      company_name,
      occupation,
      employer,
      notes,
    }])
    .select()
    .single();

  if (userError) {
    // If user creation fails and we created an auth user, clean it up
    if (authData?.user) {
      await supabase.auth.admin.deleteUser(authData.user.id);
    }
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // Assign role to user via user_roles table (only if we have a role system set up)
  if (create_auth_user) {
    const { data: roleData } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role)
      .single();

    if (roleData?.id) {
      await supabase
        .from("user_roles")
        .insert([{
          user_id: userId,
          role_id: roleData.id,
          granted_by: userId,
        }]);
    }
  } else {
    // For trial flight users, assign member role for basic permissions
    const { data: memberRole } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "member")
      .single();

    if (memberRole?.id) {
      await supabase
        .from("user_roles")
        .insert([{
          user_id: userId,
          role_id: memberRole.id,
          granted_by: user.id, // Current authenticated user granting the role
        }]);
    }
  }

  return NextResponse.json({ user: userData });
} 