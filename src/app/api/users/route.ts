import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/SupabaseServerClient";

interface AuthUser {
  id: string;
}

interface UserData {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  emergency_contact_relationship?: string;
  medical_certificate_expiry?: string | null;
  class_1_medical_due?: string | null;
  class_2_medical_due?: string | null;
  DL9_due?: string | null;
  BFR_due?: string | null;
  pilot_license_number?: string;
  pilot_license_type?: string;
  pilot_license_id?: string | null;
  pilot_license_expiry?: string | null;
  date_of_last_flight?: string | null;
  company_name?: string;
  occupation?: string;
  employer?: string;
  notes?: string;
  account_balance?: number;
  is_active?: boolean;
  public_directory_opt_in?: boolean;
  created_at?: string;
  updated_at?: string;
}

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
  const includeAuthStatus = searchParams.get("includeAuthStatus") === "true";

  // Role authorization check using standardized pattern
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  const isPrivileged = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

  let selectFields: string;
  let query;

  if (isPrivileged) {
    // Privileged users can access all fields
    selectFields = "id, first_name, last_name, email, phone, date_of_birth, gender, street_address, city, state, postal_code, country, next_of_kin_name, next_of_kin_phone, emergency_contact_relationship, medical_certificate_expiry, class_1_medical_due, class_2_medical_due, DL9_due, BFR_due, pilot_license_number, pilot_license_type, pilot_license_id, pilot_license_expiry, date_of_last_flight, company_name, occupation, employer, notes, account_balance, is_active, public_directory_opt_in, created_at, updated_at";
    
    // Fetch all users
    query = supabase
      .from("users")
      .select(selectFields)
      .order("last_name", { ascending: true });
  } else {
    // Regular members can only access limited fields and only for specific users
    selectFields = "id, first_name, last_name, email, public_directory_opt_in, created_at";
    
    if (id && id === user.id) {
      // Users can access their own full data
      selectFields = "id, first_name, last_name, email, phone, date_of_birth, gender, street_address, city, state, postal_code, country, next_of_kin_name, next_of_kin_phone, emergency_contact_relationship, medical_certificate_expiry, pilot_license_number, pilot_license_type, pilot_license_id, pilot_license_expiry, date_of_last_flight, company_name, occupation, employer, notes, account_balance, is_active, public_directory_opt_in, created_at, updated_at";
      query = supabase
        .from("users")
        .select(selectFields)
        .eq("id", id);
    } else {
      // For other users, only return users who opted into public directory with minimal fields
      query = supabase
        .from("users")
        .select(selectFields)
        .eq("public_directory_opt_in", true)
        .eq("is_active", true)
        .order("last_name", { ascending: true });
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ users: [] }, { status: 500 });
  }

  // Check which users have auth accounts (only if requested)
  let authUserIds = new Set<string>();
  if (includeAuthStatus && data) {
    const userIds = ((data as unknown) as UserData[]).map((user: UserData) => user.id);
    const serviceSupabase = createServiceClient();
    const { data: authUsers } = await serviceSupabase
      .from("auth.users")
      .select("id")
      .in("id", userIds);
    
    authUserIds = new Set(authUsers?.map((au: AuthUser) => au.id) || []);
  }

  let users = ((data as unknown) as UserData[] || []).map((userData: UserData) => {
    const baseUser = {
      id: userData.id,
      first_name: userData.first_name || "",
      last_name: userData.last_name || "",
      email: userData.email || "",
      public_directory_opt_in: userData.public_directory_opt_in !== undefined ? userData.public_directory_opt_in : false,
      created_at: userData.created_at,
      role: 'member', // Default role for now
    };

    // Only include sensitive fields if user has permission (privileged user or accessing own data)
    if (isPrivileged || (id && id === user.id)) {
      return {
        ...baseUser,
        phone: userData.phone || "",
        date_of_birth: userData.date_of_birth || null,
        gender: userData.gender || null,
        street_address: userData.street_address || "",
        city: userData.city || "",
        state: userData.state || "",
        postal_code: userData.postal_code || "",
        country: userData.country || "",
        next_of_kin_name: userData.next_of_kin_name || "",
        next_of_kin_phone: userData.next_of_kin_phone || "",
        emergency_contact_relationship: userData.emergency_contact_relationship || "",
        medical_certificate_expiry: userData.medical_certificate_expiry || null,
        class_1_medical_due: userData.class_1_medical_due || null,
        class_2_medical_due: userData.class_2_medical_due || null,
        DL9_due: userData.DL9_due || null,
        BFR_due: userData.BFR_due || null,
        pilot_license_number: userData.pilot_license_number || "",
        pilot_license_type: userData.pilot_license_type || "",
        pilot_license_id: userData.pilot_license_id || null,
        pilot_license_expiry: userData.pilot_license_expiry || null,
        date_of_last_flight: userData.date_of_last_flight || null,
        company_name: userData.company_name || "",
        occupation: userData.occupation || "",
        employer: userData.employer || "",
        notes: userData.notes || "",
        account_balance: userData.account_balance || 0,
        is_active: userData.is_active !== undefined ? userData.is_active : true,
        has_auth_account: includeAuthStatus ? authUserIds.has(userData.id) : undefined,
        updated_at: userData.updated_at,
      };
    }

    // Return limited data for public directory users
    return baseUser;
  });

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

  // Check if user has permission to create new users (admin or owner role required)
  const { data: hasPermission } = await supabase
    .rpc('check_user_role_simple', {
      user_id: user.id,
      allowed_roles: ['admin', 'owner']
    });

  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions to create users" }, { status: 403 });
  }

  // Use service client for admin operations that require bypassing RLS
  const serviceSupabase = createServiceClient();
  
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
    public_directory_opt_in = false,
    role = "member",
    create_auth_user = true // New parameter to control auth user creation
  } = body;
  
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if user already exists by email
  const { data: existingUser } = await serviceSupabase
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();

  if (existingUser) {
    return NextResponse.json({ 
      error: "User with this email already exists",
      user: existingUser 
    }, { status: 409 });
  }

  let userId: string;

  if (create_auth_user) {
    // For members who need auth access, create auth user first to get consistent ID
    console.log(`Creating auth user for email: ${email}`);
    
    const { data: authUserData, error: authUserError } = await serviceSupabase.auth.admin.createUser({
      email,
      email_confirm: false, // Don't auto-confirm, will be handled by invitation
      user_metadata: {
        first_name: first_name || '',
        last_name: last_name || '',
      }
    });

    if (authUserError) {
      console.error('Auth user creation error:', authUserError);
      return NextResponse.json({ 
        error: `Failed to create auth user: ${authUserError.message}` 
      }, { status: 500 });
    }

    userId = authUserData.user.id; // Use the auth user ID for consistency
    console.log(`Auth user created with ID: ${userId}`);
  } else {
    // For members who don't need auth access (e.g., one-time flyers), just create the user record
    userId = crypto.randomUUID();
    console.log(`Created user without auth account, ID: ${userId}`);
  }

  // Create user record in users table with all fields using UPSERT to handle race conditions
  const { data: userData, error: userError } = await serviceSupabase
    .from("users")
    .upsert([{
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
      public_directory_opt_in,
    }], {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (userError) {
    console.error('Users table insertion error:', userError);
    
    // If we created an auth user but failed to create the user record, clean up the auth user
    if (create_auth_user && userId) {
      console.log(`Cleaning up auth user ${userId} due to user record creation failure`);
      await serviceSupabase.auth.admin.deleteUser(userId);
    }
    
    return NextResponse.json({ error: `User record creation failed: ${userError.message}` }, { status: 500 });
  }

  // Assign role to user via user_roles table
  const roleToAssign = role; // Use the specified role for all users
  const grantedBy = user.id; // Current authenticated user granting the role
  
  const { data: roleData } = await serviceSupabase
    .from("roles")
    .select("id")
    .eq("name", roleToAssign)
    .single();

  if (roleData?.id) {
    // Use UPSERT to handle potential race conditions in role assignment
    await serviceSupabase
      .from("user_roles")
      .upsert([{
        user_id: userId,
        role_id: roleData.id,
        granted_by: grantedBy,
      }], {
        onConflict: 'user_id,role_id',
        ignoreDuplicates: false
      });
  }

  return NextResponse.json({ 
    user: userData,
    authUserCreated: create_auth_user,
    message: create_auth_user 
      ? "Member created with login account. You can send them an invitation email from their profile page."
      : "Member created without login account. You can create an account and send an invitation later from their profile page."
  });
} 