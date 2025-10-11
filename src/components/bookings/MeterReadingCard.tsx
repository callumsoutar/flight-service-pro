"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, ChevronDown, ChevronUp, Calculator, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationTaxRate } from "@/hooks/use-tax-rate";
import type { MeterReadings } from "@/hooks/use-booking-completion";

interface MeterReadingCardProps {
  aircraftRegistration: string;
  flightTypeId?: string;
  instructorId?: string;
  initialMeterReadings?: Partial<MeterReadings>;
  flightTypes: Array<{ id: string; name: string; instruction_type?: string }>;
  instructors: Array<{ id: string; name: string }>;
  chargingBy: 'hobbs' | 'tacho' | null;
  onCalculate: (data: {
    meterReadings: MeterReadings;
    flightTypeId: string;
    instructorId?: string;
    soloFlightTypeId?: string;
  }) => void;
  isCalculating: boolean;
  aircraftRate?: number;
  instructorRate?: number;
}

export default function MeterReadingCard({
  aircraftRegistration,
  flightTypeId: initialFlightTypeId,
  instructorId: initialInstructorId,
  initialMeterReadings,
  flightTypes,
  instructors,
  chargingBy,
  onCalculate,
  isCalculating,
  aircraftRate,
  instructorRate,
}: MeterReadingCardProps) {
  const [flightTypeId, setFlightTypeId] = useState(initialFlightTypeId || '');
  const [instructorId, setInstructorId] = useState(initialInstructorId || '');
  const [hobbsStart, setHobbsStart] = useState(initialMeterReadings?.hobbsStart?.toString() || '');
  const [hobbsEnd, setHobbsEnd] = useState(initialMeterReadings?.hobbsEnd?.toString() || '');
  const [tachStart, setTachStart] = useState(initialMeterReadings?.tachStart?.toString() || '');
  const [tachEnd, setTachEnd] = useState(initialMeterReadings?.tachEnd?.toString() || '');
  const [soloEndHobbs, setSoloEndHobbs] = useState(initialMeterReadings?.soloEndHobbs?.toString() || '');
  const [soloFlightTypeId, setSoloFlightTypeId] = useState('');
  const [showSoloSection, setShowSoloSection] = useState(false);

  // Get tax rate for calculating inclusive rates
  const { taxRate, isLoading: taxRateLoading } = useOrganizationTaxRate();

  const selectedFlightType = flightTypes.find(ft => ft.id === flightTypeId);
  const isDualFlight = selectedFlightType?.instruction_type === 'dual';
  const requiresInstructor = selectedFlightType?.instruction_type === 'dual' || selectedFlightType?.instruction_type === 'trial';
  const soloFlightTypes = flightTypes.filter(ft => ft.instruction_type === 'solo');

  // Calculate flight times
  const hobbsTime = hobbsStart && hobbsEnd ? (parseFloat(hobbsEnd) - parseFloat(hobbsStart)).toFixed(1) : '0.0';
  const tachTime = tachStart && tachEnd ? (parseFloat(tachEnd) - parseFloat(tachStart)).toFixed(1) : '0.0';

  // Calculate rates with tax included (same logic as CheckInDetails.tsx)
  const { aircraftRateInclusive, instructorRateInclusive } = useMemo(() => {
    const aircraftRateExclusive = aircraftRate ?? null;
    const aircraftRateInclusive = aircraftRateExclusive && !taxRateLoading && taxRate != null 
      ? (aircraftRateExclusive * (1 + taxRate)) 
      : null;
    
    const instructorRateExclusive = instructorRate ?? null;
    const instructorRateInclusive = instructorRateExclusive && !taxRateLoading && taxRate != null 
      ? (instructorRateExclusive * (1 + taxRate)) 
      : null;
    
    return { aircraftRateInclusive, instructorRateInclusive };
  }, [aircraftRate, instructorRate, taxRate, taxRateLoading]);

  const handleCalculate = useCallback(() => {
    if (!flightTypeId || !hobbsStart || !hobbsEnd || !tachStart || !tachEnd) return;
    if (requiresInstructor && !instructorId) return;

    const meterReadings: MeterReadings = {
      hobbsStart: parseFloat(hobbsStart),
      hobbsEnd: parseFloat(hobbsEnd),
      tachStart: parseFloat(tachStart),
      tachEnd: parseFloat(tachEnd),
    };

    if (soloEndHobbs && parseFloat(soloEndHobbs) > parseFloat(hobbsEnd)) {
      meterReadings.soloEndHobbs = parseFloat(soloEndHobbs);
    }

    onCalculate({
      meterReadings,
      flightTypeId,
      instructorId: requiresInstructor ? instructorId : undefined,
      soloFlightTypeId: soloEndHobbs && soloFlightTypeId ? soloFlightTypeId : undefined,
    });
  }, [flightTypeId, instructorId, hobbsStart, hobbsEnd, tachStart, tachEnd, soloEndHobbs, soloFlightTypeId, requiresInstructor, onCalculate]);

  const isValid = 
    flightTypeId &&
    hobbsStart &&
    hobbsEnd &&
    tachStart &&
    tachEnd &&
    parseFloat(hobbsEnd) > parseFloat(hobbsStart) &&
    parseFloat(tachEnd) > parseFloat(tachStart) &&
    (!requiresInstructor || instructorId) &&
    (!soloEndHobbs || parseFloat(soloEndHobbs) > parseFloat(hobbsEnd));

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Flight Details</CardTitle>
          <Badge variant="outline" className="text-sm">
            {aircraftRegistration}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flight Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Flight Type</label>
              <Select value={flightTypeId} onValueChange={setFlightTypeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select flight type" />
                </SelectTrigger>
                <SelectContent>
                  {flightTypes.length === 0 && (
                    <SelectItem value="placeholder" disabled>
                      --
                    </SelectItem>
                  )}
                  {flightTypes.map(ft => (
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
            {requiresInstructor && (
              <div>
                <label className="block text-sm font-medium mb-2">Instructor</label>
                <Select value={instructorId} onValueChange={setInstructorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.length === 0 && (
                      <SelectItem value="placeholder" disabled>
                        --
                      </SelectItem>
                    )}
                    {instructors.map(inst => (
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
            )}
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
                {tachTime} hours
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Tacho</label>
                <input
                  type="number"
                  value={tachStart}
                  onChange={(e) => setTachStart(e.target.value)}
                  className={`w-full rounded border px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#6564db] no-spinner ${chargingBy === "tacho" ? 'border-green-300' : 'border-gray-300'}`}
                  placeholder="0.0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Tacho</label>
                <input
                  type="number"
                  value={tachEnd}
                  onChange={(e) => setTachEnd(e.target.value)}
                  className={`w-full rounded border px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#6564db] no-spinner ${chargingBy === "tacho" ? 'border-green-300' : 'border-gray-300'}`}
                  placeholder=""
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
                {hobbsTime} hours
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Hobbs</label>
                <input
                  type="number"
                  value={hobbsStart}
                  onChange={(e) => setHobbsStart(e.target.value)}
                  className={`w-full rounded border px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#6564db] no-spinner ${chargingBy === "hobbs" ? 'border-blue-300' : 'border-gray-300'}`}
                  placeholder="0.0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Hobbs</label>
                <input
                  type="number"
                  value={hobbsEnd}
                  onChange={(e) => setHobbsEnd(e.target.value)}
                  className={`w-full rounded border px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#6564db] no-spinner ${chargingBy === "hobbs" ? 'border-blue-300' : 'border-gray-300'}`}
                  placeholder=""
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Solo Flight Continuation */}
        {isDualFlight && hobbsEnd && parseFloat(hobbsEnd) > 0 && (
          <div className="border-t pt-6 space-y-4">
            <button
              type="button"
              onClick={() => setShowSoloSection(!showSoloSection)}
              className="flex items-center gap-2 w-full hover:opacity-70 transition-opacity"
            >
              <Clock className="w-4 h-4 text-orange-600" />
              <h3 className="font-medium text-orange-900">Solo Flight Continuation</h3>
              {showSoloSection ? (
                <ChevronUp className="w-4 h-4 text-orange-600 ml-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 text-orange-600 ml-auto" />
              )}
            </button>

            {showSoloSection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Solo Flight Type</label>
                  <Select value={soloFlightTypeId} onValueChange={setSoloFlightTypeId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select solo flight type" />
                    </SelectTrigger>
                    <SelectContent>
                      {soloFlightTypes.length === 0 && (
                        <SelectItem value="placeholder" disabled>
                          No solo flight types available
                        </SelectItem>
                      )}
                      {soloFlightTypes.map(ft => (
                        <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Solo End Hobbs</label>
                  <input
                    type="number"
                    value={soloEndHobbs}
                    onChange={(e) => setSoloEndHobbs(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#6564db] no-spinner"
                    placeholder="Final reading"
                    min={parseFloat(hobbsEnd) || 0}
                    step="0.1"
                  />
                  {soloEndHobbs && parseFloat(soloEndHobbs) <= parseFloat(hobbsEnd) && (
                    <div className="text-xs text-red-500 mt-1">
                      Must be greater than {hobbsEnd}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calculate Button */}
        <Button
          onClick={handleCalculate}
          disabled={!isValid || isCalculating}
          className="w-full bg-[#6564db] hover:bg-[#232ed1] text-white"
          size="lg"
        >
          {isCalculating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Flight Charges
            </>
          )}
        </Button>
      </CardContent>
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
    </Card>
  );
}

