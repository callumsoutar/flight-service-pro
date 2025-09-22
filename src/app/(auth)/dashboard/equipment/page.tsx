import { createClient } from "@/lib/SupabaseServerClient";
import EquipmentClientPage from "./EquipmentClientPage";

export default async function EquipmentPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('equipment')
    .select('*')
    .is('voided_at', null); // Only return non-voided equipment
  const equipment = data || [];

  return <EquipmentClientPage equipment={equipment} />;
} 