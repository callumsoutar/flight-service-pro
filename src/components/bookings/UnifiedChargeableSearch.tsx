"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../ui/command";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Plus, PlaneLanding, Radio, Grid3X3, AlertCircle, Filter } from "lucide-react";
import { CHARGEABLE_TYPE_CODES, type Chargeable, type ChargeableWithAircraftRates } from "@/types/chargeables";

interface UnifiedChargeableSearchProps {
  onAddChargeable?: (item: Chargeable, quantity: number) => void;
  onAddLandingFee?: (
    item: { chargeable_id: string; description: string; rate: number; is_taxable: boolean },
    quantity: number
  ) => void;
  taxRate: number;
  aircraftTypeId?: string;
}

interface ChargeableSearchResult {
  id: string;
  name: string;
  description?: string;
  rate: number;
  is_taxable: boolean;
  type: 'landing_fee' | 'airways_fees' | 'other';
  aircraft_rate?: number; // For landing fees with aircraft-specific rates
}

const typeIcons = {
  landing_fee: PlaneLanding,
  airways_fees: Radio,
  other: Grid3X3,
};

const typeLabels = {
  landing_fee: 'Landing Fee',
  airways_fees: 'Airways Fee',
  other: 'Other Charge',
};

type ChargeableTypeFilter = 'all' | 'landing_fee' | 'airways_fees' | 'other';

export default function UnifiedChargeableSearch({
  onAddChargeable,
  onAddLandingFee,
  taxRate,
  aircraftTypeId,
}: UnifiedChargeableSearchProps) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<ChargeableSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [results, setResults] = useState<ChargeableSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ChargeableTypeFilter>('all');

  // Fetch chargeables when component mounts or search/filter changes
  useEffect(() => {
    if (!focused) return;

    setLoading(true);
    setError(null);
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        // Build API URL with filters
        let url = `/api/chargeables?q=${encodeURIComponent(search)}&include_rates=true`;
        
        // Add type filter if not 'all'
        if (typeFilter !== 'all') {
          if (typeFilter === 'landing_fee') {
            url += `&type=landing_fee`;
          } else if (typeFilter === 'airways_fees') {
            url += `&type=airways_fees`;
          }
        }
        
        // Include aircraft_type_id for landing fees
        if (aircraftTypeId && (typeFilter === 'landing_fee' || typeFilter === 'all')) {
          url += `&aircraft_type_id=${aircraftTypeId}`;
        }

        const response = await fetch(url, { signal: controller.signal });
        
        if (!response.ok) throw new Error("Failed to fetch chargeables");
        
        const data = await response.json();
        const chargeables = data.chargeables || [];
        
        // Transform and categorize results
        const transformedResults: ChargeableSearchResult[] = [];
        
        chargeables.forEach((item: ChargeableWithAircraftRates) => {
          const typeCode = item.chargeable_types?.code;
          
          if (typeCode === CHARGEABLE_TYPE_CODES.LANDING_FEE) {
            // Handle landing fees with aircraft-specific rates
            if (aircraftTypeId && item.landing_fee_rates) {
              const aircraftRate = item.landing_fee_rates.find(
                r => r.aircraft_type_id === aircraftTypeId
              );
              
              if (aircraftRate) {
                transformedResults.push({
                  id: item.id,
                  name: item.name,
                  description: item.description || undefined,
                  rate: aircraftRate.rate,
                  is_taxable: item.is_taxable,
                  type: 'landing_fee',
                  aircraft_rate: aircraftRate.rate,
                });
              }
            } else {
              // Fallback to base rate
              transformedResults.push({
                id: item.id,
                name: item.name,
                description: item.description || undefined,
                rate: item.rate,
                is_taxable: item.is_taxable,
                type: 'landing_fee',
              });
            }
          } else if (typeCode === CHARGEABLE_TYPE_CODES.AIRWAYS_FEES) {
            transformedResults.push({
              id: item.id,
              name: item.name,
              description: item.description || undefined,
              rate: item.rate,
              is_taxable: item.is_taxable,
              type: 'airways_fees',
            });
          } else {
            // Other charges - only include if filtering for 'other' or 'all'
            if (typeFilter === 'other' || typeFilter === 'all') {
              transformedResults.push({
                id: item.id,
                name: item.name,
                description: item.description || undefined,
                rate: item.rate,
                is_taxable: item.is_taxable,
                type: 'other',
              });
            }
          }
        });
        
        setResults(transformedResults);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Failed to load chargeables");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [search, focused, aircraftTypeId, typeFilter]);

  const calculateInclusiveRate = useCallback((rate: number, isTaxable: boolean) => {
    if (!isTaxable) return rate;
    return rate * (1 + taxRate);
  }, [taxRate]);

  const handleAdd = () => {
    if (!selected) return;

    if (selected.type === 'landing_fee') {
      // Handle landing fee
      const landingFeeItem = {
        chargeable_id: selected.id,
        description: `Landing Fee - ${selected.name}`,
        rate: selected.rate,
        is_taxable: selected.is_taxable,
      };
      onAddLandingFee?.(landingFeeItem, quantity);
    } else {
      // Handle other chargeables
      const chargeableItem: Chargeable = {
        id: selected.id,
        name: selected.name,
        description: selected.description || null,
        chargeable_type_id: '',
        rate: selected.rate,
        is_taxable: selected.is_taxable,
        is_active: true,
        voided_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onAddChargeable?.(chargeableItem, quantity);
    }

    // Reset selection
    setSelected(null);
    setSearch("");
    setQuantity(1);
    setError(null);
  };

  const groupResultsByType = (items: ChargeableSearchResult[]) => {
    return items.reduce<Record<string, ChargeableSearchResult[]>>((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {});
  };

  const groupedResults = groupResultsByType(results);
  const hasResults = Object.keys(groupedResults).length > 0;

  const filterButtons = [
    { value: 'all' as const, label: 'All', icon: Filter },
    { value: 'landing_fee' as const, label: 'Landing Fees', icon: PlaneLanding },
    { value: 'airways_fees' as const, label: 'Airways', icon: Radio },
    { value: 'other' as const, label: 'Other', icon: Grid3X3 },
  ];

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Add Additional Charges</h3>
        {selected && (
          <Badge variant="secondary" className="text-xs">
            {typeLabels[selected.type]}
          </Badge>
        )}
      </div>

      {/* Type Filter Buttons */}
      <div className="flex gap-2">
        {filterButtons.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={typeFilter === value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTypeFilter(value);
              setSelected(null);
              setSearch("");
              setError(null);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <Icon className="w-3 h-3" />
            {label}
          </Button>
        ))}
      </div>

      {/* Search Interface */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Command className="w-full border border-gray-200 bg-white rounded-lg h-10">
            <div className="flex items-center px-3 py-0 h-full">
              <CommandInput
                placeholder={
                  typeFilter === 'all' ? "Search for charges..." :
                  typeFilter === 'landing_fee' ? "Search airports..." :
                  typeFilter === 'airways_fees' ? "Search airways fees..." :
                  "Search other charges..."
                }
                value={search}
                onValueChange={(val) => {
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
                    <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                      {typeFilter === 'all' ? "Loading charges..." :
                       typeFilter === 'landing_fee' ? "Loading airports..." :
                       typeFilter === 'airways_fees' ? "Loading airways fees..." :
                       "Loading other charges..."}
                    </div>
                  ) : error ? (
                    <div className="px-4 py-3 text-sm text-red-500 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  ) : hasResults ? (
                    Object.entries(groupedResults).map(([type, items]) => {
                      const Icon = typeIcons[type as keyof typeof typeIcons];
                      const label = typeLabels[type as keyof typeof typeLabels];
                      
                      return (
                        <CommandGroup key={type} heading={
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {label}
                          </div>
                        }>
                          {items.map((item) => {
                            const inclusiveRate = calculateInclusiveRate(item.rate, item.is_taxable);
                            const isSelected = selected?.id === item.id;
                            
                            return (
                              <CommandItem
                                key={item.id}
                                value={item.name}
                                onSelect={() => {
                                  setSelected(item);
                                  setSearch(item.name);
                                  setFocused(false);
                                  setError(null);
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-md hover:bg-blue-50 transition text-left cursor-pointer ${
                                  isSelected ? "bg-blue-50" : ""
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                  )}
                                  {item.type === 'landing_fee' && item.aircraft_rate && (
                                    <div className="text-xs text-blue-600 mt-0.5">
                                      Aircraft-specific rate
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end ml-4">
                                  <div className="font-semibold text-blue-600 text-sm">
                                    ${inclusiveRate.toFixed(2)}
                                  </div>
                                  {!item.is_taxable && (
                                    <div className="text-xs text-gray-500">Tax-exempt</div>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      );
                    })
                  ) : (
                    <CommandEmpty className="px-4 py-3 text-sm text-gray-500">
                      {typeFilter === 'all' ? "No charges found. Try a different search term." :
                       typeFilter === 'landing_fee' ? "No airports found. Try a different search term." :
                       typeFilter === 'airways_fees' ? "No airways fees found. Try a different search term." :
                       "No other charges found. Try a different search term."}
                    </CommandEmpty>
                  )}
                </CommandList>
              </div>
            )}
          </Command>
        </div>

        {/* Quantity Input */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Qty</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-16 border border-gray-200 rounded-md px-2 py-2.5 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hide-number-input-arrows"
            title="Quantity"
          />
        </div>

        {/* Add Button */}
        <Button
          onClick={handleAdd}
          disabled={!selected}
          size="sm"
          className="whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add
        </Button>
      </div>

      {/* Warning for missing aircraft type */}
      {!aircraftTypeId && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Aircraft type not available. Some landing fees may not display correctly.</span>
        </div>
      )}
    </div>
  );
}
