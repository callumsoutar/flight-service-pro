import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getCurrentUserClient } from "@/lib/SupabaseBrowserClient";
import type { Observation } from '@/types/observations';
import { toast } from "sonner";

interface AddObservationModalProps {
  open: boolean;
  onClose: () => void;
  aircraftId: string;
  refresh?: () => void;
  onAdd?: (observation: Observation) => void;
}

export const AddObservationModal: React.FC<AddObservationModalProps> = ({ open, onClose, aircraftId, refresh, onAdd }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"low" | "medium" | "high">("low");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setStatus("low");
      setError(null);
      // Get current user
      (async () => {
        const user = await getCurrentUserClient();
        if (user?.id) setUserId(user.id);
        else setUserId("");
      })();
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      toast.error("Name is required.");
      return;
    }
    if (!userId) {
      setError("Could not determine logged in user.");
      toast.error("Could not determine logged in user.");
      return;
    }
    setLoading(true);
    const payload = {
      aircraft_id: aircraftId,
      user_id: userId,
      name: name.trim(),
      description: description.trim() || null,
      status,
      observation_stage: 'open' as const,
    };
    const res = await fetch("/api/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success("Observation added successfully.");
      if (onAdd) onAdd(data);
      if (refresh) refresh();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add observation");
      toast.error(data.error || "Failed to add observation");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="w-[600px] max-w-[98vw] mx-auto p-8 bg-white rounded-2xl shadow-xl border border-muted overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Add Observation</DialogTitle>
          <DialogDescription className="mb-2 text-base text-muted-foreground font-normal">Report a new observation or defect for this aircraft.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Brief description of the observation..." required autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium mb-1">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description (optional)..." className="min-h-[60px]" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1">Priority</label>
            <Select value={status} onValueChange={val => setStatus(val as "low" | "medium" | "high")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" disabled={loading}>{loading ? "Adding..." : "Add Observation"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 