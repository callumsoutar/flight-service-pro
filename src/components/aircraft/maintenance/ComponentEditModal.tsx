"use client";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import React, { useState, useEffect } from "react";
import { AircraftComponent, ComponentType, IntervalType, ComponentStatus } from "@/types/aircraft_components";
import { Info, Repeat, Calendar, Settings2, StickyNote, ArrowUpRight, Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ComponentEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: AircraftComponent | null;
  onSave: (updated: Partial<AircraftComponent>) => void;
}

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"];
const STATUS_OPTIONS = ["active", "inactive", "removed"];
const COMPONENT_TYPE_OPTIONS: ComponentType[] = [
  "battery","inspection","service","engine","fuselage","avionics","elt","propeller","landing_gear","other"
];
const INTERVAL_TYPE_OPTIONS: IntervalType[] = ["HOURS","CALENDAR","BOTH"];

const ComponentEditModal: React.FC<ComponentEditModalProps> = ({ open, onOpenChange, component, onSave }) => {
  // All fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [componentType, setComponentType] = useState<ComponentType>("inspection");
  const [intervalType, setIntervalType] = useState<IntervalType>("HOURS");
  const [intervalHours, setIntervalHours] = useState<number | null>(null);
  const [intervalDays, setIntervalDays] = useState<number | null>(null);
  const [currentDueDate, setCurrentDueDate] = useState<Date | null>(null);
  const [currentDueHours, setCurrentDueHours] = useState<number | null>(null);
  const [lastCompletedDate, setLastCompletedDate] = useState<Date | null>(null);
  const [lastCompletedHours, setLastCompletedHours] = useState<number | null>(null);
  const [status, setStatus] = useState<ComponentStatus>("active");
  const [priority, setPriority] = useState<string | null>("MEDIUM");
  const [notes, setNotes] = useState<string>("");
  const [loadingExtend, setLoadingExtend] = useState(false);
  const [revertLoading, setRevertLoading] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  useEffect(() => {
    if (component) {
      setName(component.name || "");
      setDescription(component.description || "");
      setComponentType(component.component_type || "inspection");
      setIntervalType(component.interval_type || "HOURS");
      setIntervalHours(component.interval_hours ?? null);
      setIntervalDays(component.interval_days ?? null);
      setCurrentDueDate(component.current_due_date ? new Date(component.current_due_date) : null);
      setCurrentDueHours(component.current_due_hours ?? null);
      setLastCompletedDate(component.last_completed_date ? new Date(component.last_completed_date) : null);
      setLastCompletedHours(component.last_completed_hours ?? null);
      setStatus(component.status || "active");
      setPriority(component.priority || "MEDIUM");
      setNotes(component.notes || "");
    }
  }, [component, open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      description,
      component_type: componentType,
      interval_type: intervalType,
      interval_hours: intervalHours,
      interval_days: intervalDays,
      current_due_date: currentDueDate ? currentDueDate.toISOString().split('T')[0] : null,
      current_due_hours: currentDueHours,
      last_completed_date: lastCompletedDate ? lastCompletedDate.toISOString().split('T')[0] : null,
      last_completed_hours: lastCompletedHours,
      status: status as ComponentStatus,
      priority,
      notes,
    };
    console.log('ComponentEditModal handleSave payload:', payload);
    // Await onSave in case it's async
    await Promise.resolve(onSave(payload));
    onOpenChange(false);
  }

  async function handleExtend() {
    if (!component) return;
    setLoadingExtend(true);
    try {
      const res = await fetch("/api/aircraft_components", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: component.id, extension_limit_hours: 10 }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to extend component");
        setLoadingExtend(false);
        return;
      }
      toast.success("Component extension applied!", { description: "Extension limit set to 10 hours" });
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 1200); // Give time for toast to show
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to extend component");
      } else {
        toast.error("Failed to extend component");
      }
    } finally {
      setLoadingExtend(false);
    }
  }

  async function handleRevertExtension() {
    if (!component) return;
    setRevertLoading(true);
    try {
      const res = await fetch("/api/aircraft_components", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: component.id, extension_limit_hours: null }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to revert extension");
        setRevertLoading(false);
        return;
      }
      toast.success("Extension reverted. Component is now back to original due logic.");
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 1200);
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message || "Failed to revert extension");
      } else {
        toast.error("Failed to revert extension");
      }
    } finally {
      setRevertLoading(false);
      setShowRevertConfirm(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[700px] max-w-[98vw] mx-auto p-10 bg-white rounded-2xl shadow-xl border border-muted overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Edit Component</DialogTitle>
          <DialogDescription className="mb-2 text-base text-muted-foreground font-normal">Update all details for this aircraft component.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-8 w-full" onSubmit={handleSave}>
          {/* Component Info */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold">Component Info</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-medium mb-1">Name <span className="text-red-500">*</span></label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 100 Hour Inspection" required />
              </div>
              <div>
                <label className="block font-medium mb-1">Component Type <span className="text-red-500">*</span></label>
                <Select value={componentType} onValueChange={v => setComponentType(v as ComponentType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add any notes or details about this component..." />
              </div>
            </div>
          </div>
          <hr className="my-2 border-muted" />
          {/* Dates & Hours */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold">Dates & Hours</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-medium mb-1">Last Completed Hours</label>
                <Input type="number" value={lastCompletedHours ?? ""} onChange={e => setLastCompletedHours(e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label className="block font-medium mb-1">Last Completed Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={
                        "w-full justify-start text-left font-normal " +
                        (!lastCompletedDate ? "text-muted-foreground" : "")
                      }
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lastCompletedDate ? format(lastCompletedDate, "dd MMM yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={lastCompletedDate ?? undefined}
                      onSelect={date => setLastCompletedDate(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Separated section for current due and extension */}
              <div className="bg-gray-100 rounded-xl p-4 flex flex-col gap-4">
                <div>
                  <label className="block font-medium mb-1">Current Due Hours</label>
                  <Input type="number" value={currentDueHours ?? ""} onChange={e => setCurrentDueHours(e.target.value ? Number(e.target.value) : null)} className="bg-white" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Current Due Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={
                          "w-full justify-start text-left font-normal bg-white " +
                          (!currentDueDate ? "text-muted-foreground" : "")
                        }
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {currentDueDate ? format(currentDueDate, "dd MMM yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={currentDueDate ?? undefined}
                        onSelect={date => setCurrentDueDate(date ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    onClick={handleExtend}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md flex items-center gap-2"
                    disabled={loadingExtend || !component || component.extension_limit_hours !== null}
                  >
                    {loadingExtend ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                    {loadingExtend ? "Extending..." : "Extend by 10%"}
                  </Button>
                  {component && component.extension_limit_hours !== null && (
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full sm:w-auto font-semibold shadow-md flex items-center gap-2"
                      disabled={revertLoading}
                      onClick={() => setShowRevertConfirm(true)}
                    >
                      {revertLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5 rotate-180" />}
                      {revertLoading ? "Reverting..." : "Revert Extension"}
                    </Button>
                  )}
                </div>
                {/* Confirmation Dialog */}
                {showRevertConfirm && (
                  <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2">
                    <div className="text-sm text-red-700 font-medium">Are you sure you want to revert the extension? This will remove the current extension limit and restore the original due logic.</div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="destructive" onClick={handleRevertExtension} disabled={revertLoading}>Yes, Revert</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowRevertConfirm(false)} disabled={revertLoading}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <hr className="my-2 border-muted" />
          {/* Intervals */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold">Intervals</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-medium mb-1">Interval Type <span className="text-red-500">*</span></label>
                <Select value={intervalType} onValueChange={v => setIntervalType(v as IntervalType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(intervalType === "HOURS" || intervalType === "BOTH") && (
                <div>
                  <label className="block font-medium mb-1">Interval Hours <span className="text-red-500">*</span></label>
                  <Input type="number" value={intervalHours ?? ""} onChange={e => setIntervalHours(e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 100" />
                </div>
              )}
              {(intervalType === "CALENDAR" || intervalType === "BOTH") && (
                <div>
                  <label className="block font-medium mb-1">Interval Days <span className="text-red-500">*</span></label>
                  <Input type="number" value={intervalDays ?? ""} onChange={e => setIntervalDays(e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 365" />
                </div>
              )}
            </div>
          </div>
          <hr className="my-2 border-muted" />
          {/* Status & Priority */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold">Status & Priority</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-medium mb-1">Status <span className="text-red-500">*</span></label>
                <Select value={status} onValueChange={v => setStatus(v as ComponentStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block font-medium mb-1">Priority</label>
                <Select value={priority || ""} onValueChange={v => setPriority(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <hr className="my-2 border-muted" />
          {/* Notes Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold">Notes</h3>
            </div>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
          </div>
          <DialogFooter className="pt-8 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" disabled={!component}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ComponentEditModal; 