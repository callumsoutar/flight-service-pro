import React, { useEffect, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { InstructorFlightTypeRate } from "@/types/instructor_flight_type_rates";
import type { FlightType } from "@/types/flight_types";

interface Props {
  instructorId: string;
  organizationId: string;
}

export default function InstructorFlightTypeRatesTable({ instructorId, organizationId }: Props) {
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [rates, setRates] = useState<Record<string, InstructorFlightTypeRate | undefined>>({});
  const [editing, setEditing] = useState<Record<string, string>>(/* flightTypeId: rate string */{});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});
  const [initLoading, setInitLoading] = useState(true);

  // Fetch all flight types and rates for this instructor
  useEffect(() => {
    async function fetchData() {
      setInitLoading(true);
      try {
        // Fetch flight types (org scoped, secure)
        const ftRes = await fetch(`/api/flight_types`);
        const ftData = await ftRes.json();
        if (!ftRes.ok) throw new Error(ftData.error || "Failed to fetch flight types");
        setFlightTypes(ftData.flight_types || []);
        // Fetch rates for this instructor
        const ratesRes = await fetch(`/api/instructor_flight_type_rates?organization_id=${organizationId}&instructor_id=${instructorId}`);
        const ratesData = await ratesRes.json();
        if (!ratesRes.ok) throw new Error(ratesData.error || "Failed to fetch rates");
        const ratesMap: Record<string, InstructorFlightTypeRate> = {};
        (ratesData.rates || []).forEach((rate: InstructorFlightTypeRate) => {
          ratesMap[rate.flight_type_id] = rate;
        });
        setRates(ratesMap);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load rates";
        toast.error(errorMessage);
      } finally {
        setInitLoading(false);
      }
    }
    fetchData();
  }, [instructorId, organizationId]);

  // Handle rate input change
  const handleChange = (flightTypeId: string, value: string) => {
    setEditing((prev) => ({ ...prev, [flightTypeId]: value }));
    setError((prev) => ({ ...prev, [flightTypeId]: null }));
  };

  const GST_RATE = 0.15;
  const handleSave = async (flightTypeId: string) => {
    const value = editing[flightTypeId];
    if (!value || isNaN(Number(value)) || Number(value) < 0) {
      setError((prev) => ({ ...prev, [flightTypeId]: "Enter a valid non-negative number" }));
      return;
    }
    setLoading((prev) => ({ ...prev, [flightTypeId]: true }));
    setError((prev) => ({ ...prev, [flightTypeId]: null }));
    try {
      const existing = rates[flightTypeId];
      // Convert inclusive to exclusive (divide by 1.15), do not round before storing
      const inclusive = Number(value);
      const exclusive = inclusive / (1 + GST_RATE);
      const payload = {
        instructor_id: instructorId,
        flight_type_id: flightTypeId,
        organization_id: organizationId,
        rate: exclusive,
        currency: existing?.currency || "NZD",
        effective_from: existing?.effective_from || new Date().toISOString().slice(0, 10),
      };
      const res = await fetch(`/api/instructor_flight_type_rates`, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing ? { ...payload, id: existing.id } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save rate");
      // After save, refetch all rates to ensure UI is in sync with backend
      const ratesRes = await fetch(`/api/instructor_flight_type_rates?organization_id=${organizationId}&instructor_id=${instructorId}`);
      const ratesData = await ratesRes.json();
      const ratesMap: Record<string, InstructorFlightTypeRate> = {};
      (ratesData.rates || []).forEach((rate: InstructorFlightTypeRate) => {
        ratesMap[rate.flight_type_id] = {
          ...rate,
          rate: typeof rate.rate === "string" ? parseFloat(rate.rate) : rate.rate,
        };
      });
      setRates(ratesMap);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[flightTypeId];
        return next;
      });
      toast.success("Rate saved");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save rate";
      setError((prev) => ({ ...prev, [flightTypeId]: errorMessage }));
    } finally {
      setLoading((prev) => ({ ...prev, [flightTypeId]: false }));
    }
  };

  if (initLoading) return <div className="text-muted-foreground">Loading rates...</div>;

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flight Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Rate (per hour)</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flightTypes.map((ft) => {
            const rate = rates[ft.id];
            // Show the input as GST-inclusive (rate * 1.15)
            const displayRate = rate ? Math.round((Number(rate.rate) * (1 + GST_RATE)) * 100) / 100 : "";
            const inputValue = editing[ft.id];
            const isDirty =
              inputValue !== undefined &&
              inputValue !== "" &&
              !isNaN(Number(inputValue)) &&
              Math.abs(Number(inputValue) - Number(displayRate)) > 0.009;
            return (
              <TableRow key={ft.id}>
                <TableCell className="font-medium">{ft.name}</TableCell>
                <TableCell>{ft.description || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editing[ft.id] !== undefined ? editing[ft.id] : displayRate}
                      onChange={e => handleChange(ft.id, e.target.value)}
                      className="w-24"
                      aria-label={`Rate for ${ft.name}`}
                    />
                  </div>
                  {error[ft.id] && <div className="text-xs text-red-500 mt-1">{error[ft.id]}</div>}
                </TableCell>
                <TableCell>{rate?.currency || "NZD"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    disabled={loading[ft.id] || !isDirty}
                    onClick={() => handleSave(ft.id)}
                  >
                    {loading[ft.id] ? "Saving..." : "Save"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
} 