import { cookies } from 'next/headers';
import { createClient } from '@/lib/SupabaseServerClient';
import { Equipment } from '@/types/equipment';
import EquipmentStatsCards from './EquipmentStatsCards';
import EquipmentTable from './EquipmentTable';

export default async function EquipmentPage() {
  const cookieStore = await cookies();
  const organization_id = cookieStore.get('current_org_id')?.value;
  let equipment: Equipment[] = [];
  if (organization_id) {
    const supabase = await createClient();
    const { data } = await supabase.from('equipment').select('*').eq('organization_id', organization_id);
    equipment = data || [];
  }

  return (
    <div className="space-y-8">
      <EquipmentStatsCards equipment={equipment} />
      <EquipmentTable equipment={equipment} />
    </div>
  );
} 