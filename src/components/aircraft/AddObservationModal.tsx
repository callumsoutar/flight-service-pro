import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ObservationStatus, ObservationStage, Observation } from '@/types/observations';
import { getCurrentUserClient } from "@/lib/SupabaseBrowserClient";

interface AddObservationModalProps {
  open: boolean;
  onClose: () => void;
  aircraftId: string;
  orgId: string;
  refresh?: () => void;
  onAdd?: (observation: Observation) => void;
}

const OBSERVATION_STATUSES: ObservationStatus[] = ["low", "medium", "high"];
const OBSERVATION_STAGES: ObservationStage[] = ["open", "investigating", "monitoring", "closed"];

export const AddObservationModal: React.FC<AddObservationModalProps> = ({ open, onClose, aircraftId, orgId, refresh, onAdd }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ObservationStatus>("low");
  const [stage, setStage] = useState<ObservationStage>("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  // Fetch logged in user id
  useEffect(() => {
    if (!open) return;
    (async () => {
      const user = await getCurrentUserClient();
      if (user?.id) {
        setUserId(user.id);
      } else {
        setUserId("");
      }
    })();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!name || !status || !stage) {
      setError("Name, Status, and Stage are required.");
      setLoading(false);
      return;
    }
    if (!userId) {
      setError("Could not determine logged in user.");
      setLoading(false);
      return;
    }
    const payload = {
      organization_id: orgId,
      user_id: userId,
      aircraft_id: aircraftId,
      name,
      description: description || null,
      status,
      observation_stage: stage,
    };
    const res = await fetch("/api/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (onAdd && data) onAdd(data as Observation);
      if (refresh) refresh();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add observation");
    }
    setLoading(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-0 w-full max-w-md shadow-xl border border-gray-100">
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-2xl font-bold text-center mb-6">Add New Observation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
            <div className="flex flex-col md:col-span-2">
              <label className="text-sm font-medium mb-1">Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Status *</label>
              <Select value={status} onValueChange={val => setStatus(val as ObservationStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {OBSERVATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Stage *</label>
              <Select value={stage} onValueChange={val => setStage(val as ObservationStage)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  {OBSERVATION_STAGES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:col-span-2">
              <label className="text-sm font-medium mb-1">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." className="min-h-[60px]" />
            </div>
          </div>
          {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-8 pb-6">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading} className="min-w-[90px]">Cancel</Button>
          <Button
            type="submit"
            disabled={loading || !name || !status || !stage}
            className="min-w-[110px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
          >
            {loading ? "Adding..." : "Add Observation"}
          </Button>
        </div>
      </form>
    </div>
  );
}; 