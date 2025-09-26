import { createClient } from "@/lib/SupabaseServerClient";
import MembersTable from "@/components/members/MembersTable";
import type { Member } from "@/components/members/columns";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function MembersPage({ user: _user, userRole }: ProtectedPageProps) {
  const supabase = await createClient();

  // Check if current user is a privileged user (admin/owner/instructor)
  const isPrivileged = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

  let formattedMembers: Member[] = [];
  
  try {

    let query;
    
    if (isPrivileged) {
      // Privileged users can see all users
      query = supabase
        .from("users")
        .select(`
          id, 
          email, 
          first_name, 
          last_name,
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
          email, 
          first_name, 
          last_name,
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

    const { data: usersWithRoles, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
    } else if (usersWithRoles) {
      // Map users with their actual roles
      formattedMembers = usersWithRoles.map((user) => {
        // Get the primary role (first role in the array, or default to 'member')
        const primaryRole = user.user_roles && user.user_roles.length > 0 
          ? (user.user_roles[0]?.roles as unknown as { name: string })?.name || 'member'
          : 'member';
        
        return {
          id: user.id || "",
          email: user.email || "",
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          profile_image_url: undefined,
          role: primaryRole,
          status: "active",
          public_directory_opt_in: user.public_directory_opt_in || false,
        };
      });
    }
  } catch (error) {
    console.error('Error in MembersPage:', error);
    formattedMembers = [];
  }

  const initialData = {
    members: formattedMembers,
    page: 1,
    limit: 20,
    total: formattedMembers.length,
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and actions row */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Members</h1>
            <p className="text-lg text-muted-foreground">Manage your organization&apos;s members and their roles.</p>
          </div>
        </div>
        
        {/* Members Table */}
        <MembersTable initialData={initialData} userRole={userRole} />
      </div>
    </div>
  );
}

// Export protected component with role restriction for instructors and above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(MembersPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any; 