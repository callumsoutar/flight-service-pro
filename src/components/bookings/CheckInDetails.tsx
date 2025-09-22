"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ClipboardList, Clock, Plane } from "lucide-react";

interface CheckInDetailsProps {
  aircraftId?: string;
  selectedFlightTypeId?: string | null;
  instructorId?: string | null;
  instructors: { id: string; name: string }[];
  instructorRate?: { rate: number; currency: string | null } | null;
  instructorRateLoading?: boolean;
  onCalculateCharges?: (details: {
    chargeTime: number;
    aircraftRate: number;
    instructorRate: number;
    chargingBy: 'hobbs' | 'tacho' | null;
    selectedInstructor: string;
    selectedFlightType: string;
    hobbsStart?: number;
    hobbsEnd?: number;
    tachStart?: number;
    tachEnd?: number;
    flightTimeHobbs: number;
    flightTimeTach: number;
  }) => void;
  // Use booking start values (from check-out) instead of aircraft current values
  bookingStartHobbs?: number | null;
  bookingStartTacho?: number | null;
  initialEndHobbs?: number | null;
  initialEndTacho?: number | null;
  onFormValuesChange?: (values: {
    endHobbs: string;
    endTacho: string;
  }) => void;
  // Add joined instructor data from flight log
  checkedOutInstructor?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
}

export default function CheckInDetails({ 
  aircraftId, 
  selectedFlightTypeId, 
  instructorId, 
  instructors, 
  instructorRate, 
  instructorRateLoading, 
  onCalculateCharges, 
  bookingStartHobbs, 
  bookingStartTacho, 
  initialEndHobbs, 
  initialEndTacho, 
  onFormValuesChange,
  checkedOutInstructor
}: CheckInDetailsProps) {
  // Start values: ONLY from booking start values (from check-out)
  const [startHobbs, setStartHobbs] = useState<string>("");
  const [startTacho, setStartTacho] = useState<string>("");
  // End values: ONLY from props
  const [endHobbs, setEndHobbs] = useState<string>("");
  const [endTacho, setEndTacho] = useState<string>("");
  const [flightTypes, setFlightTypes] = useState<{ id: string; name: string }[]>([]);
  const [selectedFlightType, setSelectedFlightType] = useState<string>("");
  const [chargeRate, setChargeRate] = useState<string | null>(null);
  const [chargeHobbs, setChargeHobbs] = useState<boolean | null>(null);
  const [chargeTacho, setChargeTacho] = useState<boolean | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string>("");

  // Default tax rate (can be made configurable later)
  const taxRate = 0.15;

  // Track previous values to avoid unnecessary callbacks
  const prevValuesRef = useRef({ endHobbs: "", endTacho: "" });

  // Initialize start values from booking start values
  useEffect(() => {
    setStartHobbs(bookingStartHobbs !== undefined && bookingStartHobbs !== null ? String(bookingStartHobbs) : "");
  }, [bookingStartHobbs]);

  useEffect(() => {
    setStartTacho(bookingStartTacho !== undefined && bookingStartTacho !== null ? String(bookingStartTacho) : "");
  }, [bookingStartTacho]);

  // Initialize end values from props
  useEffect(() => {
    setEndHobbs(initialEndHobbs !== undefined && initialEndHobbs !== null ? String(initialEndHobbs) : "");
  }, [initialEndHobbs]);

  useEffect(() => {
    setEndTacho(initialEndTacho !== undefined && initialEndTacho !== null ? String(initialEndTacho) : "");
  }, [initialEndTacho]);

  // Create comprehensive instructors list that includes checked-out instructor
  const allInstructors = useMemo(() => {
    const instructorMap = new Map<string, { id: string; name: string }>();
    
    // Add all instructors from the props
    instructors.forEach(inst => {
      instructorMap.set(inst.id, inst);
    });
    
    // Add checked-out instructor if it exists and is not already in the list
    if (checkedOutInstructor && !instructorMap.has(checkedOutInstructor.id)) {
      const fullName = `${checkedOutInstructor.first_name || ""} ${checkedOutInstructor.last_name || ""}`.trim();
      const displayName = fullName || checkedOutInstructor.email || "Unknown Instructor";
      instructorMap.set(checkedOutInstructor.id, {
        id: checkedOutInstructor.id,
        name: displayName
      });
    }
    
    
    return Array.from(instructorMap.values());
  }, [instructors, checkedOutInstructor]);

  // Initialize selected values
  useEffect(() => {
    setSelectedFlightType(selectedFlightTypeId || "");
  }, [selectedFlightTypeId]);

  useEffect(() => {
    setSelectedInstructor(instructorId || "");
  }, [instructorId]);

  // Notify parent of form value changes with debouncing
  useEffect(() => {
    const currentValues = { endHobbs, endTacho };
    const prevValues = prevValuesRef.current;
    
    // Only call callback if values actually changed
    if (onFormValuesChange && (currentValues.endHobbs !== prevValues.endHobbs || currentValues.endTacho !== prevValues.endTacho)) {
      // Debounce the callback to avoid excessive calls
      const timeoutId = setTimeout(() => {
        onFormValuesChange(currentValues);
        prevValuesRef.current = currentValues;
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [endHobbs, endTacho, onFormValuesChange]);

  // Fetch flight types on mount
  useEffect(() => {
    const fetchFlightTypes = async () => {
      try {
        const res = await fetch(`/api/flight_types`);
        if (!res.ok) throw new Error('Failed to fetch flight types');
        const data = await res.json();
        if (data.flight_types) {
          setFlightTypes(data.flight_types);
        }
      } catch {
        // Silent error handling - component will still function without flight types
      }
    };
    fetchFlightTypes();
  }, []);

  // Fetch charge rate when aircraft or flight type changes
  useEffect(() => {
    const fetchChargeRate = async () => {
      if (!aircraftId || !selectedFlightType) {
        setChargeRate(null);
        setChargeHobbs(null);
        setChargeTacho(null);
        return;
      }

      try {
        const res = await fetch(`/api/aircraft_charge_rates?aircraft_id=${aircraftId}&flight_type_id=${selectedFlightType}`);
        if (!res.ok) throw new Error('Failed to fetch charge rate');
        const data = await res.json();
        
        if (data.charge_rate) {
          setChargeRate(data.charge_rate.rate_per_hour);
          setChargeHobbs(data.charge_rate.charge_hobbs);
          setChargeTacho(data.charge_rate.charge_tacho);
        } else {
          setChargeRate(null);
          setChargeHobbs(null);
          setChargeTacho(null);
        }
      } catch {
        // Silent error handling - component will still function without charge rates
        setChargeRate(null);
        setChargeHobbs(null);
        setChargeTacho(null);
      }
    };

    fetchChargeRate();
  }, [aircraftId, selectedFlightType]);

  // Memoized calculations for performance
  const { tachoTotal, hobbsTotal, chargingBy } = useMemo(() => {
    const tachoTotal = (parseFloat(endTacho) - parseFloat(startTacho)).toFixed(2);
    const hobbsTotal = (parseFloat(endHobbs) - parseFloat(startHobbs)).toFixed(2);
    const chargingBy: 'hobbs' | 'tacho' | null = chargeHobbs ? "hobbs" : chargeTacho ? "tacho" : null;
    return { tachoTotal, hobbsTotal, chargingBy };
  }, [endTacho, startTacho, endHobbs, startHobbs, chargeHobbs, chargeTacho]);

  // Memoized tax calculations
  const { aircraftRateExclusive, aircraftRateInclusive, instructorRateExclusive, instructorRateInclusive } = useMemo(() => {
    const aircraftRateExclusive = chargeRate ? parseFloat(chargeRate) : null;
    const aircraftRateInclusive = aircraftRateExclusive && taxRate != null ? (aircraftRateExclusive * (1 + taxRate)) : null;
    const instructorRateExclusive = instructorRate?.rate ?? null;
    const instructorRateInclusive = instructorRateExclusive && taxRate != null ? (instructorRateExclusive * (1 + taxRate)) : null;
    return { aircraftRateExclusive, aircraftRateInclusive, instructorRateExclusive, instructorRateInclusive };
  }, [chargeRate, instructorRate, taxRate]);

  const handleCalculateCharges = useCallback(() => {
    if (!onCalculateCharges) return;

    let chargeTime = 0;
    if (chargingBy === "hobbs") {
      chargeTime = parseFloat(hobbsTotal);
    } else if (chargingBy === "tacho") {
      chargeTime = parseFloat(tachoTotal);
    }
    
    // Validate that we have valid meter readings
    const hobbsStart = startHobbs !== "" ? parseFloat(startHobbs) : undefined;
    const hobbsEnd = endHobbs !== "" ? parseFloat(endHobbs) : undefined;
    const tachStart = startTacho !== "" ? parseFloat(startTacho) : undefined;
    const tachEnd = endTacho !== "" ? parseFloat(endTacho) : undefined;
    
    if (chargeTime > 0 && aircraftRateExclusive && instructorRateExclusive && selectedInstructor && selectedFlightType) {
      onCalculateCharges({
        chargeTime,
        aircraftRate: aircraftRateExclusive,
        instructorRate: instructorRateExclusive,
        chargingBy,
        selectedInstructor,
        selectedFlightType,
        hobbsStart,
        hobbsEnd,
        tachStart,
        tachEnd,
        flightTimeHobbs: parseFloat(hobbsTotal),
        flightTimeTach: parseFloat(tachoTotal),
      });
    }
  }, [
    onCalculateCharges, 
    chargingBy, 
    hobbsTotal, 
    tachoTotal, 
    aircraftRateExclusive, 
    instructorRateExclusive, 
    selectedInstructor, 
    selectedFlightType, 
    startHobbs, 
    endHobbs, 
    startTacho, 
    endTacho
  ]);

  // Memoized input handlers to prevent unnecessary re-renders
  const handleStartHobbsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartHobbs(e.target.value);
  }, []);

  const handleEndHobbsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndHobbs(e.target.value);
  }, []);

  const handleStartTachoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTacho(e.target.value);
  }, []);

  const handleEndTachoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTacho(e.target.value);
  }, []);

  const handleFlightTypeChange = useCallback((value: string) => {
    setSelectedFlightType(value);
  }, []);

  const handleInstructorChange = useCallback((value: string) => {
    setSelectedInstructor(value);
  }, []);

  return (
    <div className="p-0">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-6 h-6 text-purple-500" />
        <h2 className="font-bold text-xl">Check-In Details</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Flight Type</label>
          <Select value={selectedFlightType} onValueChange={handleFlightTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select flight type" />
            </SelectTrigger>
            <SelectContent>
              {flightTypes.length === 0 && (
                <SelectItem value="placeholder" disabled>
                  --
                </SelectItem>
              )}
              {flightTypes.map((ft) => (
                <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {aircraftRateInclusive != null ? (
            <div className="text-xs text-muted-foreground mt-1">
              Rate: <span className="font-semibold">${aircraftRateInclusive.toFixed(2)} / hour</span> (incl. tax)
            </div>
          ) : chargeRate ? (
            <div className="text-xs text-muted-foreground mt-1">Rate: <span className="font-semibold">${parseFloat(chargeRate).toFixed(2)} / hour</span> (excl. tax)</div>
          ) : selectedFlightType && aircraftId ? (
            <div className="text-xs text-red-500 mt-1">No rate found for this flight type</div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">Select flight type to see rate</div>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Instructor</label>
          <Select value={selectedInstructor} onValueChange={handleInstructorChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select instructor" />
            </SelectTrigger>
            <SelectContent>
              {allInstructors.length === 0 && (
                <SelectItem value="placeholder" disabled>
                  --
                </SelectItem>
              )}
              {allInstructors.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {instructorRateLoading ? (
            <div className="text-xs text-muted-foreground mt-1">Loading instructor rate...</div>
          ) : instructorRateInclusive != null ? (
            <div className="text-xs text-muted-foreground mt-1">
              Rate: <span className="font-semibold">${instructorRateInclusive.toFixed(2)} / hour</span> (incl. tax)
            </div>
          ) : instructorRate ? (
            <div className="text-xs text-muted-foreground mt-1">Rate: <span className="font-semibold">${instructorRate.rate.toFixed(2)} / hour</span> (excl. tax)</div>
          ) : selectedInstructor && selectedFlightType ? (
            <div className="text-xs text-red-500 mt-1">No rate found for this instructor</div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">Select instructor to see rate</div>
          )}
        </div>
      </div>
      <hr className="my-4" />
      <div className="space-y-2">
        {/* Tacho Meter Row */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-lg">Tacho Meter</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Start Tacho</label>
              <input 
                type="number" 
                value={startTacho} 
                onChange={handleStartTachoChange}
                className={`w-full min-w-[100px] rounded-md border px-3 py-2 text-sm text-center font-mono text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-green-100 focus-visible:ring-[2px] outline-none no-spinner ${chargingBy === "tacho" ? 'border-green-200' : 'border-input'}`}
                placeholder="" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Tacho</label>
              <input 
                type="number" 
                value={endTacho} 
                onChange={handleEndTachoChange}
                className={`w-full min-w-[100px] rounded-md border px-3 py-2 text-sm text-center font-mono text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-green-100 focus-visible:ring-[2px] outline-none no-spinner ${chargingBy === "tacho" ? 'border-green-200' : 'border-input'}`}
                placeholder="" 
              />
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-1">Total: {isNaN(parseFloat(tachoTotal)) ? '0.0' : tachoTotal} hours</div>
        </div>
        {/* Hobbs Meter Row */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-lg">Hobbs Meter</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Start Hobbs</label>
              <input 
                type="number" 
                value={startHobbs} 
                onChange={handleStartHobbsChange}
                className={`w-full min-w-[100px] rounded-md border px-3 py-2 text-sm text-center font-mono text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-green-100 focus-visible:ring-[2px] outline-none no-spinner ${chargingBy === "hobbs" ? 'border-green-200' : 'border-input'}`}
                placeholder="" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Hobbs</label>
              <input 
                type="number" 
                value={endHobbs} 
                onChange={handleEndHobbsChange}
                className={`w-full min-w-[100px] rounded-md border px-3 py-2 text-sm text-center font-mono text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-green-100 focus-visible:ring-[2px] outline-none no-spinner ${chargingBy === "hobbs" ? 'border-green-200' : 'border-input'}`}
                placeholder="" 
              />
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-1">Total: {isNaN(parseFloat(hobbsTotal)) ? '0.0' : hobbsTotal} hours</div>
        </div>
      </div>
      <div className="mt-6">
        {/* Show validation status */}
        {(!aircraftRateExclusive || !instructorRateExclusive || !selectedInstructor || !selectedFlightType) && (
          <div className="text-xs text-red-500 mb-2 space-y-1">
            {!selectedFlightType && <div>• Please select a flight type</div>}
            {!selectedInstructor && <div>• Please select an instructor</div>}
            {!aircraftRateExclusive && selectedFlightType && <div>• Aircraft rate not found</div>}
            {!instructorRateExclusive && selectedInstructor && selectedFlightType && <div>• Instructor rate not found</div>}
          </div>
        )}
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2 justify-center" 
          onClick={handleCalculateCharges}
          disabled={!aircraftRateExclusive || !instructorRateExclusive || !selectedInstructor || !selectedFlightType}
        >
          <ClipboardList className="w-5 h-5" />
          Calculate Flight Charges
        </Button>
      </div>
      <style jsx global>{`
        input[type=number].no-spinner::-webkit-inner-spin-button, 
        input[type=number].no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number].no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
} 