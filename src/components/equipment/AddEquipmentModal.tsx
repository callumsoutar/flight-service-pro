import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EquipmentStatus, EquipmentType, Equipment } from '@/types/equipment';

interface AddEquipmentModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  refresh?: () => void;
  onAdd?: (equipment: Equipment) => void;
}

const EQUIPMENT_TYPES: EquipmentType[] = [
  "AIP",
  "Stationery",
  "Headset",
  "Technology",
  "Maps",
  "Radio",
  "Transponder",
  "ELT",
  "Lifejacket",
  "FirstAidKit",
  "FireExtinguisher",
  "Other",
];

const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "active",
  "lost",
  "maintenance",
  "retired",
];

export const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ open, onClose, orgId, refresh, onAdd }) => {
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [status, setStatus] = useState<EquipmentStatus>("active");
  const [type, setType] = useState<EquipmentType | "">("");
  const [location, setLocation] = useState("");
  const [yearPurchased, setYearPurchased] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!name || !status || !type) {
      setError("Name, Status, and Type are required.");
      setLoading(false);
      return;
    }
    const payload = {
      organization_id: orgId,
      name,
      serial_number: serialNumber || null,
      status,
      type,
      location: location || null,
      year_purchased: yearPurchased ? Number(yearPurchased) : null,
      notes: notes || null,
    };
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (onAdd && data && data.equipment) onAdd(data.equipment as Equipment);
      if (refresh) refresh();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add equipment");
    }
    setLoading(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-0 w-full max-w-md shadow-xl border border-gray-100">
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-2xl font-bold text-center mb-6">Add New Equipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Serial Number</label>
              <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Status *</label>
              <Select value={status} onValueChange={val => setStatus(val as EquipmentStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Type *</label>
              <Select value={type} onValueChange={val => setType(val as EquipmentType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Location</label>
              <Input value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Year Purchased</label>
              <Input type="number" value={yearPurchased} onChange={e => setYearPurchased(e.target.value)} min={1900} max={3000} />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium mb-1">Notes</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="min-h-[60px]" />
          </div>
          {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-8 pb-6">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading} className="min-w-[90px]">Cancel</Button>
          <Button
            type="submit"
            disabled={loading || !name || !status || !type}
            className="min-w-[110px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
          >
            {loading ? "Adding..." : "Add Equipment"}
          </Button>
        </div>
      </form>
    </div>
  );
}; 