import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";


export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // Role authorization check using standardized pattern
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  // All authenticated users can access public directory, but with different visibility levels
  if (!userRole) {
    return NextResponse.json({ 
      error: 'Forbidden: Public directory access requires a valid role' 
    }, { status: 403 });
  }

  const isPrivileged = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

  let query;
  
  if (isPrivileged) {
    // Privileged users can see all users
    query = supabase
      .from("users")
      .select(`
        id, 
        first_name, 
        last_name, 
        email, 
        phone,
        public_directory_opt_in,
        user_roles!user_roles_user_id_fkey (
          roles (
            name
          )
        )
      `)
      .eq("is_active", true)
      .order("last_name", { ascending: true });
  } else {
    // Regular members/students can only see users who opted into public directory
    query = supabase
      .from("users")
      .select(`
        id, 
        first_name, 
        last_name, 
        email, 
        phone,
        public_directory_opt_in,
        user_roles!user_roles_user_id_fkey (
          roles (
            name
          )
        )
      `)
      .eq("is_active", true)
      .eq("public_directory_opt_in", true)
      .order("last_name", { ascending: true });
  }

  // Apply search filter
  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  // Apply pagination
  query = query.range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching public directory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map users with their roles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = (data || []).map((user: any) => {
    const primaryRole = user.user_roles && user.user_roles.length > 0
      ? user.user_roles[0]?.roles?.name || 'member'
      : 'member';
    
    return {
      id: user.id,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone: user.phone || "",
      public_directory_opt_in: user.public_directory_opt_in || false,
      role: primaryRole,
    };
  });

  return NextResponse.json({ 
    users,
    total: count || 0,
    page,
    limit,
    hasMore: (count || 0) > page * limit
  });
}
