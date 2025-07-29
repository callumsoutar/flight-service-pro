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
    return <div className="p-4 text-center">Loading rates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Flight Type Rates</h3>
          <p className="text-sm text-gray-500">Rates shown include {Math.round(defaultTaxRate * 100)}% tax</p>
        </div>
        <Button onClick={handleAddRate} size="sm">
          Add Rate
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flight Type</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((rate) => (
            <TableRow key={rate.id}>
              <TableCell>
                {isEditing(rate.id) && editingRate ? (
                  <Select
                    value={editingRate.flight_type_id}
                    onValueChange={(value) => setEditingRate(prev => prev ? { ...prev, flight_type_id: value } : null)}
                  >
                    <SelectTrigger className="w-64">
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
                  flightTypes.find(ft => ft.id === rate.flight_type_id)?.name || 'Unknown'
                )}
              </TableCell>
              <TableCell>
                {isEditing(rate.id) && editingRate ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingRate.rate}
                    onChange={(e) => setEditingRate(prev => prev ? { ...prev, rate: e.target.value } : null)}
                    className="w-24"
                  />
                ) : (
                  `$${calculateTaxInclusive(rate.rate).toFixed(2)}`
                )}
              </TableCell>


              <TableCell>
                {isEditing(rate.id) ? (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSaveRate();
                      }}
                      disabled={saving}
                      className="h-8 w-8 p-0"
                      type="button"
                    >
                      <Check className="h-4 w-4" />
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
                      className="h-8 w-8 p-0"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditRate(rate);
                      }}
                      className="h-8 w-8 p-0"
                      type="button"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteRate(rate.id);
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
          
          {/* New Rate Row */}
          {isAddingNew() && editingRate && (
            <TableRow className="bg-blue-50">
              <TableCell>
                <Select
                  value={editingRate.flight_type_id}
                  onValueChange={(value) => setEditingRate(prev => prev ? { ...prev, flight_type_id: value } : null)}
                >
                  <SelectTrigger className="w-64">
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
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingRate.rate}
                  onChange={(e) => setEditingRate(prev => prev ? { ...prev, rate: e.target.value } : null)}
                  className="w-24"
                  placeholder="0.00"
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveNewRate();
                    }}
                    disabled={saving}
                    className="h-8 w-8 p-0"
                    type="button"
                  >
                    <Check className="h-4 w-4" />
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
                    className="h-8 w-8 p-0"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 