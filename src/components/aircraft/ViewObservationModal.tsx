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
import { ObservationStatus, ObservationStage } from '@/types/observations';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MessageSquare, Calendar, User, Eye } from "lucide-react";

const OBSERVATION_STATUSES: ObservationStatus[] = ["low", "medium", "high"];
const OBSERVATION_STAGES: ObservationStage[] = ["open", "investigation", "resolution", "closed"];

// Helper functions for styling
const getStatusColor = (status: ObservationStatus): string => {
  switch (status) {
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
      <DialogContent className="w-[900px] max-w-[98vw] mx-auto p-0 bg-white rounded-2xl shadow-xl border-0 overflow-hidden max-h-[90vh]">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
              <Eye className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-1">Observation Details</DialogTitle>
              <DialogDescription className="text-slate-600 text-sm">
                View and manage observation information
              </DialogDescription>
            </div>
          </div>
          {observation && (
            <div className="flex items-center gap-3 mt-4">
              <Badge className={`${getStageColor(observation.observation_stage)} border font-medium`}>
                {observation.observation_stage}
              </Badge>
              <Badge className={`${getStatusColor(observation.status)} border font-medium`}>
                {observation.status} priority
              </Badge>
              <div className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
                <Calendar className="w-3 h-3" />
                Created {format(new Date(observation.created_at), 'dd MMM yyyy')}
              </div>
            </div>
          )}
        </div>
        
        {/* Scrollable content area */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-8 py-6">
          {loadingObs ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-32" />
              <Skeleton className="w-full h-48" />
            </div>
          ) : observation ? (
            <Card className="border-0 shadow-sm bg-white mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Observation Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveEdit} className="space-y-6">
                  {/* Name field - full width */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Name
                      <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      required 
                      autoFocus 
                      className="text-base border-slate-200 focus:border-orange-300 focus:ring-orange-200"
                      placeholder="Enter observation name..."
                    />
                  </div>

                  {/* Status and Stage in a row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        Priority Level
                        <span className="text-red-500">*</span>
                      </label>
                      <Select value={editStatus} onValueChange={val => setEditStatus(val as ObservationStatus)}>
                        <SelectTrigger className="w-full border-slate-200 focus:border-orange-300 focus:ring-orange-200">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {OBSERVATION_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  s === 'low' ? 'bg-green-500' : 
                                  s === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                {s.charAt(0).toUpperCase() + s.slice(1)} Priority
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        Current Stage
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <Textarea 
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)} 
                      placeholder="Provide additional details about this observation..."
                      className="min-h-[80px] border-slate-200 focus:border-orange-300 focus:ring-orange-200 resize-none"
                    />
                  </div>

                  {/* Error display */}
                  {editError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-red-800 text-sm font-medium">{editError}</div>
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={editLoading || !editName || !editStatus || !editStage}
                      className="min-w-[120px] bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition-colors"
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
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
                    {comments.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingComments ? (
                <div className="space-y-3">
                  <Skeleton className="w-full h-16" />
                  <Skeleton className="w-full h-16" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Existing comments */}
                  {comments.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <div className="text-slate-600 font-medium">No comments yet</div>
                      <div className="text-slate-500 text-sm">Be the first to add a comment</div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {comments.map((c) => (
                        <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 truncate">{getUserName(c.user_id)}</div>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(c.created_at), 'dd MMM yyyy · HH:mm')}
                              </div>
                            </div>
                          </div>
                          <div className="text-slate-700 whitespace-pre-line leading-relaxed pl-10">
                            {c.comment}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new comment form */}
                  <div className="pt-4 border-t border-slate-200">
                    <form onSubmit={handleAddComment} className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Add a comment</label>
                        <Textarea
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Share your thoughts about this observation..."
                          className="min-h-[80px] border-slate-200 focus:border-blue-300 focus:ring-blue-200 resize-none"
                          disabled={addingComment}
                        />
                      </div>
                      
                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-red-800 text-sm font-medium">{error}</div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={addingComment || !commentText.trim()}
                          className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition-colors"
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