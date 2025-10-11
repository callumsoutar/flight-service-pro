import React from "react";
import { Package, ArrowLeft } from "lucide-react";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import { createClient } from "@/lib/SupabaseServerClient";
import { notFound } from "next/navigation";
import EquipmentViewClient from "./EquipmentViewClient";

interface EquipmentViewPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function EquipmentViewPage({ params, user: _user, userRole: _userRole }: EquipmentViewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch equipment data server-side
  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .single();

  if (equipmentError || !equipment) {
    notFound();
  }

  return (
    <main className="w-full min-h-screen flex flex-col p-6 gap-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
        {/* Back link */}
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-2">
          <a href="/dashboard/equipment" className="text-[#6564db] hover:underline text-base flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Equipment
          </a>
        </div>
        {/* Equipment header and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <Package className="w-10 h-10 text-[#6564db]" />
            <div>
              <div className="text-2xl font-bold">{equipment.name}</div>
              <div className="text-muted-foreground text-sm">{equipment.type} &bull; Serial: {equipment.serial_number}</div>
            </div>
          </div>
        </div>
        {/* Equipment client component */}
        <div className="w-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          <EquipmentViewClient equipment={equipment} equipmentId={id} />
        </div>
      </div>
    </main>
  );
}

// Export protected component with role restriction for instructors and above
/* eslint-disable @typescript-eslint/no-explicit-any */
export default withRoleProtection(EquipmentViewPage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;