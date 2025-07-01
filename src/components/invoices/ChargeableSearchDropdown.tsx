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
import type { Chargeable, ChargeableType } from "@/types/chargeables";
import { CHARGEABLE_TYPE_LABELS } from "@/types/chargeables";
import { Plus } from "lucide-react";

const groupByCategory = (items: Chargeable[]) => {
  return items.reduce<Record<ChargeableType, Chargeable[]>>((acc, item) => {
    const type = item.type as ChargeableType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<ChargeableType, Chargeable[]>);
};

interface ChargeableSearchDropdownProps {
  onAdd?: (item: Chargeable, quantity: number) => void;
  taxRate: number; // e.g. 0.15 for 15%
}

export default function ChargeableSearchDropdown({ onAdd, taxRate }: ChargeableSearchDropdownProps) {
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
    fetch(`/api/chargeables?q=${encodeURIComponent(search)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch chargeables");
        const data = await res.json();
        setChargeables(data.chargeables || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("Failed to load chargeables");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, focused]);

  return (
    <div className="w-full flex flex-col gap-2 p-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Command className="w-full border border-gray-200 bg-white rounded-lg">
            <CommandInput
              placeholder="Search for items to add..."
              value={search}
              onValueChange={val => {
                setSearch(val);
                setSelected(null);
              }}
              className="text-base bg-white border-0 shadow-none px-3 py-2 rounded-t-lg rounded-b-none focus:ring-0 focus:outline-none"
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 100)}
            />
            {focused && (
              <div className="absolute left-0 right-0 z-10" style={{ top: '100%' }}>
                <CommandList className="bg-white border-x border-b border-gray-200 rounded-b-lg shadow-md rounded-t-none">
                  {loading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
                  ) : error ? (
                    <div className="px-4 py-3 text-sm text-red-500">{error}</div>
                  ) : chargeables.length > 0 ? (
                    Object.entries(groupByCategory(chargeables)).map(([type, items]) => (
                      <CommandGroup key={type} heading={CHARGEABLE_TYPE_LABELS[type as ChargeableType] || type}>
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
                            <div className="font-semibold text-indigo-600 text-sm">
                              ${(item.rate * (1 + taxRate)).toFixed(2)}
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
          className="w-16 border border-gray-200 rounded-md px-2 py-2 text-right text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none hide-number-input-arrows"
        />
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
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
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>
    </div>
  );
} 