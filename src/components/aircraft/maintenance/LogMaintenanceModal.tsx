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
import { format } from "date-fns";

interface LogMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitDate: Date | undefined;
  setVisitDate: (date: Date | undefined) => void;
  visitType: string;
  setVisitType: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  totalCost: string;
  setTotalCost: (val: string) => void;
  hoursAtVisit: string;
  setHoursAtVisit: (val: string) => void;
  notes: string;
  dateOutOfMaintenance: Date | undefined;
  setDateOutOfMaintenance: (date: Date | undefined) => void;
  aircraft_id: string;
  component_id?: string | null;
  organization_id: string;
}

const LogMaintenanceModal: React.FC<LogMaintenanceModalProps> = ({
  open,
  onOpenChange,
  visitDate,
  setVisitDate,
  visitType,
  setVisitType,
  description,
  setDescription,
  totalCost,
  setTotalCost,
  hoursAtVisit,
  setHoursAtVisit,
  notes,
  dateOutOfMaintenance,
  setDateOutOfMaintenance,
  aircraft_id,
  component_id,
  organization_id,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [componentName, setComponentName] = useState<string | null>(null);
  const [componentLoading, setComponentLoading] = useState(false);

  useEffect(() => {
    if (!component_id) {
      setComponentName(null);
      return;
    }
    setComponentLoading(true);
    fetch(`/api/aircraft_components?component_id=${component_id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0 && data[0].name) {
          setComponentName(data[0].name);
        } else {
          setComponentName(null);
        }
      })
      .catch(() => setComponentName(null))
      .finally(() => setComponentLoading(false));
  }, [component_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const visitPayload = {
        aircraft_id,
        component_id: component_id || null,
        visit_date: visitDate ? visitDate.toISOString() : null,
        date_out_of_maintenance: dateOutOfMaintenance ? dateOutOfMaintenance.toISOString() : null,
        visit_type: visitType,
        description,
        total_cost: totalCost ? Number(totalCost) : null,
        hours_at_visit: hoursAtVisit ? Number(hoursAtVisit) : null,
        status: "Completed",
        notes,
        organization_id,
      };
      const visitRes = await fetch("/api/maintenance_visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitPayload),
      });
      if (!visitRes.ok) {
        const errorData = await visitRes.json();
        throw new Error(errorData.error || "Failed to log maintenance visit");
      }
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
          <DialogTitle className="mt-4 text-3xl font-extrabold mb-1 tracking-tight">Log Maintenance Visit</DialogTitle>
          <DialogDescription className="mb-4 text-base text-muted-foreground font-normal">Fill out the details for this maintenance event.</DialogDescription>
          {component_id && componentName && !componentLoading && (
            <div className="mb-2 text-indigo-700 text-sm font-semibold">{componentName}</div>
          )}
        </DialogHeader>
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
              {/* Row 4: Total Cost + Hours at Visit (side by side) */}
              <div className="flex flex-col md:flex-row gap-2 w-full col-span-1 md:col-span-2">
                {/* Total Cost */}
                <div className="flex-1 flex flex-col gap-1 w-full md:w-1/2">
                  <label className="block text-base font-medium">Total Cost</label>
                  <Input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="e.g. $1000" className="h-12 text-base w-full" required min="0" step="0.01" />
                </div>
                {/* Hours at Visit */}
                <div className="flex-1 flex flex-col gap-1 w-full md:w-1/2">
                  <label className="block text-base font-medium">Hours at Visit</label>
                  <Input type="number" value={hoursAtVisit} onChange={e => setHoursAtVisit(e.target.value)} placeholder="e.g. 1300" className="h-12 text-base w-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="h-1" />
          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" disabled={loading}>{loading ? "Logging..." : "Log Maintenance"}</Button>
          </DialogFooter>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LogMaintenanceModal; 