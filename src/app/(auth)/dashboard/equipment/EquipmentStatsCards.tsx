"use client";
import React from "react";
import { Wrench, Users, CheckCircle, XCircle } from "lucide-react";
import type { Equipment } from '@/types/equipment';

interface EquipmentStatsCardsProps {
  equipment: Equipment[] | undefined | null;
  openIssuanceByEquipmentId: Record<string, unknown>;
}

export default function EquipmentStatsCards({ equipment, openIssuanceByEquipmentId }: EquipmentStatsCardsProps) {
  const safeEquipment = Array.isArray(equipment) ? equipment : [];
  const total = safeEquipment.length;
  const issued = safeEquipment.filter(eq => openIssuanceByEquipmentId[eq.id]).length;
  const retired = safeEquipment.filter(eq => eq.status === "retired").length;
  const available = safeEquipment.filter(eq => !openIssuanceByEquipmentId[eq.id] && eq.status === "active").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
        <span className="mb-2"><Wrench className="w-6 h-6 text-indigo-600" /></span>
        <h3 className="text-zinc-600 font-medium mb-2">Total Equipment</h3>
        <p className="text-3xl font-bold text-indigo-600">{total}</p>
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
        <span className="mb-2"><Users className="w-6 h-6 text-yellow-500" /></span>
        <h3 className="text-zinc-600 font-medium mb-2">Issued</h3>
        <p className="text-3xl font-bold text-yellow-500">{issued}</p>
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
        <span className="mb-2"><CheckCircle className="w-6 h-6 text-green-500" /></span>
        <h3 className="text-zinc-600 font-medium mb-2">Available</h3>
        <p className="text-3xl font-bold text-green-500">{available}</p>
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
        <span className="mb-2"><XCircle className="w-6 h-6 text-red-500" /></span>
        <h3 className="text-zinc-600 font-medium mb-2">Retired</h3>
        <p className="text-3xl font-bold text-red-500">{retired}</p>
      </div>
    </div>
  );
} 