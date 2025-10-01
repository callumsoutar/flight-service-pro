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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getCurrentUserClient } from "@/lib/SupabaseBrowserClient";
import type { Observation } from '@/types/observations';
import type { UserResult } from '@/components/invoices/MemberSelect';
import { format } from "date-fns";
import { toast } from "sonner";
import { User as UserIcon, Clock as ClockIcon, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [resolvedAt, setResolvedAt] = useState<Date | null>(null);
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
      ...(observation ? [observation.reported_by] : []),
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
      setResolvedAt(new Date());
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
    // Convert resolvedAt Date to ISO string (Z) for Zod .datetime()
    const resolvedAtIso = new Date(resolvedAt.toISOString().split('T')[0] + 'T00:00:00Z').toISOString();
    const payload = {
      id: observationId,
      resolved_at: resolvedAtIso,
      resolution_comments: resolutionComments || null,
      closed_by: closedBy, // always logged-in user
      stage: 'closed',
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
      <DialogContent className="w-[650px] max-w-[95vw] mx-auto p-6 bg-white rounded-xl shadow-xl border-0 overflow-y-auto max-h-[85vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold">Resolve Observation</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">Close out this observation with resolution details.</DialogDescription>
        </DialogHeader>
        {loadingObs ? (
          <Skeleton className="w-full h-32" />
        ) : observation ? (
          <div className="mb-5">
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              {/* Header with name and badges */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 mb-1">{observation.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{getUserName(observation.reported_by)}</span>
                    <span>•</span>
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{format(new Date(observation.created_at), 'dd MMM yyyy')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`text-xs px-2.5 py-0.5 ${
                    observation.stage === 'open' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    observation.stage === 'investigation' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    observation.stage === 'resolution' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  } border`}>
                    {observation.stage}
                  </Badge>
                  <Badge className={`text-xs px-2.5 py-0.5 ${
                    observation.priority === 'low' ? 'bg-green-100 text-green-800 border-green-200' :
                    observation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-red-100 text-red-800 border-red-200'
                  } border`}>
                    {observation.priority || 'medium'}
                  </Badge>
                </div>
              </div>
              
              {/* Description */}
              {observation.description && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-sm text-slate-700 whitespace-pre-line">{observation.description}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-red-600">Observation not found.</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Resolved At <span className="text-red-500">*</span></label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal border-slate-200",
                    !resolvedAt && "text-muted-foreground"
                  )}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {resolvedAt ? format(resolvedAt, "dd MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={resolvedAt ?? undefined}
                  onSelect={(date) => setResolvedAt(date ?? null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Resolution Comments</label>
            <Textarea 
              value={resolutionComments} 
              onChange={e => setResolutionComments(e.target.value)} 
              placeholder="Describe how this was resolved..." 
              className="min-h-[70px] border-slate-200 resize-none" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Closed By <span className="text-red-500">*</span></label>
            <Input 
              value={getUserName(closedBy)} 
              disabled 
              className="bg-slate-100 text-slate-600 border-slate-200" 
            />
          </div>
          {/* Error rendering: support string or object (Zod/API) errors */}
          {error && typeof error === 'string' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
              <div className="text-red-800 text-sm font-medium">{error}</div>
            </div>
          )}
          {error && typeof error === 'object' && error !== null && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
              <div className="text-red-800 text-sm font-medium">
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
            </div>
          )}
          <DialogFooter className="pt-4 flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="border-slate-200" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm" 
              disabled={loading}
            >
              {loading ? "Resolving..." : "Resolve & Close"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 