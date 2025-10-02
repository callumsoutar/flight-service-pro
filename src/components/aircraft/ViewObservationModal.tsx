import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
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
import { ObservationStage } from '@/types/observations';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MessageSquare, Calendar, User, Eye } from "lucide-react";

const OBSERVATION_PRIORITIES = ["low", "medium", "high"];
const OBSERVATION_STAGES: ObservationStage[] = ["open", "investigation", "resolution", "closed"];

// Helper functions for styling  
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};


const getStageColor = (stage: ObservationStage): string => {
  switch (stage) {
    case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'investigation': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'resolution': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

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
  const [editPriority, setEditPriority] = useState<string>("medium");
  const [editStage, setEditStage] = useState<ObservationStage>("open");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Populate edit fields when observation loads
  useEffect(() => {
    if (observation) {
      setEditName(observation.name);
      setEditDescription(observation.description || "");
      setEditPriority(observation.priority || "medium");
      setEditStage(observation.stage);
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
      ...(observation ? [observation.reported_by] : []),
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
      const errorMsg = typeof data.error === 'string' 
        ? data.error 
        : data.error?.formErrors?.[0] || JSON.stringify(data.error) || "Failed to add comment";
      setError(errorMsg);
      toast.error(errorMsg);
    }
    setAddingComment(false);
  };

  // Save handler
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (!editName || !editStage) {
      setEditError("Name and Stage are required.");
      return;
    }
    setEditLoading(true);
    const payload = {
      id: observationId,
      name: editName,
      description: editDescription || null,
      priority: editPriority,
      stage: editStage,
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
      const errorMsg = typeof data.error === 'string' 
        ? data.error 
        : data.error?.formErrors?.[0] || JSON.stringify(data.error) || "Failed to update observation";
      setEditError(errorMsg);
      toast.error(errorMsg);
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
      <DialogContent className="w-[750px] max-w-[95vw] mx-auto p-0 bg-white rounded-xl shadow-xl border-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 bg-orange-100 rounded-lg">
              <Eye className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-slate-900">Observation Details</DialogTitle>
              <DialogDescription className="text-slate-600 text-xs">
                View and manage observation information
              </DialogDescription>
            </div>
            {observation && (
              <div className="flex items-center gap-2">
                <Badge className={`${getStageColor(observation.stage)} border text-xs`}>
                  {observation.stage}
                </Badge>
                <Badge className={`${getPriorityColor(observation.priority || 'medium')} border text-xs`}>
                  Priority: {observation.priority || 'medium'}
                </Badge>
              </div>
            )}
          </div>
          {observation && (
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-2 ml-11">
              <Calendar className="w-3 h-3" />
              Created {format(new Date(observation.created_at), 'dd MMM yyyy')}
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loadingObs ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-32" />
              <Skeleton className="w-full h-48" />
            </div>
          ) : observation ? (
            <Card className="border shadow-sm bg-white mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Observation Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  {/* Name field - full width */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Name
                      <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      required 
                      autoFocus 
                      className="border-slate-200 focus:border-orange-300 focus:ring-orange-200"
                      placeholder="Enter observation name..."
                    />
                  </div>

                  {/* Priority and Stage in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        Priority Level
                        <span className="text-red-500">*</span>
                      </label>
                      <Select value={editPriority} onValueChange={val => setEditPriority(val)}>
                        <SelectTrigger className="w-full border-slate-200 focus:border-orange-300 focus:ring-orange-200">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {OBSERVATION_PRIORITIES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  s === 'low' ? 'bg-green-500' : 
                                  s === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        Stage
                        <span className="text-red-500">*</span>
                      </label>
                      <Select value={editStage} onValueChange={val => setEditStage(val as ObservationStage)}>
                        <SelectTrigger className="w-full border-slate-200 focus:border-orange-300 focus:ring-orange-200">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {OBSERVATION_STAGES.map((t) => (
                            <SelectItem key={t} value={t} className="capitalize">
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description field */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <Textarea 
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)} 
                      placeholder="Provide additional details about this observation..."
                      className="min-h-[70px] border-slate-200 focus:border-orange-300 focus:ring-orange-200 resize-none"
                    />
                  </div>

                  {/* Error display */}
                  {editError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                      <div className="text-red-800 text-sm font-medium">{editError}</div>
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={editLoading || !editName || !editStage}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm"
                    >
                      {editLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <div className="text-red-600 font-medium">Observation not found</div>
              <div className="text-slate-500 text-sm mt-1">The requested observation could not be loaded.</div>
            </div>
          )}
          {/* Comments Section */}
          <Card className="border shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-2 py-0">
                    {comments.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingComments ? (
                <div className="space-y-2">
                  <Skeleton className="w-full h-14" />
                  <Skeleton className="w-full h-14" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Existing comments */}
                  {comments.length === 0 ? (
                    <div className="text-center py-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-sm">No comments yet</div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {comments.map((c) => (
                        <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
                          <div className="flex items-start gap-2 mb-1">
                            <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full flex-shrink-0">
                              <User className="w-3 h-3 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 text-xs">{getUserName(c.user_id)}</div>
                              <div className="text-xs text-slate-500">
                                {format(new Date(c.created_at), 'dd MMM yyyy · HH:mm')}
                              </div>
                            </div>
                          </div>
                          <div className="text-slate-700 text-xs whitespace-pre-line pl-8">
                            {c.comment}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new comment form */}
                  <div className="pt-2.5 border-t border-slate-200">
                    <form onSubmit={handleAddComment} className="space-y-2">
                      <Textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="min-h-[60px] border-slate-200 focus:border-blue-300 focus:ring-blue-200 resize-none text-xs"
                        disabled={addingComment}
                      />

                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-800 text-xs">
                          {error}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={addingComment || !commentText.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                        >
                          {addingComment ? "Adding..." : "Add Comment"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 