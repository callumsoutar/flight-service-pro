import { Button } from "@/components/ui/button";
import { PackagePlus } from "lucide-react";
import EquipmentStatsCards from "./EquipmentStatsCards";
import EquipmentTable from "./EquipmentTable";
import { cookies } from 'next/headers';
import { createClient } from '@/lib/SupabaseServerClient';
import { Equipment } from '@/types/equipment';

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
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground mt-2">Manage your equipment inventory and issuance</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2">
          <PackagePlus className="w-5 h-5" /> Add Equipment
        </Button>
      </div>
      <EquipmentStatsCards equipment={equipment} />
      <EquipmentTable equipment={equipment} />
    </main>
  );
} 