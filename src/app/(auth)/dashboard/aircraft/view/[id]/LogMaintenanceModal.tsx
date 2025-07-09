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
import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface LogMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitDate: Date | undefined;
  setVisitDate: (date: Date | undefined) => void;
  visitType: string;
  setVisitType: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  technician: string;
  setTechnician: (val: string) => void;
  hoursAtVisit: string;
  setHoursAtVisit: (val: string) => void;
  costType: string;
  setCostType: (val: string) => void;
  costDescription: string;
  setCostDescription: (val: string) => void;
  quantity: string;
  setQuantity: (val: string) => void;
  unitCost: string;
  setUnitCost: (val: string) => void;
  totalCost: string;
  setTotalCost: (val: string) => void;
  supplier: string;
  setSupplier: (val: string) => void;
  invoiceRef: string;
  setInvoiceRef: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  dateOutOfMaintenance: Date | undefined;
  setDateOutOfMaintenance: (date: Date | undefined) => void;
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
  technician,
  setTechnician,
  hoursAtVisit,
  setHoursAtVisit,
  costType,
  setCostType,
  costDescription,
  setCostDescription,
  quantity,
  setQuantity,
  unitCost,
  setUnitCost,
  totalCost,
  setTotalCost,
  supplier,
  setSupplier,
  invoiceRef,
  setInvoiceRef,
  notes,
  setNotes,
  dateOutOfMaintenance,
  setDateOutOfMaintenance,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[600px] max-w-[95vw] !max-w-none mx-auto p-6 max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-muted">
        <DialogHeader className="mb-4">
          <DialogTitle className="mt-4 text-3xl font-extrabold mb-1 tracking-tight">Log Maintenance Visit & Cost</DialogTitle>
          <DialogDescription className="mb-4 text-base text-muted-foreground font-normal">Fill out the details for this maintenance event and associated cost.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4 w-full">
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
            </div>
          </div>
          <div className="border-t border-muted my-1" />
          {/* Cost Section in Collapsible */}
          <Collapsible defaultOpen={false} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex justify-between items-center text-lg font-bold py-2 px-0 mb-1">
                Cost Details
                <span className="ml-2">▼</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 w-full mt-1 mb-1">
                <div className="flex flex-col gap-1 w-full">
                  <label className="block text-base font-medium">Cost Type</label>
                  <Select value={costType} onValueChange={setCostType}>
                    <SelectTrigger className="w-full h-12 text-base">
                      <SelectValue placeholder="Select cost type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Labor">Labor</SelectItem>
                      <SelectItem value="Parts">Parts</SelectItem>
                      <SelectItem value="External Service">External Service</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="block text-base font-medium">Cost Description</label>
                  <Input value={costDescription} onChange={e => setCostDescription(e.target.value)} placeholder="e.g. Oil filter" className="h-12 text-base w-full" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="block text-base font-medium">Quantity</label>
                  <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1" className="h-12 text-base w-full" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="block text-base font-medium">Unit Cost</label>
                  <Input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="100" className="h-12 text-base w-full" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="block text-base font-medium">Total Cost</label>
                  <Input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="100" className="h-12 text-base w-full" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="block text-base font-medium">Supplier/Vendor</label>
                  <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" className="h-12 text-base w-full" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="block text-base font-medium">Invoice Reference</label>
                  <Input value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} placeholder="Invoice number" className="h-12 text-base w-full" />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2 w-full">
                  <label className="block text-base font-medium">Notes</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." className="min-h-[44px] text-base w-full" />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="h-1" />
          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400">Cancel</Button>
            </DialogClose>
            <Button type="button" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md">Log Maintenance (placeholder)</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LogMaintenanceModal; 