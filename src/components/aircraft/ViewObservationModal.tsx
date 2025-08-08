import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getCurrentUserClient } from "@/lib/SupabaseBrowserClient";
import type { Observation } from '@/types/observations';
import type { ObservationComment } from '@/types/observation_comments';
import type { UserResult } from '@/components/invoices/MemberSelect';
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ObservationStatus, ObservationStage } from '@/types/observations';
import { toast } from "sonner";

const OBSERVATION_STATUSES: ObservationStatus[] = ["low", "medium", "high"];
const OBSERVATION_STAGES: ObservationStage[] = ["open", "investigation", "resolution", "closed"];

interface ViewObservationModalProps {
  open: boolean;
  onClose: () => void;
  observationId: string;
}

export const ViewObservationModal: React.FC<ViewObservationModalProps> = ({ open, onClose, observationId }) => {
  const [observation, setObservation] = useState<Observation | null>(null);
  const [loadingObs, setLoadingObs] = useState(false);
  const [comments, setComments] = useState<ObservationComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [userMap, setUserMap] = useState<Record<string, UserResult>>({});

  // Editable observation fields
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<ObservationStatus>("low");
  const [editStage, setEditStage] = useState<ObservationStage>("open");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Populate edit fields when observation loads
  useEffect(() => {
    if (observation) {
      setEditName(observation.name);
      setEditDescription(observation.description || "");
      setEditStatus(observation.status);
      setEditStage(observation.observation_stage);
    }
  }, [observation]);

  // Fetch logged in user id
  useEffect(() => {
    if (!open) return;
    (async () => {
      const user = await getCurrentUserClient();
      if (user?.id) setUserId(user.id);
      else setUserId("");
    })();
  }, [open]);

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

  // Fetch comments
  useEffect(() => {
    if (!open || !observationId) return;
    setLoadingComments(true);
    fetch(`/api/observation_comments?defect_id=${observationId}`)
      .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch comments"))
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [open, observationId]);

  // Fetch user map for comments and observation
  useEffect(() => {
    if (!open) return;
    const userIds = [
      ...(observation ? [observation.user_id] : []),
      ...comments.map(c => c.user_id)
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
  }, [open, observation, comments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!commentText.trim()) {
      setError("Comment cannot be empty.");
      toast.error("Comment cannot be empty.");
      return;
    }
    if (!userId) {
      setError("Could not determine logged in user.");
      toast.error("Could not determine logged in user.");
      return;
    }
    setAddingComment(true);
    const payload = {
      defect_id: observationId,
      user_id: userId,
      comment: commentText.trim(),
    };
    const res = await fetch("/api/observation_comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setCommentText("");
      // Refresh comments
      fetch(`/api/observation_comments?defect_id=${observationId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setComments(Array.isArray(data) ? data : []));
      toast.success("Comment added.");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add comment");
      toast.error(data.error || "Failed to add comment");
    }
    setAddingComment(false);
  };

  // Save handler
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (!editName || !editStatus || !editStage) {
      setEditError("Name, Status, and Stage are required.");
      return;
    }
    setEditLoading(true);
    const payload = {
      id: observationId,
      name: editName,
      description: editDescription || null,
      status: editStatus,
      observation_stage: editStage,
    };
    const res = await fetch("/api/observations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      // Refresh observation details
      fetch(`/api/observations?id=${observationId}`)
        .then(res => res.ok ? res.json() : null)
        .then(setObservation);
      toast.success("Observation changes saved.");
    } else {
      const data = await res.json();
      setEditError(data.error || "Failed to update observation");
      toast.error(data.error || "Failed to update observation");
    }
    setEditLoading(false);
  }

  const getUserName = (id: string) => {
    const u = userMap[id];
    if (!u) return "Unknown";
    return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="w-[900px] max-w-[98vw] mx-auto p-10 bg-white rounded-2xl shadow-xl border border-muted overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Observation Details</DialogTitle>
          <DialogDescription className="mb-2 text-base text-muted-foreground font-normal">View details and comments for this observation.</DialogDescription>
        </DialogHeader>
        {loadingObs ? (
          <Skeleton className="w-full h-32" />
        ) : observation ? (
          <form onSubmit={handleSaveEdit} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
              <div className="flex flex-col md:col-span-2">
                <label className="text-sm font-medium mb-1">Name *</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} required autoFocus />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Status *</label>
                <Select value={editStatus} onValueChange={val => setEditStatus(val as ObservationStatus)}>
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
                <Select value={editStage} onValueChange={val => setEditStage(val as ObservationStage)}>
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
                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Optional description..." className="min-h-[60px]" />
              </div>
            </div>
            {editError && <div className="text-red-600 text-sm mb-2 text-center">{editError}</div>}
            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={editLoading || !editName || !editStatus || !editStage}
                className="min-w-[110px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
              >
                {editLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-red-600">Observation not found.</div>
        )}
        <div className="border-t pt-6 mt-2">
          <div className="text-xl font-semibold mb-4">Comments</div>
          {loadingComments ? (
            <Skeleton className="w-full h-24" />
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6">
              {comments.length === 0 ? (
                <div className="text-muted-foreground text-center">No comments yet.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-gray-50 border rounded-lg p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{getUserName(c.user_id)}</span>
                      <span className="text-xs text-gray-400">{format(new Date(c.created_at), 'dd MMM yyyy · HH:mm')}</span>
                    </div>
                    <div className="text-base whitespace-pre-line">{c.comment}</div>
                  </div>
                ))
              )}
            </div>
          )}
          <form onSubmit={handleAddComment} className="flex flex-col gap-2">
            <Textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[60px]"
              disabled={addingComment}
            />
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <div className="flex justify-end">
              <Button
                type="submit"
                // Remove variant outline for a custom style
                disabled={addingComment || !commentText.trim()}
                className="min-w-[110px] bg-gray-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-50 font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow-sm transition-colors"
              >
                {addingComment ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </form>
        </div>
        <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 