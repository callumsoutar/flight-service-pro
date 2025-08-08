"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Edit2, Trash2 } from "lucide-react";

interface FlightType {
  id: string;
  name: string;
}

interface Props {
  instructorId: string;
}

interface Rate {
  id: string;
  instructor_id: string;
  flight_type_id: string;
  rate: number;
  effective_from?: string;
}

interface EditingRate {
  id: string;
  flight_type_id: string;
  rate: string;
  effective_from?: string;
}

export default function InstructorFlightTypeRatesTable({ instructorId }: Props) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [editingRate, setEditingRate] = useState<EditingRate | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingNewRate, setAddingNewRate] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(0.15); // Default to 15%

  // Fetch rates
  useEffect(() => {
    async function fetchRates() {
      try {
        const ratesRes = await fetch(`/api/instructor_flight_type_rates?instructor_id=${instructorId}`);
        if (!ratesRes.ok) {
          setRates([]);
        } else {
          const ratesData = await ratesRes.json();
          setRates(ratesData.rates || []);
        }
      } catch {
        setRates([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, [instructorId]);

  // Fetch flight types and default tax rate
  useEffect(() => {
    async function fetchData() {
      try {
        const [typesRes, taxRes] = await Promise.all([
          fetch('/api/flight_types'),
          fetch('/api/tax_rates?is_default=true')
        ]);
        
        if (!typesRes.ok) {
          return;
        }
        
        if (!taxRes.ok) {
          // Continue without tax rate, will use default 15%
          const typesData = await typesRes.json();
          setFlightTypes(typesData.flight_types || []);
          return;
        }
        
        const typesData = await typesRes.json();
        const taxData = await taxRes.json();
        
        setFlightTypes(typesData.flight_types || []);
        
        // Set default tax rate (use first default rate or fallback to 15%)
        if (taxData.tax_rates && taxData.tax_rates.length > 0) {
          setDefaultTaxRate(parseFloat(taxData.tax_rates[0].rate));
        }
      } catch {
        // Don't show toast for initial data loading errors
      }
    }
    fetchData();
  }, []);

  const handleAddRate = () => {
    if (!flightTypes.length) {
      toast.error('No flight types available');
      return;
    }

    // Get available flight types (not already assigned to this instructor)
    const assignedFlightTypeIds = rates.map(rate => rate.flight_type_id);
    const availableFlightTypes = flightTypes.filter(ft => !assignedFlightTypeIds.includes(ft.id));

    if (availableFlightTypes.length === 0) {
      toast.error('All flight types already have rates assigned');
      return;
    }

    // Start adding new rate mode
    setAddingNewRate(true);
    setEditingRate({
      id: 'new', // Temporary ID for new rate
      flight_type_id: availableFlightTypes[0].id,
      rate: '',
    });
  };

  const handleSaveNewRate = async () => {
    if (!editingRate || editingRate.id !== 'new') return;

    const taxInclusiveRate = parseFloat(editingRate.rate);
    if (isNaN(taxInclusiveRate) || taxInclusiveRate < 0) {
      toast.error('Please enter a valid rate');
      return;
    }

    if (!editingRate.flight_type_id) {
      toast.error('Please select a flight type');
      return;
    }

    // Calculate tax-exclusive rate for storage
    const taxExclusiveRate = calculateTaxExclusive(taxInclusiveRate);

    setSaving(true);
    try {
      const res = await fetch('/api/instructor_flight_type_rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructor_id: instructorId,
          flight_type_id: editingRate.flight_type_id,
          rate: taxExclusiveRate,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add rate');
      }

      // Refresh rates
      const ratesRes = await fetch(`/api/instructor_flight_type_rates?instructor_id=${instructorId}`);
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setRates(ratesData.rates || []);
      }
      
      setAddingNewRate(false);
      setEditingRate(null);
      toast.success('Rate added successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add rate');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelNewRate = () => {
    setAddingNewRate(false);
    setEditingRate(null);
  };

  const handleEditRate = (rate: Rate) => {
    console.log('Edit button clicked for rate:', rate.id);
    // Convert stored tax-exclusive rate to tax-inclusive for display
    const taxInclusiveRate = calculateTaxInclusive(rate.rate);
    setEditingRate({
      id: rate.id,
      flight_type_id: rate.flight_type_id,
      rate: taxInclusiveRate.toFixed(2),
      effective_from: rate.effective_from ? rate.effective_from.split('T')[0] : undefined, // Convert to date input format
    });
  };

  const handleCancelEdit = () => {
    setEditingRate(null);
  };

  const handleSaveRate = async () => {
    console.log('Save button clicked for rate:', editingRate?.id);
    if (!editingRate) return;

    const taxInclusiveRate = parseFloat(editingRate.rate);
    if (isNaN(taxInclusiveRate) || taxInclusiveRate < 0) {
      toast.error('Please enter a valid rate');
      return;
    }

    // Calculate tax-exclusive rate for storage
    const taxExclusiveRate = calculateTaxExclusive(taxInclusiveRate);

    setSaving(true);
    try {
      const res = await fetch('/api/instructor_flight_type_rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRate.id,
          flight_type_id: editingRate.flight_type_id,
          rate: taxExclusiveRate,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update rate');
      }

      // Refresh rates
      const ratesRes = await fetch(`/api/instructor_flight_type_rates?instructor_id=${instructorId}`);
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setRates(ratesData.rates || []);
      }
      
      setEditingRate(null);
      toast.success('Rate updated successfully');
    } catch {
      toast.error('Failed to update rate');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      const res = await fetch('/api/instructor_flight_type_rates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rateId }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete rate');
      }

      // Refresh rates
      const ratesRes = await fetch(`/api/instructor_flight_type_rates?instructor_id=${instructorId}`);
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setRates(ratesData.rates || []);
      }
      toast.success('Rate deleted successfully');
    } catch {
      toast.error('Failed to delete rate');
    }
  };

  const isEditing = (rateId: string) => editingRate?.id === rateId;
  const isAddingNew = () => addingNewRate && editingRate?.id === 'new';

  // Tax calculation helpers
  const calculateTaxExclusive = (taxInclusiveAmount: number): number => {
    return taxInclusiveAmount / (1 + defaultTaxRate);
  };

  const calculateTaxInclusive = (taxExclusiveAmount: number): number => {
    return taxExclusiveAmount * (1 + defaultTaxRate);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
          </div>
          <div className="h-9 bg-gray-200 rounded animate-pulse w-24"></div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="bg-gray-50 p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-3 gap-4 items-center">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                <div className="flex gap-2 justify-end">
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600">
              Rates shown include <span className="font-medium text-indigo-600">{Math.round(defaultTaxRate * 100)}% tax</span>
            </p>
          </div>
        </div>
        <Button 
          onClick={handleAddRate} 
          size="sm" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm"
        >
          Add Rate
        </Button>
      </div>

      {/* Main Content */}
      {rates.length === 0 && !addingNewRate ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <Check className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">No rates configured</h3>
              <p className="text-xs text-gray-500 mt-1">Add your first flight type rate to get started</p>
            </div>
            <Button 
              onClick={handleAddRate} 
              variant="outline" 
              size="sm"
              className="mt-2"
            >
              Add First Rate
            </Button>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="border-b border-gray-200">
                <TableHead className="font-semibold text-gray-900 py-4 px-6">
                  Flight Type
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-4 px-6">
                  <div className="flex flex-col">
                    <span>Rate (Inc. Tax)</span>
                    <span className="text-xs font-normal text-gray-500">Per hour</span>
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-4 px-6 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow 
                  key={rate.id} 
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isEditing(rate.id) ? 'bg-indigo-50' : ''
                  }`}
                >
                  <TableCell className="py-4 px-6">
                    {isEditing(rate.id) && editingRate ? (
                      <Select
                        value={editingRate.flight_type_id}
                        onValueChange={(value) => setEditingRate(prev => prev ? { ...prev, flight_type_id: value } : null)}
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {flightTypes.map((flightType) => {
                            // Show current flight type or available ones (not assigned to other rates)
                            const isCurrentFlightType = flightType.id === editingRate.flight_type_id;
                            const isAssignedToOtherRate = rates.some(rate => 
                              rate.flight_type_id === flightType.id && rate.id !== editingRate.id
                            );
                            
                            if (isCurrentFlightType || !isAssignedToOtherRate) {
                              return (
                                <SelectItem key={flightType.id} value={flightType.id}>
                                  {flightType.name}
                                </SelectItem>
                              );
                            }
                            return null;
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="font-medium text-gray-900">
                          {flightTypes.find(ft => ft.id === rate.flight_type_id)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    {isEditing(rate.id) && editingRate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingRate.rate}
                          onChange={(e) => setEditingRate(prev => prev ? { ...prev, rate: e.target.value } : null)}
                          className="w-24 text-center"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <span className="font-semibold text-gray-900 text-lg">
                        ${calculateTaxInclusive(rate.rate).toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    {isEditing(rate.id) ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveRate();
                          }}
                          disabled={saving}
                          className="h-9 px-3 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          type="button"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          disabled={saving}
                          className="h-9 px-3"
                          type="button"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditRate(rate);
                          }}
                          className="h-9 px-3 hover:bg-indigo-50 hover:border-indigo-200"
                          type="button"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteRate(rate.id);
                          }}
                          className="h-9 px-3 text-red-600 hover:bg-red-50 hover:border-red-200"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* New Rate Row */}
              {isAddingNew() && editingRate && (
                <TableRow className="bg-blue-50 border-b border-blue-200">
                  <TableCell className="py-4 px-6">
                    <Select
                      value={editingRate.flight_type_id}
                      onValueChange={(value) => setEditingRate(prev => prev ? { ...prev, flight_type_id: value } : null)}
                    >
                      <SelectTrigger className="w-full max-w-xs border-blue-300 bg-white">
                        <SelectValue placeholder="Select flight type" />
                      </SelectTrigger>
                      <SelectContent>
                        {flightTypes.map((flightType) => {
                          // Only show flight types not already assigned
                          const isAssigned = rates.some(rate => rate.flight_type_id === flightType.id);
                          if (!isAssigned) {
                            return (
                              <SelectItem key={flightType.id} value={flightType.id}>
                                {flightType.name}
                              </SelectItem>
                            );
                          }
                          return null;
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingRate.rate}
                        onChange={(e) => setEditingRate(prev => prev ? { ...prev, rate: e.target.value } : null)}
                        className="w-24 text-center border-blue-300 bg-white"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveNewRate();
                        }}
                        disabled={saving}
                        className="h-9 px-3 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        type="button"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCancelNewRate();
                        }}
                        disabled={saving}
                        className="h-9 px-3"
                        type="button"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 