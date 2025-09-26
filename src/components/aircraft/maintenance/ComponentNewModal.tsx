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
import React, { useState, useEffect } from "react";
import { AircraftComponent, ComponentType, IntervalType, ComponentStatus } from "@/types/aircraft_components";
import { Info, Repeat, Calendar, Settings2, StickyNote } from "lucide-react";

interface ComponentNewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newComponent: Partial<AircraftComponent>) => void;
}

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"];
const STATUS_OPTIONS = ["active", "inactive", "removed"];
const COMPONENT_TYPE_OPTIONS: ComponentType[] = [
  "battery","inspection","service","engine","fuselage","avionics","elt","propeller","landing_gear","other"
];
const INTERVAL_TYPE_OPTIONS: IntervalType[] = ["HOURS","CALENDAR","BOTH"];

const ComponentNewModal: React.FC<ComponentNewModalProps> = ({ open, onOpenChange, onSave }) => {
  // All fields (no prefill)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [componentType, setComponentType] = useState<ComponentType>("inspection");
  const [intervalType, setIntervalType] = useState<IntervalType>("HOURS");
  const [intervalHours, setIntervalHours] = useState<number | null>(null);
  const [intervalDays, setIntervalDays] = useState<number | null>(null);
  const [currentDueDate, setCurrentDueDate] = useState<string>("");
  const [currentDueHours, setCurrentDueHours] = useState<number | null>(null);
  const [lastCompletedDate, setLastCompletedDate] = useState<string>("");
  const [lastCompletedHours, setLastCompletedHours] = useState<number | null>(null);
  const [status, setStatus] = useState<ComponentStatus>("active");
  const [priority, setPriority] = useState<string | null>("MEDIUM");
  const [notes, setNotes] = useState<string>("");

  // Reset fields when modal opens
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setComponentType("inspection");
      setIntervalType("HOURS");
      setIntervalHours(null);
      setIntervalDays(null);
      setCurrentDueDate("");
      setCurrentDueHours(null);
      setLastCompletedDate("");
      setLastCompletedHours(null);
      setStatus("active");
      setPriority("MEDIUM");
      setNotes("");
    }
  }, [open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      description,
      component_type: componentType,
      interval_type: intervalType,
      interval_hours: intervalHours,
      interval_days: intervalDays,
      current_due_date: currentDueDate === "" ? null : currentDueDate,
      current_due_hours: currentDueHours,
      last_completed_date: lastCompletedDate === "" ? null : lastCompletedDate,
      last_completed_hours: lastCompletedHours,
      status: status as ComponentStatus,
      priority,
      notes,
    };
    try {
      await onSave(payload);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save component:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[700px] max-w-[98vw] mx-auto p-10 bg-white rounded-2xl shadow-xl border border-muted overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Create Component</DialogTitle>
          <DialogDescription className="mb-2 text-base text-muted-foreground font-normal">Enter details for the new aircraft component.</DialogDescription>
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
                <Input type="date" value={lastCompletedDate || ""} onChange={e => setLastCompletedDate(e.target.value)} />
              </div>
              {/* Separated section for current due and extension */}
              <div className="bg-gray-100 rounded-xl p-4 flex flex-col gap-4">
                <div>
                  <label className="block font-medium mb-1">Current Due Hours</label>
                  <Input type="number" value={currentDueHours ?? ""} onChange={e => setCurrentDueHours(e.target.value ? Number(e.target.value) : null)} className="bg-white" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Current Due Date</label>
                  <Input type="date" value={currentDueDate || ""} onChange={e => setCurrentDueDate(e.target.value)} className="bg-white" />
                </div>
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
            <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md">Create Component</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ComponentNewModal; 