import { createClient } from "@/lib/SupabaseServerClient";
import EquipmentClientPage from "./EquipmentClientPage";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import type { Equipment, EquipmentIssuance } from '@/types/equipment';
import type { UserResult } from '@/components/invoices/MemberSelect';

// Component now receives guaranteed authenticated user and role data
async function EquipmentPage({}: ProtectedPageProps) {
  const supabase = await createClient();
  
  // Fetch equipment and issuances in parallel
  const [
    { data: equipment },
    { data: issuances },
  ] = await Promise.all([
    supabase
      .from('equipment')
      .select('*')
      .is('voided_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('equipment_issuance')
      .select('*')
      .is('returned_at', null),
  ]);

  const equipmentList = (equipment || []) as Equipment[];
  const issuanceList = (issuances || []) as EquipmentIssuance[];

  // Create a map of open issuances by equipment ID
  const openIssuanceByEquipmentId: Record<string, EquipmentIssuance> = {};
  issuanceList.forEach((issuance) => {
    openIssuanceByEquipmentId[issuance.equipment_id] = issuance;
  });

  // Fetch user details for all issuances (if any)
  let issuedUsers: Record<string, UserResult> = {};
  
  if (issuanceList.length > 0) {
    const userIds = Array.from(
      new Set(issuanceList.flatMap((i) => [i.user_id, i.issued_by]))
    );

    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    if (users) {
      issuedUsers = users.reduce((acc, user) => {
        acc[user.id] = user as UserResult;
        return acc;
      }, {} as Record<string, UserResult>);
    }
  }

  return (
    <EquipmentClientPage
      equipment={equipmentList}
      openIssuanceByEquipmentId={openIssuanceByEquipmentId}
      issuedUsers={issuedUsers}
    />
  );
}

// Export the protected component using the standardized HOC
export default withRoleProtection(EquipmentPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP); 