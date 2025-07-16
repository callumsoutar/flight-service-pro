"use client";
import EquipmentStatsCards from "./EquipmentStatsCards";
import EquipmentTable from "./EquipmentTable";
import type { Equipment, EquipmentIssuance } from '@/types/equipment';
import { useEffect, useState } from "react";

export default function EquipmentClientPage({ equipment }: { equipment: Equipment[] }) {
  const [openIssuanceByEquipmentId, setOpenIssuanceByEquipmentId] = useState<Record<string, EquipmentIssuance>>({});

  useEffect(() => {
    fetch('/api/equipment_issuance?open_only=true')
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data.issuances) ? data.issuances : [];
        const map: Record<string, EquipmentIssuance> = {};
        arr.forEach((i: EquipmentIssuance) => { map[i.equipment_id] = i; });
        setOpenIssuanceByEquipmentId(map);
      });
  }, []);

  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground mt-2">Manage your equipment inventory and issuance</p>
        </div>
      </div>
      <EquipmentStatsCards equipment={equipment} openIssuanceByEquipmentId={openIssuanceByEquipmentId} />
      <EquipmentTable equipment={equipment} openIssuanceByEquipmentId={openIssuanceByEquipmentId} />
    </main>
  );
} 