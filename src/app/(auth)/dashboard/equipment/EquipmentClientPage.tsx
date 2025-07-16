"use client";
import EquipmentStatsCards from "./EquipmentStatsCards";
import EquipmentTable from "./EquipmentTable";
import type { Equipment, EquipmentIssuance } from '@/types/equipment';
import { useEffect, useState } from "react";
import type { UserResult } from '@/components/invoices/MemberSelect';

export default function EquipmentClientPage({ equipment }: { equipment: Equipment[] }) {
  const [openIssuanceByEquipmentId, setOpenIssuanceByEquipmentId] = useState<Record<string, EquipmentIssuance>>({});
  const [issuedUsers, setIssuedUsers] = useState<Record<string, UserResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Fetch open issuances
      const issuanceRes = await fetch('/api/equipment_issuance?open_only=true');
      const issuanceData = await issuanceRes.json();
      const arr = Array.isArray(issuanceData.issuances) ? issuanceData.issuances : [];
      const map: Record<string, EquipmentIssuance> = {};
      arr.forEach((i: EquipmentIssuance) => { map[i.equipment_id] = i; });
      setOpenIssuanceByEquipmentId(map);
      // Fetch users for issued_to and issued_by
      const userIds = Array.from(new Set(arr.flatMap((i: EquipmentIssuance) => [i.issued_to, i.issued_by])));
      if (userIds.length > 0) {
        const usersRes = await fetch(`/api/users?ids=${userIds.join(',')}`);
        const usersData = await usersRes.json();
        const usersArr = Array.isArray(usersData.users) ? usersData.users : [];
        const userMap: Record<string, UserResult> = {};
        usersArr.forEach((u: UserResult) => { userMap[u.id] = u; });
        setIssuedUsers(userMap);
      } else {
        setIssuedUsers({});
      }
      setLoading(false);
    }
    fetchData();
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
      {loading ? (
        <div className="p-6 text-center text-muted-foreground">Loading equipment...</div>
      ) : (
        <EquipmentTable equipment={equipment} openIssuanceByEquipmentId={openIssuanceByEquipmentId} issuedUsers={issuedUsers} />
      )}
    </main>
  );
} 