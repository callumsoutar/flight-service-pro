"use client";
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-gray-700">Total Equipment</CardTitle>
          <span className="rounded-full p-2 bg-indigo-100 text-indigo-700"><Wrench className="w-5 h-5" /></span>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{total}</div>
        </CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-gray-700">Issued</CardTitle>
          <span className="rounded-full p-2 bg-yellow-100 text-yellow-700"><Users className="w-5 h-5" /></span>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{issued}</div>
        </CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-gray-700">Available</CardTitle>
          <span className="rounded-full p-2 bg-green-100 text-green-700"><CheckCircle className="w-5 h-5" /></span>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{available}</div>
        </CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-gray-700">Lost</CardTitle>
          <span className="rounded-full p-2 bg-red-100 text-red-700"><XCircle className="w-5 h-5" /></span>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{lost}</div>
        </CardContent>
      </Card>
    </div>
  );
} 