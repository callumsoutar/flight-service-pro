"use client";
import React from "react";
import { Wrench, Users, CheckCircle, XCircle } from "lucide-react";
import type { Equipment } from '@/types/equipment';

interface EquipmentStatsCardsProps {
  equipment: Equipment[] | undefined | null;
}

export default function EquipmentStatsCards({ equipment }: EquipmentStatsCardsProps) {
  const safeEquipment = Array.isArray(equipment) ? equipment : [];
  const total = safeEquipment.length;
  // If you have issuance info, adjust this logic accordingly
  const issued = safeEquipment.filter(eq => typeof (eq as { current_issuance?: unknown }).current_issuance !== 'undefined' && (eq as { current_issuance?: unknown }).current_issuance !== null).length;
  const lost = safeEquipment.filter(eq => eq.status === "lost").length;
  const available = total - issued - lost;

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
        <h3 className="text-zinc-600 font-medium mb-2">Lost</h3>
        <p className="text-3xl font-bold text-red-500">{lost}</p>
      </div>
    </div>
  );
} 