"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ClipboardList, Clock, Plane } from "lucide-react";
import { useOrgContext } from "@/components/OrgContextProvider";

interface CheckInDetailsProps {
  aircraftId?: string;
  organizationId?: string;
  selectedFlightTypeId?: string | null;
  instructorId?: string | null;
  instructors: { id: string; name: string }[];
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
  }) => void;
  initialStartHobbs?: number | null;
  initialStartTacho?: number | null;
  initialEndHobbs?: number | null;
  initialEndTacho?: number | null;
}

export default function CheckInDetails({ aircraftId, organizationId, selectedFlightTypeId, instructorId, instructors, onCalculateCharges, initialStartHobbs, initialStartTacho, initialEndHobbs, initialEndTacho }: CheckInDetailsProps) {
  // Start values: ONLY from props
  const [startHobbs, setStartHobbs] = useState(initialStartHobbs !== undefined && initialStartHobbs !== null ? String(initialStartHobbs) : "");
  const [startTacho, setStartTacho] = useState(initialStartTacho !== undefined && initialStartTacho !== null ? String(initialStartTacho) : "");
  // End values: ONLY from props
  const [endHobbs, setEndHobbs] = useState(initialEndHobbs !== undefined && initialEndHobbs !== null ? String(initialEndHobbs) : "");
  const [endTacho, setEndTacho] = useState(initialEndTacho !== undefined && initialEndTacho !== null ? String(initialEndTacho) : "");
  const [flightTypes, setFlightTypes] = useState<{ id: string; name: string }[]>([]);
  const [selectedFlightType, setSelectedFlightType] = useState<string>(selectedFlightTypeId || "");
  const [chargeRate, setChargeRate] = useState<string | null>(null);
  const [chargeHobbs, setChargeHobbs] = useState<boolean | null>(null);
  const [chargeTacho, setChargeTacho] = useState<boolean | null>(null);
  const [instructorRate, setInstructorRate] = useState<{ rate: number; currency: string | null } | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string>(instructorId || "");

  // Get org tax rate from context
  const { taxRate } = useOrgContext();

  // Sync start values with props ONLY when those props change
  useEffect(() => {
    if (initialStartHobbs !== undefined && initialStartHobbs !== null) {
      setStartHobbs(String(initialStartHobbs));
    } else {
      setStartHobbs("");
    }
  }, [initialStartHobbs]);

  useEffect(() => {
    if (initialStartTacho !== undefined && initialStartTacho !== null) {
      setStartTacho(String(initialStartTacho));
    } else {
      setStartTacho("");
    }
  }, [initialStartTacho]);

  // Sync end values with props ONLY when those props change
  useEffect(() => {
    if (initialEndHobbs !== undefined && initialEndHobbs !== null) {
      setEndHobbs(String(initialEndHobbs));
    } else {
      setEndHobbs("");
    }
  }, [initialEndHobbs]);

  useEffect(() => {
    if (initialEndTacho !== undefined && initialEndTacho !== null) {
      setEndTacho(String(initialEndTacho));
    } else {
      setEndTacho("");
    }
  }, [initialEndTacho]);

  useEffect(() => {
    if (!organizationId) return;
    // Fetch all flight types for the organization
    fetch(`/api/flight_types?organization_id=${organizationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.flight_types) {
          setFlightTypes(data.flight_types);
        }
      });
  }, [organizationId]);

  useEffect(() => {
    setSelectedFlightType(selectedFlightTypeId || "");
  }, [selectedFlightTypeId]);

  useEffect(() => {
    if (!aircraftId || !selectedFlightType) {
      setChargeRate(null);
      setChargeHobbs(null);
      setChargeTacho(null);
      return;
    }
    fetch(`/api/aircraft_charge_rates?aircraft_id=${aircraftId}&flight_type_id=${selectedFlightType}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.charge_rate) {
          setChargeRate(data.charge_rate.rate_per_hour);
          setChargeHobbs(data.charge_rate.charge_hobbs);
          setChargeTacho(data.charge_rate.charge_tacho);
        } else {
          setChargeRate(null);
          setChargeHobbs(null);
          setChargeTacho(null);
        }
      });
  }, [aircraftId, selectedFlightType]);

  useEffect(() => {
    setSelectedInstructor(instructorId || "");
  }, [instructorId]);

  useEffect(() => {
    if (!organizationId || !selectedInstructor) {
      setInstructorRate(null);
      return;
    }
    fetch(`/api/instructor_rates?organization_id=${organizationId}&user_id=${selectedInstructor}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.instructor_rate && typeof data.instructor_rate.rate === "number") {
          setInstructorRate({ rate: data.instructor_rate.rate, currency: data.instructor_rate.currency });
        } else {
          setInstructorRate(null);
        }
      });
  }, [organizationId, selectedInstructor]);

  // Calculate totals
  const tachoTotal = (parseFloat(endTacho) - parseFloat(startTacho)).toFixed(2);
  const hobbsTotal = (parseFloat(endHobbs) - parseFloat(startHobbs)).toFixed(2);
  const chargingBy = chargeHobbs ? "hobbs" : chargeTacho ? "tacho" : null;

  // Calculate tax-inclusive rates
  const aircraftRateExclusive = chargeRate ? parseFloat(chargeRate) : null;
  const aircraftRateInclusive = aircraftRateExclusive && taxRate != null ? (aircraftRateExclusive * (1 + taxRate)) : null;
  const instructorRateExclusive = instructorRate?.rate ?? null;
  const instructorRateInclusive = instructorRateExclusive && taxRate != null ? (instructorRateExclusive * (1 + taxRate)) : null;

  const handleCalculateCharges = () => {
    let chargeTime = 0;
    if (chargingBy === "hobbs") {
      chargeTime = parseFloat(hobbsTotal);
    } else if (chargingBy === "tacho") {
      chargeTime = parseFloat(tachoTotal);
    }
    if (onCalculateCharges && chargeTime > 0 && aircraftRateExclusive && instructorRateExclusive && selectedInstructor && selectedFlightType) {
      onCalculateCharges({
        chargeTime,
        aircraftRate: aircraftRateExclusive,
        instructorRate: instructorRateExclusive,
        chargingBy,
        selectedInstructor,
        selectedFlightType,
        hobbsStart: startHobbs !== "" ? parseFloat(startHobbs) : undefined,
        hobbsEnd: endHobbs !== "" ? parseFloat(endHobbs) : undefined,
        tachStart: startTacho !== "" ? parseFloat(startTacho) : undefined,
        tachEnd: endTacho !== "" ? parseFloat(endTacho) : undefined,
      });
    }
  };

  return (
    <div className="p-0">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-6 h-6 text-purple-500" />
        <h2 className="font-bold text-xl">Check-In Details</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Flight Type</label>
          <Select value={selectedFlightType} onValueChange={setSelectedFlightType}>
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
              Rate: <span className="font-semibold">${aircraftRateInclusive.toFixed(2)} / hour</span>
            </div>
          ) : chargeRate && (
            <div className="text-xs text-muted-foreground mt-1">Rate: <span className="font-semibold">${parseFloat(chargeRate).toFixed(2)} / hour</span></div>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Instructor</label>
          <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select instructor" />
            </SelectTrigger>
            <SelectContent>
              {instructors.length === 0 && (
                <SelectItem value="placeholder" disabled>
                  --
                </SelectItem>
              )}
              {instructors.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {instructorRateInclusive != null ? (
            <div className="text-xs text-muted-foreground mt-1">
              Rate: <span className="font-semibold">${instructorRateInclusive.toFixed(2)} / hour</span>
            </div>
          ) : instructorRate && (
            <div className="text-xs text-muted-foreground mt-1">Rate: <span className="font-semibold">${instructorRate.rate.toFixed(2)} / hour</span></div>
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
              <input type="number" value={startTacho} onChange={e => setStartTacho(e.target.value)}
                className={`w-full min-w-[100px] rounded-md border px-3 py-2 text-sm text-center font-mono text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-green-100 focus-visible:ring-[2px] outline-none no-spinner ${chargingBy === "tacho" ? 'border-green-200' : 'border-input'}`}
                placeholder="" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Tacho</label>
              <input type="number" value={endTacho} onChange={e => setEndTacho(e.target.value)}
                className={`w-full min-w-[100px] rounded-md border px-3 py-2 text-sm text-center font-mono text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-green-100 focus-visible:ring-[2px] outline-none no-spinner ${chargingBy === "tacho" ? 'border-green-200' : 'border-input'}`}
                placeholder="" />
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
              <input type="number" value={startHobbs} onChange={e => setStartHobbs(e.target.value)}
                className={`w-full min-w-[100px] rounded-md border px-3 py-2 text-sm text-center font-mono text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-green-100 focus-visible:ring-[2px] outline-none no-spinner ${chargingBy === "hobbs" ? 'border-green-200' : 'border-input'}`}
                placeholder="" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Hobbs</label>
              <input type="number" value={endHobbs} onChange={e => setEndHobbs(e.target.value)}
                className={`w-full min-w-[100px] rounded-md border px-3 py-2 text-sm text-center font-mono text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-green-100 focus-visible:ring-[2px] outline-none no-spinner ${chargingBy === "hobbs" ? 'border-green-200' : 'border-input'}`}
                placeholder="" />
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-1">Total: {isNaN(parseFloat(hobbsTotal)) ? '0.0' : hobbsTotal} hours</div>
        </div>
      </div>
      <div className="mt-6">
        <Button variant="outline" className="w-full flex items-center gap-2 justify-center" onClick={handleCalculateCharges}>
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