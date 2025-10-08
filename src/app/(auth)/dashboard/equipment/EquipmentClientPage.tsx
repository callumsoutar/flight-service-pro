"use client";
import EquipmentStatsCards from "./EquipmentStatsCards";
import EquipmentTable from "./EquipmentTable";
import type { Equipment, EquipmentIssuance } from '@/types/equipment';
import type { UserResult } from '@/components/invoices/MemberSelect';

interface EquipmentClientPageProps {
  equipment: Equipment[];
  openIssuanceByEquipmentId: Record<string, EquipmentIssuance>;
  issuedUsers: Record<string, UserResult>;
}

export default function EquipmentClientPage({
  equipment,
  openIssuanceByEquipmentId,
  issuedUsers,
}: EquipmentClientPageProps) {
  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground mt-2">Manage your equipment inventory and issuance</p>
        </div>
      </div>
      <EquipmentStatsCards
        equipment={equipment}
        openIssuanceByEquipmentId={openIssuanceByEquipmentId}
      />
      <EquipmentTable
        equipment={equipment}
        openIssuanceByEquipmentId={openIssuanceByEquipmentId}
        issuedUsers={issuedUsers}
      />
    </main>
  );
} 