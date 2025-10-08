"use client";
import { useState, useEffect } from "react";
import React from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../ui/command";
import { CHARGEABLE_TYPE_CODES, type Chargeable, type ChargeableWithAircraftRates } from "@/types/chargeables";
import { Plus } from "lucide-react";

const groupByCategory = (items: ChargeableWithAircraftRates[]) => {
  return items.reduce<Record<string, ChargeableWithAircraftRates[]>>((acc, item) => {
    const typeName = item.chargeable_types?.name || 'Other';
    if (!acc[typeName]) acc[typeName] = [];
    acc[typeName].push(item);
    return acc;
  }, {} as Record<string, ChargeableWithAircraftRates[]>);
};

interface ChargeableSearchDropdownProps {
  onAdd?: (item: Chargeable, quantity: number) => void;
  taxRate: number; // e.g. 0.15 for 15%
  category?: 'landing_fee' | 'airways_fees' | 'other';
  aircraftTypeId?: string; // For landing fee aircraft-specific rates
}

export default function ChargeableSearchDropdown({ onAdd, taxRate, category, aircraftTypeId }: ChargeableSearchDropdownProps) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<Chargeable | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [chargeables, setChargeables] = useState<Chargeable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focused) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    let url = `/api/chargeables?q=${encodeURIComponent(search)}`;
    if (category === 'landing_fee' || category === 'airways_fees') {
      url += `&type=${category}`;
    }
    // Include aircraft_type_id for landing fees to get aircraft-specific rates
    if (aircraftTypeId && (category === 'landing_fee' || !category)) {
      url += `&aircraft_type_id=${aircraftTypeId}`;
    }
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch chargeables");
        const data = await res.json();
        let items = data.chargeables || [];
        if (category === 'other') {
          // Filter out landing fees and airways fees based on the chargeable_types.code
          items = items.filter((c: Chargeable) => 
            c.chargeable_types?.code !== CHARGEABLE_TYPE_CODES.LANDING_FEE && 
            c.chargeable_types?.code !== CHARGEABLE_TYPE_CODES.AIRWAYS_FEES
          );
        }
        setChargeables(items);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("Failed to load chargeables");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, focused, category, aircraftTypeId]);

  return (
    <div className="w-full flex flex-col gap-2 p-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Command className="w-full border border-gray-200 bg-white rounded-lg h-10">
            <div className="flex items-center px-3 py-2.5">
              <CommandInput
                placeholder="Search items..."
                value={search}
                onValueChange={val => {
                  setSearch(val);
                  setSelected(null);
                }}
                className="text-sm bg-white border-0 shadow-none py-0 focus:ring-0 focus:outline-none placeholder:text-gray-400 h-full leading-normal font-normal"
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 100)}
              />
            </div>
            {focused && (
              <div className="absolute left-0 right-0 z-10" style={{ top: '100%' }}>
                <CommandList className="bg-white border-x border-b border-gray-200 rounded-b-lg shadow-md rounded-t-none">
                  {loading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
                  ) : error ? (
                    <div className="px-4 py-3 text-sm text-red-500">{error}</div>
                  ) : chargeables.length > 0 ? (
                    Object.entries(groupByCategory(chargeables)).map(([typeName, items]) => (
                      <CommandGroup key={typeName} heading={typeName}>
                        {items.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={() => {
                              setSelected(item);
                              setSearch(item.name);
                              setFocused(false);
                            }}
                            className={
                              "flex items-center justify-between px-2 py-2 rounded-md hover:bg-indigo-50 transition text-left cursor-pointer" +
                              (selected?.id === item.id ? " bg-indigo-50" : "")
                            }
                          >
                            <div>
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.description}</div>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="font-semibold text-indigo-600 text-sm">
                                ${(item.is_taxable ? item.rate * (1 + taxRate) : item.rate).toFixed(2)}
                              </div>
                              {!item.is_taxable && (
                                <div className="text-xs text-gray-500">Tax-exempt</div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))
                  ) : (
                    <CommandEmpty>No results found</CommandEmpty>
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
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm whitespace-nowrap h-10"
          disabled={!selected}
          onClick={() => {
            if (selected) {
              onAdd?.(selected, quantity);
              setSelected(null);
              setSearch("");
              setQuantity(1);
            }
          }}
          type="button"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
} 