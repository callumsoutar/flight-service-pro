"use client";
import { useState, useEffect, useCallback } from "react";
import React from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../ui/command";
import { ChargeableWithAircraftRates } from "@/types/chargeables";
import { Plus, PlaneLanding, AlertCircle } from "lucide-react";

interface LandingFeeSelectorProps {
  onAdd?: (item: { chargeable_id: string; description: string; rate: number; is_taxable: boolean }, quantity: number) => void;
  taxRate: number;
  aircraftTypeId?: string;
}

export default function LandingFeeSelector({ onAdd, taxRate, aircraftTypeId }: LandingFeeSelectorProps) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<ChargeableWithAircraftRates | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [landingFees, setLandingFees] = useState<ChargeableWithAircraftRates[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch landing fees when component mounts or search changes
  useEffect(() => {
    if (!focused) return;

    setLoading(true);
    setError(null);
    const controller = new AbortController();

    const url = `/api/chargeables?type=landing_fee&include_rates=true&q=${encodeURIComponent(search)}`;

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch landing fees");
        const data = await res.json();
        setLandingFees(data.chargeables || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Failed to load landing fees");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [search, focused]);

  // Get the rate for the current aircraft type from the selected landing fee
  const getAircraftRate = useCallback((landingFee: ChargeableWithAircraftRates) => {
    if (!aircraftTypeId || !landingFee.landing_fee_rates) return null;

    const rateRecord = landingFee.landing_fee_rates.find(
      r => r.aircraft_type_id === aircraftTypeId
    );

    return rateRecord ? rateRecord.rate : null;
  }, [aircraftTypeId]);

  // Calculate tax-inclusive rate
  const calculateInclusiveRate = useCallback((rate: number, isTaxable: boolean) => {
    if (!isTaxable) return rate;
    return rate * (1 + taxRate);
  }, [taxRate]);

  const handleAdd = () => {
    if (!selected) return;

    const rate = getAircraftRate(selected);
    if (rate === null) {
      setError(`No landing fee rate configured for this aircraft type at ${selected.name}`);
      return;
    }

    // Create a chargeable-like object to pass to onAdd
    const chargeableItem = {
      chargeable_id: selected.id,
      description: `Landing Fee - ${selected.name}`,
      rate: rate,
      is_taxable: selected.is_taxable,
    };

    onAdd?.(chargeableItem, quantity);

    // Reset selection
    setSelected(null);
    setSearch("");
    setQuantity(1);
    setError(null);
  };

  return (
    <div className="w-full flex flex-col gap-2 p-2">
      {!aircraftTypeId && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Aircraft type information not available. Landing fees may not display correctly.</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Command className="w-full border border-gray-200 bg-white rounded-lg h-10">
            <div className="flex items-center px-3 py-2.5">
              <PlaneLanding className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <CommandInput
                placeholder="Search airports..."
                value={search}
                onValueChange={val => {
                  setSearch(val);
                  setSelected(null);
                  setError(null);
                }}
                className="text-sm bg-white border-0 shadow-none py-0 focus:ring-0 focus:outline-none placeholder:text-gray-400 h-full leading-normal font-normal"
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 100)}
              />
            </div>
            {focused && (
              <div className="absolute left-0 right-0 z-10" style={{ top: '100%' }}>
                <CommandList className="bg-white border-x border-b border-gray-200 rounded-b-lg shadow-md max-h-64">
                  {loading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Loading landing fees...</div>
                  ) : error && !selected ? (
                    <div className="px-4 py-3 text-sm text-red-500">{error}</div>
                  ) : landingFees.length > 0 ? (
                    <CommandGroup heading="Airports">
                      {landingFees.map((fee) => {
                        const aircraftRate = getAircraftRate(fee);
                        const hasRate = aircraftRate !== null;
                        const inclusiveRate = hasRate ? calculateInclusiveRate(aircraftRate, fee.is_taxable) : 0;

                        return (
                          <CommandItem
                            key={fee.id}
                            value={fee.name}
                            onSelect={() => {
                              setSelected(fee);
                              setSearch(fee.name);
                              setFocused(false);
                              setError(null);
                            }}
                            className={
                              "flex items-center justify-between px-2 py-2 rounded-md hover:bg-[#89d2dc]/10 transition text-left cursor-pointer" +
                              (selected?.id === fee.id ? " bg-[#89d2dc]/10" : "")
                            }
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{fee.name}</div>
                              {fee.description && (
                                <div className="text-xs text-gray-500">{fee.description}</div>
                              )}
                              {!hasRate && aircraftTypeId && (
                                <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  No rate for this aircraft type
                                </div>
                              )}
                            </div>
                            {hasRate && (
                              <div className="flex flex-col items-end ml-4">
                                <div className="font-semibold text-[#6564db] text-sm">
                                  ${inclusiveRate.toFixed(2)}
                                </div>
                                {!fee.is_taxable && (
                                  <div className="text-xs text-gray-500">Tax-exempt</div>
                                )}
                              </div>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ) : (
                    <CommandEmpty>No landing fees found</CommandEmpty>
                  )}
                </CommandList>
              </div>
            )}
          </Command>
        </div>

        <input
          type="number"
          min={1}
          value={quantity}
          onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-14 border border-gray-200 rounded-md px-2 py-2.5 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hide-number-input-arrows h-10 leading-normal font-normal"
          title="Quantity"
        />
        <button
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap h-10"
          disabled={!selected || getAircraftRate(selected) === null}
          onClick={handleAdd}
          type="button"
        >
          <Plus className="w-4 h-4" />
          Add Fee
        </button>
      </div>

      {error && selected && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {selected && getAircraftRate(selected) !== null && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-900">
            <span className="font-medium">Selected:</span> {selected.name}
            {selected.description && <span className="text-blue-700"> - {selected.description}</span>}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Rate for this aircraft: ${calculateInclusiveRate(getAircraftRate(selected)!, selected.is_taxable).toFixed(2)}
            {selected.is_taxable && ` (incl. ${Math.round(taxRate * 100)}% tax)`}
          </div>
        </div>
      )}
    </div>
  );
}
