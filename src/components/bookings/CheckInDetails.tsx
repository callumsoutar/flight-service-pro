"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ClipboardList, Clock, Plane } from "lucide-react";
import { useOrganizationTaxRate } from "@/hooks/use-tax-rate";

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
    soloEndHobbs?: number;
    dualTime: number;
    soloTime: number;
    soloFlightType?: string;
    soloAircraftRate?: number;
  }) => void;
  // Use booking start values (from check-out) instead of aircraft current values
  bookingStartHobbs?: number | null;
  bookingStartTacho?: number | null;
  initialEndHobbs?: number | null;
  initialEndTacho?: number | null;
  initialSoloEndHobbs?: number | null;
  onFormValuesChange?: (values: {
    endHobbs: string;
    endTacho: string;
    soloEndHobbs: string;
  }) => void;
  // Add joined instructor data from flight log
  checkedOutInstructor?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
  // Flight type information for dual/solo detection
  flightType?: {
    instruction_type?: 'dual' | 'solo' | 'trial' | null;
  } | null;
}

export default function CheckInDetails({
  aircraftId,
  selectedFlightTypeId,
  instructorId,
  instructors,
  instructorRate,
  onCalculateCharges,
  bookingStartHobbs,
  bookingStartTacho,
  initialEndHobbs,
  initialEndTacho,
  initialSoloEndHobbs,
  onFormValuesChange,
  checkedOutInstructor,
  flightType
}: CheckInDetailsProps) {
  // Start values: ONLY from booking start values (from check-out)
  const [startHobbs, setStartHobbs] = useState<string>("");
  const [startTacho, setStartTacho] = useState<string>("");
  // End values: ONLY from props
  const [endHobbs, setEndHobbs] = useState<string>("");
  const [endTacho, setEndTacho] = useState<string>("");
  // Solo end values for dual flights that transition to solo
  const [soloEndHobbs, setSoloEndHobbs] = useState<string>("");
  const [flightTypes, setFlightTypes] = useState<{ id: string; name: string; instruction_type?: string; is_default_solo?: boolean }[]>([]);
  const [selectedFlightType, setSelectedFlightType] = useState<string>("");
  const [chargeRate, setChargeRate] = useState<string | null>(null);
  const [chargeHobbs, setChargeHobbs] = useState<boolean | null>(null);
  const [chargeTacho, setChargeTacho] = useState<boolean | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string>("");

  // Solo flight type state
  const [selectedSoloFlightType, setSelectedSoloFlightType] = useState<string>("");
  const [soloChargeRate, setSoloChargeRate] = useState<string | null>(null);

  // Dynamic tax rate from organization settings or fallback
  const { taxRate, isLoading: taxRateLoading } = useOrganizationTaxRate();

  // Track previous values to avoid unnecessary callbacks
  const prevValuesRef = useRef({ endHobbs: "", endTacho: "", soloEndHobbs: "" });

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

  useEffect(() => {
    setSoloEndHobbs(initialSoloEndHobbs !== undefined && initialSoloEndHobbs !== null ? String(initialSoloEndHobbs) : "");
  }, [initialSoloEndHobbs]);

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
    const currentValues = { endHobbs, endTacho, soloEndHobbs };
    const prevValues = prevValuesRef.current;

    // Only call callback if values actually changed
    if (onFormValuesChange && (currentValues.endHobbs !== prevValues.endHobbs || currentValues.endTacho !== prevValues.endTacho || currentValues.soloEndHobbs !== prevValues.soloEndHobbs)) {
      // Debounce the callback to avoid excessive calls
      const timeoutId = setTimeout(() => {
        onFormValuesChange(currentValues);
        prevValuesRef.current = currentValues;
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [endHobbs, endTacho, soloEndHobbs, onFormValuesChange]);

  // Fetch flight types on mount
  useEffect(() => {
    const fetchFlightTypes = async () => {
      try {
        const res = await fetch(`/api/flight_types`);
        if (!res.ok) throw new Error('Failed to fetch flight types');
        const data = await res.json();
        if (data.flight_types) {
          setFlightTypes(data.flight_types);

          // Auto-select default solo flight type when available
          const defaultSoloType = data.flight_types.find(
            (ft: { instruction_type?: string; is_default_solo?: boolean }) => ft.instruction_type === 'solo' && ft.is_default_solo === true
          );
          if (defaultSoloType) {
            setSelectedSoloFlightType(defaultSoloType.id);
          }
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

  // Fetch solo charge rate when aircraft or solo flight type changes
  useEffect(() => {
    const fetchSoloChargeRate = async () => {
      if (!aircraftId || !selectedSoloFlightType) {
        setSoloChargeRate(null);
        return;
      }

      try {
        const res = await fetch(`/api/aircraft_charge_rates?aircraft_id=${aircraftId}&flight_type_id=${selectedSoloFlightType}`);
        if (!res.ok) throw new Error('Failed to fetch solo charge rate');
        const data = await res.json();

        if (data.charge_rate) {
          setSoloChargeRate(data.charge_rate.rate_per_hour);
        } else {
          setSoloChargeRate(null);
        }
      } catch {
        // Silent error handling - component will still function without solo charge rates
        setSoloChargeRate(null);
      }
    };

    fetchSoloChargeRate();
  }, [aircraftId, selectedSoloFlightType]);

  // Determine if this is a dual instruction flight that can have solo time
  const isDualInstructionFlight = flightType?.instruction_type === 'dual';

  // Show solo input field when:
  // 1. Flight type is 'dual'
  // 2. User has entered a valid end hobbs value
  const showSoloInput = isDualInstructionFlight && endHobbs && !isNaN(parseFloat(endHobbs)) && parseFloat(endHobbs) > 0;

  // Helper function to round to 1 decimal place and avoid floating-point errors
  const roundToOneDecimal = (value: number): number => {
    return Math.round(value * 10) / 10;
  };

  // Memoized calculations for performance
  const { tachoTotal, hobbsTotal, dualTime, soloTime, totalTime, chargingBy } = useMemo(() => {
    const tachoTotal = (parseFloat(endTacho) - parseFloat(startTacho)).toFixed(2);
    const hobbsTotal = (parseFloat(endHobbs) - parseFloat(startHobbs)).toFixed(2);
    const chargingBy: 'hobbs' | 'tacho' | null = chargeHobbs ? "hobbs" : chargeTacho ? "tacho" : null;

    // Calculate dual and solo time segments with proper rounding
    let dualTime = 0;
    let soloTime = 0;

    if (chargingBy === 'hobbs' && !isNaN(parseFloat(startHobbs)) && !isNaN(parseFloat(endHobbs))) {
      dualTime = roundToOneDecimal(parseFloat(endHobbs) - parseFloat(startHobbs));

      // If solo end hobbs is provided and valid, calculate solo time
      if (soloEndHobbs && !isNaN(parseFloat(soloEndHobbs)) && parseFloat(soloEndHobbs) > parseFloat(endHobbs)) {
        soloTime = roundToOneDecimal(parseFloat(soloEndHobbs) - parseFloat(endHobbs));
      }
    } else if (chargingBy === 'tacho' && !isNaN(parseFloat(startTacho)) && !isNaN(parseFloat(endTacho))) {
      dualTime = roundToOneDecimal(parseFloat(endTacho) - parseFloat(startTacho));
      // Note: We're using hobbs for solo calculation even when charging by tacho
      // This is a business decision that can be adjusted if needed
      if (soloEndHobbs && !isNaN(parseFloat(soloEndHobbs)) && !isNaN(parseFloat(endHobbs)) && parseFloat(soloEndHobbs) > parseFloat(endHobbs)) {
        soloTime = roundToOneDecimal(parseFloat(soloEndHobbs) - parseFloat(endHobbs));
      }
    }

    const totalTime = roundToOneDecimal(dualTime + soloTime);

    return {
      tachoTotal,
      hobbsTotal,
      dualTime: Math.max(0, dualTime),
      soloTime: Math.max(0, soloTime),
      totalTime: Math.max(0, totalTime),
      chargingBy
    };
  }, [endTacho, startTacho, endHobbs, startHobbs, soloEndHobbs, chargeHobbs, chargeTacho]);

  // Memoized tax calculations for dual and solo rates
  const { aircraftRateExclusive, aircraftRateInclusive, instructorRateExclusive, instructorRateInclusive, soloAircraftRateExclusive, soloAircraftRateInclusive } = useMemo(() => {
    const aircraftRateExclusive = chargeRate ? parseFloat(chargeRate) : null;
    const aircraftRateInclusive = aircraftRateExclusive && !taxRateLoading && taxRate != null ? (aircraftRateExclusive * (1 + taxRate)) : null;
    const instructorRateExclusive = instructorRate?.rate ?? null;
    const instructorRateInclusive = instructorRateExclusive && !taxRateLoading && taxRate != null ? (instructorRateExclusive * (1 + taxRate)) : null;
    const soloAircraftRateExclusive = soloChargeRate ? parseFloat(soloChargeRate) : null;
    const soloAircraftRateInclusive = soloAircraftRateExclusive && !taxRateLoading && taxRate != null ? (soloAircraftRateExclusive * (1 + taxRate)) : null;
    return { aircraftRateExclusive, aircraftRateInclusive, instructorRateExclusive, instructorRateInclusive, soloAircraftRateExclusive, soloAircraftRateInclusive };
  }, [chargeRate, instructorRate, taxRate, taxRateLoading, soloChargeRate]);

  const handleCalculateCharges = useCallback(() => {
    if (!onCalculateCharges) return;

    let chargeTime = 0;
    if (chargingBy === "hobbs") {
      chargeTime = parseFloat(hobbsTotal);
    } else if (chargingBy === "tacho") {
      chargeTime = parseFloat(tachoTotal);
    }

    // For dual/solo flights, use total time (dual + solo)
    if (isDualInstructionFlight && totalTime > 0) {
      chargeTime = totalTime;
    }

    // Validate that we have valid meter readings
    const hobbsStart = startHobbs !== "" ? parseFloat(startHobbs) : undefined;
    const hobbsEnd = endHobbs !== "" ? parseFloat(endHobbs) : undefined;
    const tachStart = startTacho !== "" ? parseFloat(startTacho) : undefined;
    const tachEnd = endTacho !== "" ? parseFloat(endTacho) : undefined;
    const soloEndHobbsValue = soloEndHobbs !== "" ? parseFloat(soloEndHobbs) : undefined;

    // Validation: check if solo rate is needed and available
    const needsSoloRate = soloTime > 0;
    const hasSoloRate = !needsSoloRate || (selectedSoloFlightType && soloAircraftRateExclusive);

    if (chargeTime > 0 && aircraftRateExclusive && instructorRateExclusive && selectedInstructor && selectedFlightType && hasSoloRate) {
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
        soloEndHobbs: soloEndHobbsValue,
        dualTime,
        soloTime,
        soloFlightType: selectedSoloFlightType,
        soloAircraftRate: soloAircraftRateExclusive || undefined,
      });
    }
  }, [
    onCalculateCharges,
    chargingBy,
    hobbsTotal,
    tachoTotal,
    isDualInstructionFlight,
    totalTime,
    aircraftRateExclusive,
    instructorRateExclusive,
    selectedInstructor,
    selectedFlightType,
    startHobbs,
    endHobbs,
    startTacho,
    endTacho,
    soloEndHobbs,
    dualTime,
    soloTime,
    selectedSoloFlightType,
    soloAircraftRateExclusive
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

  const handleSoloEndHobbsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSoloEndHobbs(e.target.value);
  }, []);

  const handleFlightTypeChange = useCallback((value: string) => {
    setSelectedFlightType(value);
  }, []);

  const handleInstructorChange = useCallback((value: string) => {
    setSelectedInstructor(value);
  }, []);

  const handleSoloFlightTypeChange = useCallback((value: string) => {
    setSelectedSoloFlightType(value);
  }, []);

  // Filter flight types for solo dropdown (only solo instruction types)
  const soloFlightTypes = useMemo(() => {
    return flightTypes.filter(ft => ft.instruction_type === 'solo');
  }, [flightTypes]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-purple-600" />
        <h2 className="font-semibold text-lg">Check-In Details</h2>
      </div>

      {/* Flight Configuration */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Flight Type</label>
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
            {aircraftRateInclusive != null && (
              <div className="text-xs text-gray-600 mt-1">
                Rate: <span className="font-medium">${aircraftRateInclusive.toFixed(2)}/hour</span> (incl. tax)
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Instructor</label>
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
            {instructorRateInclusive != null && (
              <div className="text-xs text-gray-600 mt-1">
                Rate: <span className="font-medium">${instructorRateInclusive.toFixed(2)}/hour</span> (incl. tax)
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Flight Time Recording */}
      <div className="space-y-6">
        {/* Tacho Meter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium">Tacho Meter</h3>
              {chargingBy === "tacho" && <span className="text-xs text-green-600 font-medium">(billing)</span>}
            </div>
            <div className="text-sm font-medium text-gray-900">
              {isNaN(parseFloat(tachoTotal)) ? '0.0' : tachoTotal} hours
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Tacho</label>
              <input
                type="number"
                value={startTacho}
                onChange={handleStartTachoChange}
                className={`w-full rounded border px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 no-spinner ${chargingBy === "tacho" ? 'border-green-300' : 'border-gray-300'}`}
                placeholder="0.0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Tacho</label>
              <input
                type="number"
                value={endTacho}
                onChange={handleEndTachoChange}
                className={`w-full rounded border px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 no-spinner ${chargingBy === "tacho" ? 'border-green-300' : 'border-gray-300'}`}
                placeholder="0.0"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Hobbs Meter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium">Hobbs Meter</h3>
              {chargingBy === "hobbs" && <span className="text-xs text-blue-600 font-medium">(billing)</span>}
            </div>
            <div className="text-sm font-medium text-gray-900">
              {isDualInstructionFlight && totalTime > 0 ? `${totalTime.toFixed(1)} hours` : isNaN(parseFloat(hobbsTotal)) ? '0.0 hours' : `${hobbsTotal} hours`}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Hobbs</label>
              <input
                type="number"
                value={startHobbs}
                onChange={handleStartHobbsChange}
                className={`w-full rounded border px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 no-spinner ${chargingBy === "hobbs" ? 'border-blue-300' : 'border-gray-300'}`}
                placeholder="0.0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Hobbs</label>
              <input
                type="number"
                value={endHobbs}
                onChange={handleEndHobbsChange}
                className={`w-full rounded border px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 no-spinner ${chargingBy === "hobbs" ? 'border-blue-300' : 'border-gray-300'}`}
                placeholder="0.0"
                step="0.1"
              />
            </div>
          </div>

          {/* Flight Time Breakdown for Dual Flights */}
          {isDualInstructionFlight && dualTime > 0 && (
            <div className="mt-3 text-xs text-gray-600 text-center">
              Dual: {dualTime.toFixed(1)}h
              {soloTime > 0 && ` • Solo: ${soloTime.toFixed(1)}h`}
              • Total: {totalTime.toFixed(1)}h
            </div>
          )}
        </div>
      </div>

      {/* Solo Flight Continuation */}
      {showSoloInput && (
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <h3 className="font-medium text-orange-900">Solo Flight Continuation</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Solo Flight Type</label>
              <Select value={selectedSoloFlightType} onValueChange={handleSoloFlightTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select solo flight type" />
                </SelectTrigger>
                <SelectContent>
                  {soloFlightTypes.length === 0 && (
                    <SelectItem value="placeholder" disabled>
                      No solo flight types available
                    </SelectItem>
                  )}
                  {soloFlightTypes.map((ft) => (
                    <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {soloAircraftRateInclusive != null && (
                <div className="text-xs text-gray-600 mt-1">
                  Rate: <span className="font-medium">${soloAircraftRateInclusive.toFixed(2)}/hour</span> (incl. tax)
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Solo End Hobbs</label>
              <input
                type="number"
                value={soloEndHobbs}
                onChange={handleSoloEndHobbsChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 no-spinner"
                placeholder="Final reading"
                min={parseFloat(endHobbs) || 0}
                step="0.1"
              />
              {soloEndHobbs !== "" && parseFloat(soloEndHobbs) <= parseFloat(endHobbs) && (
                <div className="text-xs text-red-500 mt-1">
                  Must be greater than {endHobbs}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Calculate Charges */}
      <div className="pt-6 border-t">
        {/* Validation Messages */}
        {(!aircraftRateExclusive || !instructorRateExclusive || !selectedInstructor || !selectedFlightType || (soloEndHobbs !== "" && parseFloat(soloEndHobbs) <= parseFloat(endHobbs)) || (soloTime > 0 && (!selectedSoloFlightType || !soloAircraftRateExclusive))) && (
          <div className="mb-4 text-sm text-red-600">
            {!selectedFlightType && <div>• Please select a flight type</div>}
            {!selectedInstructor && <div>• Please select an instructor</div>}
            {!aircraftRateExclusive && selectedFlightType && <div>• Aircraft rate not found</div>}
            {!instructorRateExclusive && selectedInstructor && selectedFlightType && <div>• Instructor rate not found</div>}
            {soloEndHobbs !== "" && parseFloat(soloEndHobbs) <= parseFloat(endHobbs) && <div>• Solo end hobbs must be greater than dual end hobbs</div>}
            {soloTime > 0 && !selectedSoloFlightType && <div>• Please select a solo flight type</div>}
            {soloTime > 0 && selectedSoloFlightType && !soloAircraftRateExclusive && <div>• Solo aircraft rate not found</div>}
          </div>
        )}

        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleCalculateCharges}
          disabled={!aircraftRateExclusive || !instructorRateExclusive || !selectedInstructor || !selectedFlightType || (soloEndHobbs !== "" && parseFloat(soloEndHobbs) <= parseFloat(endHobbs)) || (soloTime > 0 && (!selectedSoloFlightType || !soloAircraftRateExclusive))}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
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