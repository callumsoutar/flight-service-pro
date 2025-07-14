import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { getCurrentUserClient } from "@/lib/SupabaseBrowserClient";
import MemberSelect from "@/components/invoices/MemberSelect";
import type { UserResult } from '@/components/invoices/MemberSelect';
import type { Equipment } from '@/types/equipment';

interface IssueEquipmentModalProps {
  open: boolean;
  onClose: () => void;
  equipment: Equipment;
  orgId: string;
  refresh?: () => void;
  member?: UserResult;
  issuedBy?: UserResult;
}

export const IssueEquipmentModal: React.FC<IssueEquipmentModalProps> = ({ open, onClose, equipment, orgId, refresh }) => {
  const [member, setMember] = useState<UserResult | null>(null);
  const [notes, setNotes] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [issuer, setIssuer] = useState<{ first_name?: string; last_name?: string; email: string } | null>(null);

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
        if (currentUser) setIssuer(currentUser);
      }
    }
    fetchUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !userId || !orgId) {
      setError("Please select a member and ensure you are logged in.");
      return;
    }
    setLoading(true);
    setError(null);
    const payload = {
      equipment_id: equipment.id,
      issued_to: member.id,
      issued_by: userId,
      issued_at: new Date().toISOString(),
      notes,
      organization_id: orgId,
      expected_return_date: expectedReturnDate ? expectedReturnDate.toISOString().slice(0, 10) : null,
    };
    const res = await fetch("/api/equipment_issuance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      refresh?.();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to issue equipment");
    }
    setLoading(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-0 w-full max-w-md shadow-xl border border-gray-100">
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-2xl font-bold text-center mb-6">Issue Equipment</h3>
          <div className="bg-muted rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs font-medium">Equipment</span>
                <span className="font-semibold">
                  {equipment.name}
                  {equipment.serial_number && (
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">{equipment.serial_number}</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs font-medium">Issued By</span>
                <span className="font-semibold">
                  {issuer ? ((issuer.first_name || issuer.last_name) ? `${issuer.first_name ?? ''} ${issuer.last_name ?? ''}`.trim() : issuer.email) : '—'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs font-medium">Issued Date</span>
                <span className="font-semibold">
                  {format(new Date(), 'd MMMM yyyy')}
                </span>
              </div>
            </div>
          </div>
          {/* Member select, expected return date, and notes outside the grey div */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Member</label>
            <MemberSelect value={member} onSelect={setMember} />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Expected Return Date <span className="text-xs text-gray-400">(optional)</span></label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={"w-full justify-start text-left font-normal " + (expectedReturnDate ? "" : "text-muted-foreground")}
                  type="button"
                >
                  {expectedReturnDate ? format(expectedReturnDate, "yyyy-MM-dd") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expectedReturnDate || undefined}
                  onSelect={date => setExpectedReturnDate(date ?? null)}
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
          {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-8 pb-6">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading} className="min-w-[90px]">Cancel</Button>
          <Button
            type="submit"
            disabled={loading || !member}
            className="min-w-[110px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
          >
            Issue
          </Button>
        </div>
      </form>
    </div>
  );
}; 