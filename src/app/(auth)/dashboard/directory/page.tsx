import { createClient } from "@/lib/SupabaseServerClient";
import PublicDirectoryTable from "@/components/members/PublicDirectoryTable";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

interface PublicMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  status: string;
  public_directory_opt_in: boolean;
}

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function PublicDirectoryPage({ user: _user, userRole }: ProtectedPageProps) {
  let publicMembers: PublicMember[] = [];
  
  try {
    const supabase = await createClient();

    // Fetch users who opted into public directory with limited public information
    const { data: publicUsers, error } = await supabase
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

    if (error) {
      console.error('Error fetching public directory:', error);
    } else if (publicUsers) {
      publicMembers = publicUsers.map((user) => {
        const primaryRole = user.user_roles && user.user_roles.length > 0 
          ? (user.user_roles[0]?.roles as unknown as { name: string })?.name || 'member'
          : 'member';
        
        return {
          id: user.id || "",
          email: user.email || "",
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          phone: user.phone || "",
          role: primaryRole,
          status: "active",
          public_directory_opt_in: true,
        };
      });
    }
  } catch (error) {
    console.error('Error in PublicDirectoryPage:', error);
    publicMembers = [];
  }

  const initialData = {
    members: publicMembers,
    page: 1,
    limit: 20,
    total: publicMembers.length,
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title and description */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>
              Member Directory
            </h1>
            <p className="text-lg text-muted-foreground">
              Connect with other members who have chosen to be listed in our public directory.
            </p>
          </div>
        </div>
        
        {/* Public Directory Table */}
        <PublicDirectoryTable initialData={initialData} userRole={userRole} />
      </div>
    </div>
  );
}

// Export protected component - all authenticated users can access directory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(PublicDirectoryPage, ROLE_CONFIGS.AUTHENTICATED_ONLY) as any;