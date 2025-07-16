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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserClient } from "@/lib/SupabaseBrowserClient";
import type { Observation } from '@/types/observations';
import type { UserResult } from '@/components/invoices/MemberSelect';
import { format } from "date-fns";
import { toast } from "sonner";
import { User as UserIcon, Clock as ClockIcon } from "lucide-react";

interface ResolveObservationModalProps {
  open: boolean;
  onClose: () => void;
  observationId: string;
  refresh?: () => void;
}

// Type for Zod/API error object
type ZodApiError = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
};

export const ResolveObservationModal: React.FC<ResolveObservationModalProps> = ({ open, onClose, observationId, refresh }) => {
  const [observation, setObservation] = useState<Observation | null>(null);
  const [loadingObs, setLoadingObs] = useState(false);
  const [resolvedAt, setResolvedAt] = useState("");
  const [resolutionComments, setResolutionComments] = useState("");
  const [closedBy, setClosedBy] = useState<string>("");
  const [userMap, setUserMap] = useState<Record<string, UserResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch observation details
  useEffect(() => {
    if (!open || !observationId) return;
    setLoadingObs(true);
    fetch(`/api/observations?id=${observationId}`)
      .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch observation"))
      .then(setObservation)
      .catch(() => setObservation(null))
      .finally(() => setLoadingObs(false));
  }, [open, observationId]);

  // Fetch current user for closed_by (always use logged-in user)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const user = await getCurrentUserClient();
      if (user?.id) setClosedBy(user.id);
      else setClosedBy("");
    })();
  }, [open]);

  // Fetch user map for reporter and closed_by
  useEffect(() => {
    if (!open) return;
    const userIds = [
      ...(observation ? [observation.user_id] : []),
      closedBy
    ];
    const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
    if (uniqueIds.length === 0) return;
    fetch(`/api/users?${uniqueIds.map(id => `id=${id}`).join("&")}`)
      .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch users"))
      .then(data => {
        const users: UserResult[] = data.users || [];
        const map: Record<string, UserResult> = {};
        users.forEach(u => { map[u.id] = u; });
        setUserMap(map);
      })
      .catch(() => setUserMap({}));
  }, [open, observation, closedBy]);

  // Set default resolvedAt to today when modal opens
  useEffect(() => {
    if (open) {
      setResolvedAt(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const getUserName = (id: string) => {
    const u = userMap[id];
    if (!u) return "Unknown";
    return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Unknown";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!resolvedAt || !closedBy) {
      setError("Resolved date and closed by are required.");
      toast.error("Resolved date and closed by are required.");
      return;
    }
    setLoading(true);
    // Convert resolvedAt (YYYY-MM-DD) to ISO string (Z) for Zod .datetime()
    const resolvedAtIso = resolvedAt ? new Date(resolvedAt + 'T00:00:00Z').toISOString() : null;
    const payload = {
      id: observationId,
      resolved_at: resolvedAtIso,
      resolution_comments: resolutionComments || null,
      closed_by: closedBy, // always logged-in user
      observation_stage: 'closed',
    };
    const res = await fetch("/api/observations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success("Observation resolved and closed.");
      if (refresh) refresh();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to resolve observation");
      if (typeof data.error === 'object') {
        toast.error("Failed to resolve observation. See form for details.");
      } else {
        toast.error(data.error || "Failed to resolve observation");
      }
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="w-[700px] max-w-[98vw] mx-auto p-8 bg-white rounded-2xl shadow-xl border border-muted overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Resolve Observation</DialogTitle>
          <DialogDescription className="mb-2 text-base text-muted-foreground font-normal">Close out this observation with resolution details.</DialogDescription>
        </DialogHeader>
        {loadingObs ? (
          <Skeleton className="w-full h-32" />
        ) : observation ? (
          <div className="mb-6">
            <div className="bg-white/90 rounded-3xl p-8 flex flex-col gap-1 shadow border border-gray-100">
              <div className="text-xs text-gray-500 font-medium mb-0">Observation</div>
              <div className="text-lg font-semibold leading-tight mb-1 tracking-tight text-gray-900">{observation.name}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-700">{getUserName(observation.user_id)}</span>
                <span className="mx-1">·</span>
                <ClockIcon className="w-4 h-4 text-gray-400" />
                <span>{format(new Date(observation.created_at), 'dd MMM yyyy · HH:mm')}</span>
              </div>
              <div className="flex flex-row items-center gap-6 mt-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Stage</span>
                  <Badge className="text-xs px-4 py-1 rounded-full font-semibold bg-gray-100 border border-gray-200 text-gray-900" variant="outline">{observation.observation_stage}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Status</span>
                  <Badge className="text-xs px-4 py-1 rounded-full font-semibold bg-gray-100 border border-gray-200 text-gray-900" variant="outline">{observation.status}</Badge>
                </div>
              </div>
              {observation.description && (
                <>
                  <div className="h-px bg-gray-200 my-3" />
                  <div className="text-xs text-gray-500 font-medium mb-1 mt-2 text-left">Description</div>
                  <div className="text-base text-gray-700 whitespace-pre-line mt-1 text-left">{observation.description}</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-red-600">Observation not found.</div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1">Resolved At *</label>
            <Input type="date" value={resolvedAt} onChange={e => setResolvedAt(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1">Resolution Comments</label>
            <Textarea value={resolutionComments} onChange={e => setResolutionComments(e.target.value)} placeholder="Describe how this was resolved..." className="min-h-[60px]" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1">Closed By *</label>
            <Input value={getUserName(closedBy)} disabled className="bg-gray-100" />
          </div>
          {/* Error rendering: support string or object (Zod/API) errors */}
          {error && typeof error === 'string' && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          {error && typeof error === 'object' && error !== null && (
            <div className="text-red-600 text-sm text-center">
              {/* Render formErrors */}
              {('formErrors' in error) && Array.isArray((error as ZodApiError).formErrors) &&
                (error as ZodApiError).formErrors!.map((msg, i) => (
                  <div key={i}>{msg}</div>
                ))}
              {/* Render fieldErrors */}
              {('fieldErrors' in error) && typeof (error as ZodApiError).fieldErrors === 'object' &&
                Object.entries((error as ZodApiError).fieldErrors!).map(([field, messages]) =>
                  Array.isArray(messages) ? messages.map((msg, i) => (
                    <div key={field + i}>{field}: {msg}</div>
                  )) : null
                )
              }
            </div>
          )}
          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" disabled={loading}>{loading ? "Resolving..." : "Resolve & Close"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 