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
import type { Observation } from '@/types/observations';
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ObservationStage } from '@/types/observations';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Calendar, Eye } from "lucide-react";

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
    case 'resolution': return 'bg-[#89d2dc]/20 text-[#6564db] border-[#89d2dc]/40';
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
      // Normalize priority value
      const normalizedPriority = (observation.priority || "medium").toLowerCase().trim();
      const validPriority = OBSERVATION_PRIORITIES.includes(normalizedPriority) ? normalizedPriority : "medium";
      setEditPriority(validPriority);
      // Normalize stage value to ensure it matches the expected ObservationStage type
      const normalizedStage = (observation.stage || "open").toLowerCase().trim() as ObservationStage;
      // Validate it's a valid stage, fallback to 'open' if not
      const validStage = OBSERVATION_STAGES.includes(normalizedStage) ? normalizedStage : "open";
      setEditStage(validStage);
    }
  }, [observation]);


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
                      <Select value={editPriority || "medium"} onValueChange={val => setEditPriority(val)}>
                        <SelectTrigger className="w-full border-slate-200 focus:border-orange-300 focus:ring-orange-200">
                          <SelectValue />
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
                      <Select value={editStage || "open"} onValueChange={val => setEditStage(val as ObservationStage)}>
                        <SelectTrigger className="w-full border-slate-200 focus:border-orange-300 focus:ring-orange-200">
                          <SelectValue />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}; 