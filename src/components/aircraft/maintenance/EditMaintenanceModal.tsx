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
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { MaintenanceVisit } from "@/types/maintenance_visits";

interface EditMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceVisitId: string | null;
  onSave?: () => void;
}

const EditMaintenanceModal: React.FC<EditMaintenanceModalProps> = ({
  open,
  onOpenChange,
  maintenanceVisitId,
  onSave,
}) => {
  // Visit fields
  const [visit, setVisit] = useState<MaintenanceVisit | null>(null);
  const [componentName, setComponentName] = useState<string | null>(null);
  // Form state
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [dateOutOfMaintenance, setDateOutOfMaintenance] = useState<Date | undefined>(undefined);
  const [visitType, setVisitType] = useState("");
  const [description, setDescription] = useState("");
  const [technician, setTechnician] = useState("");
  const [hoursAtVisit, setHoursAtVisit] = useState("");
  const [notes, setNotes] = useState("");
  // Total Cost
  const [totalCost, setTotalCost] = useState("");
  // Component due tracking
  const [componentDueHours, setComponentDueHours] = useState<string>("");
  const [componentDueDate, setComponentDueDate] = useState<string>("");
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Fetch visit on open
  useEffect(() => {
    if (!open || !maintenanceVisitId) return;
    setLoading(true);
    setError(null);
    setInitialLoaded(false);
    fetch(`/api/maintenance_visits?maintenance_visit_id=${maintenanceVisitId}`)
      .then(async (visitRes) => {
        const visitData = await visitRes.json();
        setVisit(visitData);
        setVisitDate(visitData?.visit_date ? parseISO(visitData.visit_date) : undefined);
        setDateOutOfMaintenance(visitData?.date_out_of_maintenance ? parseISO(visitData.date_out_of_maintenance) : undefined);
        setVisitType(visitData?.visit_type || "");
        setDescription(visitData?.description || "");
        setTechnician(visitData?.technician_name || "");
        setHoursAtVisit(visitData?.hours_at_visit !== null && visitData?.hours_at_visit !== undefined ? String(visitData.hours_at_visit) : "");
        setNotes(visitData?.notes || "");
        setTotalCost(visitData?.total_cost !== null && visitData?.total_cost !== undefined ? String(visitData.total_cost) : "");
        setComponentDueHours(visitData?.component_due_hours !== null && visitData?.component_due_hours !== undefined ? String(visitData.component_due_hours) : "");
        setComponentDueDate(visitData?.component_due_date ? visitData.component_due_date.split('T')[0] : "");

        // Fetch component name if component_id exists
        if (visitData?.component_id) {
          fetch(`/api/aircraft_components?component_id=${visitData.component_id}`)
            .then(res => res.json())
            .then(componentData => {
              if (componentData?.name) {
                setComponentName(componentData.name);
              }
            })
            .catch(() => {
              // Silently fail - component name is not critical
            });
        }

        setInitialLoaded(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, maintenanceVisitId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!visit) return;
    setLoading(true);
    setError(null);
    try {
      // PATCH maintenance visit
      const visitPayload = {
        id: visit.id,
        visit_date: visitDate ? visitDate.toISOString() : null,
        date_out_of_maintenance: dateOutOfMaintenance ? dateOutOfMaintenance.toISOString() : null,
        visit_type: visitType,
        description,
        technician_name: technician,
        hours_at_visit: hoursAtVisit ? Number(hoursAtVisit) : null,
        notes,
        total_cost: totalCost ? Number(totalCost) : null,
        component_due_hours: componentDueHours ? Number(componentDueHours) : null,
        component_due_date: componentDueDate || null,
      };
      const visitRes = await fetch("/api/maintenance_visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitPayload),
      });
      if (!visitRes.ok) {
        const errorData = await visitRes.json();
        throw new Error(errorData.error || "Failed to update maintenance visit");
      }
      if (onSave) onSave();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred");
      } else {
        setError("An error occurred");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[600px] max-w-[95vw] !max-w-none mx-auto p-6 max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-muted">
        <DialogHeader className="mb-4">
          <DialogTitle className="mt-4 text-3xl font-extrabold mb-1 tracking-tight">View/Edit Maintenance Visit & Cost</DialogTitle>
          <DialogDescription className="mb-4 text-base text-muted-foreground font-normal">Edit the details for this maintenance event and associated cost.</DialogDescription>
          {visit?.component_id && componentName && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2">
              <div className="text-sm font-medium text-blue-800">Component Maintenance</div>
              <div className="text-base text-blue-700">{componentName}</div>
            </div>
          )}
        </DialogHeader>
        {!initialLoaded ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
        <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
          {/* Maintenance Visit Section */}
          <div className="mb-1">
            <h3 className="text-xl font-bold mb-3 tracking-tight">Maintenance Visit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 w-full">
              {/* Row 1: Visit Date + Date Out of Maintenance */}
              <div className="flex flex-col gap-1 w-full">
                <label className="block text-base font-medium">Visit Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start text-left font-normal text-base hover:border-indigo-400 focus:border-indigo-500"
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      {visitDate ? format(visitDate, "dd MMM yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <Calendar
                      mode="single"
                      selected={visitDate}
                      onSelect={setVisitDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1 w-full">
                <label className="block text-base font-medium">Date Out of Maintenance</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start text-left font-normal text-base hover:border-indigo-400 focus:border-indigo-500"
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      {dateOutOfMaintenance ? format(dateOutOfMaintenance, "dd MMM yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <Calendar
                      mode="single"
                      selected={dateOutOfMaintenance}
                      onSelect={setDateOutOfMaintenance}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Row 2: Description (full width) */}
              <div className="col-span-1 md:col-span-2 flex flex-col gap-1 w-full">
                <label className="block text-base font-medium">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the maintenance performed..." className="min-h-[44px] h-12 text-base w-full" />
              </div>
              {/* Row 3: Visit Type (half width on desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0 w-full col-span-1 md:col-span-2">
                <div className="flex flex-col gap-1 w-full">
                  <label className="block text-base font-medium">Visit Type</label>
                  <Select value={visitType} onValueChange={setVisitType}>
                    <SelectTrigger
                      className="w-full h-12 text-base bg-white border border-input shadow-sm rounded-md flex items-center px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    >
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Unscheduled">Unscheduled</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="hidden md:block" />
              </div>
              {/* Row 4: Technician Name + Hours at Visit (side by side) */}
              <div className="flex flex-col md:flex-row gap-2 w-full col-span-1 md:col-span-2">
                {/* Technician Name */}
                <div className="flex-1 flex flex-col gap-1 w-full md:w-1/2">
                  <label className="block text-base font-medium">Technician Name</label>
                  <Input value={technician} onChange={e => setTechnician(e.target.value)} placeholder="Technician" className="h-12 text-base w-full" />
                </div>
                {/* Hours at Visit */}
                <div className="flex-1 flex flex-col gap-1 w-full md:w-1/2">
                  <label className="block text-base font-medium">Hours at Visit</label>
                  <Input type="number" value={hoursAtVisit} onChange={e => setHoursAtVisit(e.target.value)} placeholder="e.g. 1300" className="h-12 text-base w-full" />
                </div>
              </div>
              {/* Row 5: Total Cost (full width) */}
              <div className="col-span-1 md:col-span-2 flex flex-col gap-1 w-full">
                <label className="block text-base font-medium">Total Cost</label>
                <Input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="e.g. 1000" className="h-12 text-base w-full" />
              </div>
              
              {/* Component Due Tracking - Only show if this visit was for a component */}
              {visit?.component_id && (
                <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Component Due At Maintenance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-base font-medium mb-1">Component Due Hours</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={componentDueHours}
                        onChange={e => setComponentDueHours(e.target.value)}
                        placeholder="Component due hours"
                        className="h-12 text-base w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Hours component was due (including extension)</p>
                    </div>
                    <div>
                      <label className="block text-base font-medium mb-1">Component Due Date</label>
                      <Input
                        type="date"
                        value={componentDueDate}
                        onChange={e => setComponentDueDate(e.target.value)}
                        className="h-12 text-base w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Date component was due</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="h-1" />
          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditMaintenanceModal; 