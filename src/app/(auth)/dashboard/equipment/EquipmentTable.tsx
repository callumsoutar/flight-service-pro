"use client";
import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Equipment } from '@/types/equipment';

interface EquipmentTableProps {
  equipment: Equipment[];
}

export default function EquipmentTable({ equipment }: EquipmentTableProps) {
  const safeEquipment = Array.isArray(equipment) ? equipment : [];
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">Equipment Inventory</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeEquipment.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-400">No equipment found.</TableCell>
            </TableRow>
          ) : (
            safeEquipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.serial_number || '—'}</TableCell>
                <TableCell>{item.type || '—'}</TableCell>
                <TableCell className="capitalize">{item.status}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 