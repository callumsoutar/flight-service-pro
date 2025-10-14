import { createClient } from "@/lib/SupabaseServerClient";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import ProfileClient from "./ProfileClient";

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic';

async function ProfilePage({ user }: ProtectedPageProps) {
  const supabase = await createClient();
  
  // Get current user's profile data
  const { data: profileData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      <div className="w-full max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-lg text-gray-600">Manage your personal information and preferences.</p>
        </div>

        {/* Profile Content */}
        <ProfileClient initialProfileData={profileData} />
      </div>
    </div>
  );
}

// Export protected component - all authenticated users can access their profile
export default withRoleProtection(ProfilePage, ROLE_CONFIGS.AUTHENTICATED_ONLY);
