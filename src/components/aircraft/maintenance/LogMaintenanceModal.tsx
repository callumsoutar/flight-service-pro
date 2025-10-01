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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getCurrentUserClient } from "@/lib/SupabaseBrowserClient";
import { toast } from "sonner";
import { AircraftComponent } from "@/types/aircraft_components";

interface LogMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aircraft_id: string;
  component_id?: string | null;
}

const LogMaintenanceModal: React.FC<LogMaintenanceModalProps> = ({
  open,
  onOpenChange,
  aircraft_id,
  component_id,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  
  // Form state
  const [visitDate, setVisitDate] = useState<string>("");
  const [visitType, setVisitType] = useState("");
  const [description, setDescription] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [hoursAtVisit, setHoursAtVisit] = useState("");
  const [notes, setNotes] = useState("");
  const [dateOutOfMaintenance, setDateOutOfMaintenance] = useState<string>("");
  
  // Component due tracking
  const [componentDueHours, setComponentDueHours] = useState<string>("");
  const [componentDueDate, setComponentDueDate] = useState<string>("");
  
  // Next due values (calculated, but user can override)
  const [nextDueHours, setNextDueHours] = useState<string>("");
  const [nextDueDate, setNextDueDate] = useState<string>("");
  
  // Store component data for calculations
  const [componentData, setComponentData] = useState<AircraftComponent | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      // Reset form
      setVisitDate("");
      setVisitType("");
      setDescription("");
      setTotalCost("");
      setHoursAtVisit("");
      setNotes("");
      setDateOutOfMaintenance("");
      setComponentDueHours("");
      setComponentDueDate("");
      setNextDueHours("");
      setNextDueDate("");
      setComponentData(null);
      setError(null);
      
      // Get current user
      (async () => {
        const user = await getCurrentUserClient();
        if (user?.id) setUserId(user.id);
        else setUserId("");
      })();
    }
  }, [open]);

  // Fetch component details and set due values when component_id is provided
  useEffect(() => {
    if (open && component_id) {
      (async () => {
        try {
          const res = await fetch(`/api/aircraft_components?component_id=${component_id}`);
          if (res.ok) {
            const component: AircraftComponent = await res.json();
            setComponentData(component);
            
            // Display the effective due hours (WITH extension if applied)
            // This is for reporting purposes - to show how early/late maintenance was performed
            // relative to the extended deadline
            if (component.current_due_hours !== null && component.current_due_hours !== undefined) {
              let effectiveDueHours = Number(component.current_due_hours);
              
              // Add extension if applicable
              if (component.extension_limit_hours && component.interval_hours) {
                const extensionHours = (Number(component.interval_hours) * Number(component.extension_limit_hours)) / 100;
                effectiveDueHours = effectiveDueHours + extensionHours;
              }
              
              setComponentDueHours(String(effectiveDueHours));
            }
            
            // Store the due date
            if (component.current_due_date) {
              setComponentDueDate(component.current_due_date.split('T')[0]);
            }
            
            // Calculate next due hours (base + interval, no extension)
            if (component.current_due_hours !== null && component.interval_hours) {
              const nextDue = Number(component.current_due_hours) + Number(component.interval_hours);
              setNextDueHours(String(nextDue));
            }
          }
        } catch (err) {
          console.error('Failed to fetch component details:', err);
        }
      })();
    }
  }, [open, component_id]);
  
  // Calculate next due date when visitDate changes
  useEffect(() => {
    if (componentData && visitDate && componentData.interval_days) {
      const intervalType = componentData.interval_type;
      if (intervalType === 'CALENDAR' || intervalType === 'BOTH') {
        const baseDate = new Date(visitDate);
        const nextDue = new Date(baseDate.getTime() + Number(componentData.interval_days) * 24 * 60 * 60 * 1000);
        setNextDueDate(nextDue.toISOString().split('T')[0]);
      }
    }
  }, [visitDate, componentData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!visitDate || !visitType || !description || !userId) {
      setError("Visit date, type, description, and user are required.");
      toast.error("Visit date, type, description, and user are required.");
      return;
    }
    setLoading(true);
    const payload = {
      aircraft_id,
      component_id: component_id || null,
      visit_date: new Date(visitDate).toISOString(),
      visit_type: visitType,
      description: description.trim(),
      total_cost: totalCost ? parseFloat(totalCost) : null,
      hours_at_visit: hoursAtVisit ? parseFloat(hoursAtVisit) : null,
      notes: notes.trim() || null,
      date_out_of_maintenance: dateOutOfMaintenance ? new Date(dateOutOfMaintenance).toISOString() : null,
      performed_by: userId,
      component_due_hours: componentDueHours ? parseFloat(componentDueHours) : null,
      component_due_date: componentDueDate || null,
      next_due_hours: nextDueHours ? parseFloat(nextDueHours) : null,
      next_due_date: nextDueDate || null,
    };
    const res = await fetch("/api/maintenance_visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success("Maintenance visit logged successfully.");
      onOpenChange(false);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to log maintenance visit");
      toast.error(data.error || "Failed to log maintenance visit");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[700px] max-w-[98vw] mx-auto p-8 bg-white rounded-2xl shadow-xl border border-muted overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Log Maintenance Visit</DialogTitle>
          <DialogDescription className="mb-2 text-base text-muted-foreground font-normal">Record a completed maintenance visit for this aircraft.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1">Visit Date *</label>
              <Input
                type="date"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1">Visit Type *</label>
              <Select value={visitType} onValueChange={setVisitType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select visit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Unscheduled">Unscheduled</SelectItem>
                  <SelectItem value="Inspection">Inspection</SelectItem>
                  <SelectItem value="Repair">Repair</SelectItem>
                  <SelectItem value="Modification">Modification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1">Description *</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the maintenance work performed..."
              className="min-h-[60px]"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1">Total Cost</label>
              <Input
                type="number"
                step="0.01"
                value={totalCost}
                onChange={e => setTotalCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1">Hours at Visit</label>
              <Input
                type="number"
                step="0.1"
                value={hoursAtVisit}
                onChange={e => setHoursAtVisit(e.target.value)}
                placeholder="0.0"
              />
            </div>
          </div>
          
          {/* Component Due Tracking - Only show if logging maintenance for a component */}
          {component_id && (
            <>
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Component Due At Maintenance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1">Component Due Hours</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={componentDueHours}
                      onChange={e => setComponentDueHours(e.target.value)}
                      placeholder="Component due hours"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Hours component was due (including extension)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1">Component Due Date</label>
                    <Input
                      type="date"
                      value={componentDueDate}
                      onChange={e => setComponentDueDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Date component was due</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3 text-green-600">Next Due Values (After This Maintenance)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1">Next Due Hours</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={nextDueHours}
                      onChange={e => setNextDueHours(e.target.value)}
                      placeholder="Next due hours"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Calculated: current due + interval (editable)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1">Next Due Date</label>
                    <Input
                      type="date"
                      value={nextDueDate}
                      onChange={e => setNextDueDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Calculated: visit date + interval (editable)</p>
                  </div>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="text-sm font-medium mb-1">Date Out of Maintenance</label>
            <Input
              type="date"
              value={dateOutOfMaintenance}
              onChange={e => setDateOutOfMaintenance(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1">Notes</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="min-h-[60px]"
            />
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" disabled={loading}>{loading ? "Logging..." : "Log Visit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LogMaintenanceModal; 