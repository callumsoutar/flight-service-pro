import { createClient } from "@/lib/SupabaseServerClient";
import EquipmentClientPage from "./EquipmentClientPage";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

// Component now receives guaranteed authenticated user and role data
async function EquipmentPage({}: ProtectedPageProps) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('equipment')
    .select('*')
    .is('voided_at', null); // Only return non-voided equipment
  const equipment = data || [];

  return <EquipmentClientPage equipment={equipment} />;
}

// Export the protected component using the standardized HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(EquipmentPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any; 