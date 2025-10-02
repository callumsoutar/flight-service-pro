import { createClient } from "@/lib/SupabaseServerClient";
import ReportsClientPage from "./ReportsClientPage";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

// Component now receives guaranteed authenticated user and role data
async function ReportsPage({}: ProtectedPageProps) {
  const supabase = await createClient();

  // Fetch active aircraft for the dropdown
  const { data: aircraft } = await supabase
    .from('aircraft')
    .select('id, registration, type')
    .eq('status', 'active')
    .order('registration');

  return <ReportsClientPage aircraft={aircraft || []} />;
}

// Export the protected component using the standardized HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(ReportsPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;
