"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { getCurrentUserClient } from "@/lib/SupabaseBrowserClient";
import type { Equipment } from '@/types/equipment';
import type { UserResult } from '@/components/invoices/MemberSelect';

interface UpdateEquipmentModalProps {
  open: boolean;
  onClose: () => void;
  equipment: Equipment;
  refresh: () => void;
}

export const UpdateEquipmentModal: React.FC<UpdateEquipmentModalProps> = ({ open, onClose, equipment, refresh }) => {
  const [updateDate, setUpdateDate] = useState<Date>(new Date());
  const [nextDueDate, setNextDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> } | null>(null);
  // Track current user info
  const [userId, setUserId] = useState<string | null>(null);
  const [updater, setUpdater] = useState<UserResult | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const user = await getCurrentUserClient();
      if (user?.id) {
        setUserId(user.id);
        // Fetch user details for display
        const res = await fetch(`/api/users?ids=${user.id}`);
        const users = (await res.json()).users;
        // Find the user whose id matches the logged-in user's id
        const currentUser = Array.isArray(users) ? users.find((u: UserResult) => u.id === user.id) : null;
        if (currentUser) setUpdater(currentUser);
      }
    }
    fetchUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!userId) {
      setError("Could not determine current user. Please log in again.");
      setLoading(false);
      return;
    }
    const payload = {
      equipment_id: equipment.id,
      updated_at: updateDate.toISOString(),
      next_due_at: nextDueDate ? nextDueDate.toISOString().slice(0, 10) : null,
      notes: notes || null,
      updated_by: userId,
    };
    const res = await fetch('/api/equipment_updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      refresh();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to log update');
    }
    setLoading(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-0 w-full max-w-md shadow-xl border border-gray-100">
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-2xl font-bold text-center mb-6">Log Equipment Update</h3>
          <div className="bg-muted rounded-xl p-4 mb-6">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs font-medium">Equipment</span>
              <span className="font-semibold">
                {equipment.name}
                {equipment.serial_number && (
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">{equipment.serial_number}</span>
                )}
              </span>
            </div>
            <div className="flex flex-col mt-2">
              <span className="text-muted-foreground text-xs font-medium">Updated By</span>
              <span className="font-semibold">
                {updater ? ((updater.first_name || updater.last_name) ? `${updater.first_name ?? ''} ${updater.last_name ?? ''}`.trim() : updater.email) : '—'}
              </span>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Update Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={"w-full justify-start text-left font-normal " + (updateDate ? "" : "text-muted-foreground")}
                  type="button"
                >
                  {updateDate ? format(updateDate, "yyyy-MM-dd") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={updateDate || undefined}
                  onSelect={date => setUpdateDate(date ?? new Date())}
                  initialFocus
                  required={false}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Next Due Date <span className="text-xs text-gray-400">(optional)</span></label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={"w-full justify-start text-left font-normal " + (nextDueDate ? "" : "text-muted-foreground")}
                  type="button"
                >
                  {nextDueDate ? format(nextDueDate, "yyyy-MM-dd") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={nextDueDate || undefined}
                  onSelect={date => setNextDueDate(date ?? null)}
                  initialFocus
                  required={false}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-muted-foreground">Notes</label>
            <textarea className="w-full border rounded p-2 min-h-[60px] mt-1 text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
          {/* Error rendering: support string or object (Zod/API) errors */}
          {error && typeof error === "string" ? (
            <div className="text-red-600 text-sm mb-2 text-center">{error}</div>
          ) : error && typeof error === "object" ? (
            <div className="text-red-600 text-sm mb-2 text-center">
              {/* Render formErrors */}
              {error.formErrors && Array.isArray(error.formErrors) && error.formErrors.map((msg: string, i: number) => (
                <div key={i}>{msg}</div>
              ))}
              {/* Render fieldErrors */}
              {error.fieldErrors && typeof error.fieldErrors === "object" &&
                Object.entries(error.fieldErrors).map(([field, messages]: [string, string[]]) =>
                  messages.map((msg, i) => (
                    <div key={field + i}>{field}: {msg}</div>
                  ))
                )
              }
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 px-8 pb-6">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading} className="min-w-[90px]">Cancel</Button>
          <Button
            type="submit"
            disabled={loading}
            className="min-w-[110px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
          >
            {loading ? "Logging..." : "Log Update"}
          </Button>
        </div>
      </form>
    </div>
  );
}; 