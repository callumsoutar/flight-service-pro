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
import { Switch } from "@/components/ui/switch";
import React, { useState, useEffect } from "react";
import type { Aircraft } from '@/types/aircraft';
import { Plane, Settings, Calendar, Wrench } from "lucide-react";
import { toast } from "sonner";

interface AddAircraftModalProps {
  open: boolean;
  onClose: () => void;
  refresh?: () => void;
  onAdd?: (aircraft: Aircraft) => void;
}

export const AddAircraftModal: React.FC<AddAircraftModalProps> = ({ 
  open, 
  onClose, 
  refresh, 
  onAdd 
}) => {
  // Basic Information
  const [registration, setRegistration] = useState("");
  const [type, setType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [yearManufactured, setYearManufactured] = useState("");
  
  // Specifications
  const [capacity, setCapacity] = useState("");
  const [engineCount, setEngineCount] = useState("1");
  const [fuelConsumption, setFuelConsumption] = useState("");
  const [totalTimeMethod, setTotalTimeMethod] = useState("");
  
  // Meter Readings
  const [currentHobbs, setCurrentHobbs] = useState("0");
  const [currentTach, setCurrentTach] = useState("0");
  
  // Recording Options
  const [recordHobbs, setRecordHobbs] = useState(false);
  const [recordTacho, setRecordTacho] = useState(false);
  const [recordAirswitch, setRecordAirswitch] = useState(false);
  
  // Operational Settings
  const [onLine, setOnLine] = useState(true);
  const [forAto, setForAto] = useState(false);
  const [prioritiseScheduling, setPrioritiseScheduling] = useState(false);
  
  // Notes
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Reset all fields when modal opens
      setRegistration("");
      setType("");
      setManufacturer("");
      setModel("");
      setYearManufactured("");
      setCapacity("");
      setEngineCount("1");
      setFuelConsumption("");
      setTotalTimeMethod("");
      setCurrentHobbs("0");
      setCurrentTach("0");
      setRecordHobbs(false);
      setRecordTacho(false);
      setRecordAirswitch(false);
      setOnLine(true);
      setForAto(false);
      setPrioritiseScheduling(false);
      setNotes("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!registration.trim()) {
      setError("Registration is required.");
      setLoading(false);
      return;
    }

    if (!type.trim()) {
      setError("Aircraft type is required.");
      setLoading(false);
      return;
    }

    const payload = {
      registration: registration.trim().toUpperCase(),
      type: type.trim(),
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      year_manufactured: yearManufactured ? parseInt(yearManufactured) : null,
      capacity: capacity ? parseInt(capacity) : null,
      engine_count: parseInt(engineCount),
      fuel_consumption: fuelConsumption ? parseInt(fuelConsumption) : null,
      total_time_method: totalTimeMethod || null,
      current_hobbs: parseFloat(currentHobbs),
      current_tach: parseFloat(currentTach),
      record_hobbs: recordHobbs,
      record_tacho: recordTacho,
      record_airswitch: recordAirswitch,
      on_line: onLine,
      for_ato: forAto,
      prioritise_scheduling: prioritiseScheduling,
      status: "active",
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch("/api/aircraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (onAdd && data && data.aircraft) onAdd(data.aircraft as Aircraft);
        if (refresh) refresh();
        toast.success("Aircraft added successfully!");
        onClose();
      } else {
        const data = await res.json();
        let errorMsg = data.error || "Failed to add aircraft";
        
        // Handle specific database errors
        if (errorMsg.includes("unique constraint") || errorMsg.includes("duplicate key")) {
          errorMsg = "An aircraft with this registration already exists.";
        }
        
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Failed to add aircraft";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  const totalTimeMethodOptions = [
    { value: "", label: "Select method..." },
    { value: "hobbs", label: "Hobbs" },
    { value: "tacho", label: "Tacho" },
    { value: "airswitch", label: "Airswitch" },
    { value: "hobbs less 5%", label: "Hobbs less 5%" },
    { value: "hobbs less 10%", label: "Hobbs less 10%" },
    { value: "tacho less 5%", label: "Tacho less 5%" },
    { value: "tacho less 10%", label: "Tacho less 10%" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[700px] max-w-[98vw] mx-auto p-0 bg-white rounded-2xl shadow-xl border border-muted overflow-y-auto max-h-[90vh]">
        <div className="px-8 pt-8 pb-4">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold mb-2 tracking-tight flex items-center gap-2">
              <Plane className="w-6 h-6 text-indigo-600" />
              Add New Aircraft
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground font-normal">
              Enter aircraft details. Registration and type are required fields.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-8 w-full" onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block font-medium mb-1">
                    Registration <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    value={registration} 
                    onChange={e => setRegistration(e.target.value.toUpperCase())} 
                    placeholder="e.g., ZK-ABC" 
                    autoFocus 
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    Aircraft Type <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    value={type} 
                    onChange={e => setType(e.target.value)} 
                    placeholder="e.g., Cessna 172" 
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Manufacturer</label>
                  <Input 
                    value={manufacturer} 
                    onChange={e => setManufacturer(e.target.value)} 
                    placeholder="e.g., Cessna" 
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Model</label>
                  <Input 
                    value={model} 
                    onChange={e => setModel(e.target.value)} 
                    placeholder="e.g., 172SP" 
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Year Manufactured</label>
                  <Input 
                    type="number" 
                    value={yearManufactured} 
                    onChange={e => setYearManufactured(e.target.value)} 
                    placeholder="e.g., 2020" 
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Capacity (Seats)</label>
                  <Input 
                    type="number" 
                    value={capacity} 
                    onChange={e => setCapacity(e.target.value)} 
                    placeholder="e.g., 4" 
                    min="1"
                  />
                </div>
              </div>
            </div>

            <hr className="my-2 border-muted" />

            {/* Specifications */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold">Specifications</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <label className="block font-medium mb-1">Engine Count</label>
                  <Input 
                    type="number" 
                    value={engineCount} 
                    onChange={e => setEngineCount(e.target.value)} 
                    min="1"
                    max="10"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Fuel Consumption (L/hr)</label>
                  <Input 
                    type="number" 
                    value={fuelConsumption} 
                    onChange={e => setFuelConsumption(e.target.value)} 
                    placeholder="e.g., 40" 
                    min="0"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Total Time Method</label>
                  <select 
                    value={totalTimeMethod} 
                    onChange={e => setTotalTimeMethod(e.target.value)}
                    className="w-full border rounded p-2 h-10 bg-white"
                  >
                    {totalTimeMethodOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <hr className="my-2 border-muted" />

            {/* Meter Readings */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">Current Meter Readings</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block font-medium mb-1">Current Hobbs</label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={currentHobbs} 
                    onChange={e => setCurrentHobbs(e.target.value)} 
                    min="0"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Current Tacho</label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={currentTach} 
                    onChange={e => setCurrentTach(e.target.value)} 
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Recording Options */}
            <div className="flex flex-col gap-4">
              <h4 className="text-base font-semibold text-gray-700">Recording Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="record-hobbs"
                    checked={recordHobbs} 
                    onCheckedChange={setRecordHobbs} 
                  />
                  <label htmlFor="record-hobbs" className="text-sm font-medium cursor-pointer">
                    Record Hobbs
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="record-tacho"
                    checked={recordTacho} 
                    onCheckedChange={setRecordTacho} 
                  />
                  <label htmlFor="record-tacho" className="text-sm font-medium cursor-pointer">
                    Record Tacho
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="record-airswitch"
                    checked={recordAirswitch} 
                    onCheckedChange={setRecordAirswitch} 
                  />
                  <label htmlFor="record-airswitch" className="text-sm font-medium cursor-pointer">
                    Record Airswitch
                  </label>
                </div>
              </div>
            </div>

            {/* Operational Settings */}
            <div className="flex flex-col gap-4">
              <h4 className="text-base font-semibold text-gray-700">Operational Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="on-line"
                    checked={onLine} 
                    onCheckedChange={setOnLine} 
                  />
                  <label htmlFor="on-line" className="text-sm font-medium cursor-pointer">
                    On Line (Available for Booking)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="for-ato"
                    checked={forAto} 
                    onCheckedChange={setForAto} 
                  />
                  <label htmlFor="for-ato" className="text-sm font-medium cursor-pointer">
                    For ATO Use
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="prioritise-scheduling"
                    checked={prioritiseScheduling} 
                    onCheckedChange={setPrioritiseScheduling} 
                  />
                  <label htmlFor="prioritise-scheduling" className="text-sm font-medium cursor-pointer">
                    Prioritise Scheduling
                  </label>
                </div>
              </div>
            </div>

            <hr className="my-2 border-muted" />

            {/* Notes Section */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold">Notes & Additional Information</h3>
              </div>
              <Textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Any additional notes about this aircraft..." 
                className="min-h-[80px]" 
              />
            </div>

            <DialogFooter className="pt-8 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
              <DialogClose asChild>
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full sm:w-auto border border-muted hover:border-indigo-400"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" 
                disabled={loading || !registration.trim() || !type.trim()}
              >
                {loading ? "Adding..." : "Add Aircraft"}
              </Button>
            </DialogFooter>
            {error && (
              <div className="text-red-600 text-sm mb-2 text-center w-full p-3 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};