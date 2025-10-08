"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, AlertCircle, PlaneLanding, Trash2 } from "lucide-react";
import { ChargeableWithAircraftRates } from "@/types/chargeables";
import { AircraftType } from "@/types/aircraft_types";

interface LandingFeeFormData {
  name: string;
  description: string;
  chargeable_type_id: string; // Will always be landing_fee type
  is_taxable: boolean;
  is_active: boolean;
}

export default function LandingFeesConfig() {
  const [landingFees, setLandingFees] = useState<ChargeableWithAircraftRates[]>([]);
  const [selectedFee, setSelectedFee] = useState<ChargeableWithAircraftRates | null>(null);
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([]);
  const [landingFeeTypeId, setLandingFeeTypeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [taxRate, setTaxRate] = useState(0.15);
  const [aircraftRates, setAircraftRates] = useState<Record<string, string>>({});

  const [editFormData, setEditFormData] = useState<LandingFeeFormData>({
    name: "",
    description: "",
    chargeable_type_id: "",
    is_taxable: true,
    is_active: true,
  });

  const [addFormData, setAddFormData] = useState<LandingFeeFormData>({
    name: "",
    description: "",
    chargeable_type_id: "",
    is_taxable: true,
    is_active: true,
  });

  const fetchLandingFees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/chargeables?type=landing_fee&include_rates=true");
      if (!response.ok) {
        throw new Error("Failed to fetch landing fees");
      }
      const data = await response.json();
      setLandingFees(data.chargeables || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchAircraftTypes = async () => {
    try {
      const response = await fetch("/api/aircraft-types");
      if (!response.ok) {
        throw new Error("Failed to fetch aircraft types");
      }
      const data = await response.json();
      setAircraftTypes(data.aircraft_types || []);
    } catch (err) {
      console.error("Failed to fetch aircraft types:", err);
    }
  };

  const fetchTaxRate = async () => {
    try {
      const response = await fetch("/api/tax_rates?is_default=true");
      if (!response.ok) {
        throw new Error("Failed to fetch tax rate");
      }
      const data = await response.json();
      const defaultRate = data.tax_rates?.[0]?.rate;
      setTaxRate(defaultRate || 0.15);
    } catch {
      console.warn("Could not fetch tax rate, using default 15%");
      setTaxRate(0.15);
    }
  };

  const fetchLandingFeeTypeId = async () => {
    try {
      const response = await fetch("/api/chargeable-types");
      if (response.ok) {
        const data = await response.json();
        const landingFeeType = data.chargeable_types?.find((t: { code: string }) => t.code === 'landing_fee');
        if (landingFeeType) {
          setLandingFeeTypeId(landingFeeType.id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch landing fee type:", err);
    }
  };

  useEffect(() => {
    fetchLandingFees();
    fetchTaxRate();
    fetchAircraftTypes();
    fetchLandingFeeTypeId();
  }, []);

  const calculateTaxInclusiveRate = useCallback((rate: number, isTaxable: boolean = true) => {
    if (!isTaxable) return rate;
    return rate * (1 + taxRate);
  }, [taxRate]);

  const calculateTaxExclusiveRate = useCallback((inclusiveRate: number, isTaxable: boolean = true) => {
    if (!isTaxable) return inclusiveRate;
    return inclusiveRate / (1 + taxRate);
  }, [taxRate]);

  useEffect(() => {
    if (selectedFee) {
      setEditFormData({
        name: selectedFee.name,
        description: selectedFee.description || "",
        chargeable_type_id: selectedFee.chargeable_type_id,
        is_taxable: selectedFee.is_taxable,
        is_active: selectedFee.is_active ?? true,
      });

      // Initialize aircraft rates for landing fees (convert to inclusive)
      if (selectedFee.landing_fee_rates) {
        const rates: Record<string, string> = {};
        selectedFee.landing_fee_rates.forEach(r => {
          const inclusive = calculateTaxInclusiveRate(r.rate, selectedFee.is_taxable);
          rates[r.aircraft_type_id] = inclusive.toFixed(2);
        });
        setAircraftRates(rates);
      } else {
        setAircraftRates({});
      }
    }
  }, [selectedFee, taxRate, calculateTaxInclusiveRate]);

  const resetAddForm = () => {
    setAddFormData({
      name: "",
      description: "",
      chargeable_type_id: landingFeeTypeId,
      is_taxable: true,
      is_active: true,
    });
  };

  const handleAdd = async () => {
    if (!addFormData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSaving(true);
      // Landing fees don't use the default rate - set to 0
      const response = await fetch("/api/chargeables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...addFormData,
          chargeable_type_id: landingFeeTypeId,
          rate: 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create landing fee");
      }

      await fetchLandingFees();
      setIsAddDialogOpen(false);
      resetAddForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const saveAircraftRates = async (chargeableId: string) => {
    const existingRates = selectedFee?.landing_fee_rates || [];

    // Update or create rates for each aircraft type that has a value
    for (const aircraftTypeId of Object.keys(aircraftRates)) {
      const rateValue = aircraftRates[aircraftTypeId];
      if (!rateValue || rateValue.trim() === '') continue;

      // Convert inclusive input to exclusive for storage
      const inclusiveRate = parseFloat(rateValue);
      const exclusiveRate = calculateTaxExclusiveRate(inclusiveRate, editFormData.is_taxable);

      const existingRate = existingRates.find(r => r.aircraft_type_id === aircraftTypeId);

      if (existingRate) {
        // Update existing rate
        await fetch("/api/landing-fee-rates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chargeable_id: chargeableId,
            aircraft_type_id: aircraftTypeId,
            rate: exclusiveRate,
          }),
        });
      } else {
        // Create new rate
        await fetch("/api/landing-fee-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chargeable_id: chargeableId,
            aircraft_type_id: aircraftTypeId,
            rate: exclusiveRate,
          }),
        });
      }
    }

    // Delete rates that were cleared (empty string or removed)
    for (const existingRate of existingRates) {
      const currentValue = aircraftRates[existingRate.aircraft_type_id];
      if (!currentValue || currentValue.trim() === '') {
        await fetch(
          `/api/landing-fee-rates?chargeable_id=${chargeableId}&aircraft_type_id=${existingRate.aircraft_type_id}`,
          { method: "DELETE" }
        );
      }
    }
  };

  const handleEdit = async () => {
    if (!selectedFee) return;

    if (!editFormData.name.trim()) {
      setError("Name is required");
      return;
    }

    // Validate that at least one aircraft rate is set
    const hasAircraftRates = Object.values(aircraftRates).some(rate => rate && rate.trim() !== '');
    if (!hasAircraftRates) {
      setError("At least one aircraft-specific rate must be set");
      return;
    }

    try {
      setSaving(true);
      // Landing fees don't use the default rate - set to 0
      const response = await fetch("/api/chargeables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedFee.id,
          ...editFormData,
          chargeable_type_id: landingFeeTypeId,
          rate: 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update landing fee");
      }

      // Save aircraft-specific rates
      await saveAircraftRates(selectedFee.id);

      await fetchLandingFees();
      setError(null);

      // Update selected fee to reflect changes
      const updatedFees = landingFees.map(f =>
        f.id === selectedFee.id ? { ...f, ...editFormData } : f
      );
      const updatedSelected = updatedFees.find(f => f.id === selectedFee.id);
      if (updatedSelected) {
        setSelectedFee(updatedSelected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fee: ChargeableWithAircraftRates) => {
    if (!confirm(`Are you sure you want to delete "${fee.name}"? This will hide it from the system but preserve historical data.`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/chargeables?id=${fee.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete landing fee");
      }

      await fetchLandingFees();
      if (selectedFee?.id === fee.id) {
        setSelectedFee(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const filteredFees = landingFees.filter(fee => {
    return fee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading landing fees...</div>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex gap-6">
      {/* Left side - List of landing fees */}
      <div className="w-1/2 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search landing fees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetAddForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full rounded-xl p-6">
              <DialogHeader>
                <DialogTitle>Add New Landing Fee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-name">Name</Label>
                  <Input
                    id="add-name"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    placeholder="e.g., Wellington International"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    You&apos;ll set aircraft-specific rates after creating
                  </div>
                </div>
                <div>
                  <Label htmlFor="add-description">Description (Optional)</Label>
                  <Textarea
                    id="add-description"
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    placeholder="e.g., Landing fees for Wellington airport"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-is_taxable"
                    checked={addFormData.is_taxable}
                    onCheckedChange={(checked) => setAddFormData({ ...addFormData, is_taxable: checked })}
                  />
                  <Label htmlFor="add-is_taxable">Taxable (uses organization tax rate)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-is_active"
                    checked={addFormData.is_active}
                    onCheckedChange={(checked) => setAddFormData({ ...addFormData, is_active: checked })}
                  />
                  <Label htmlFor="add-is_active">Active</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={saving || !addFormData.name.trim()}
                  >
                    {saving ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto border rounded-lg">
          {filteredFees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "No landing fees match your search." : "No landing fees configured yet."}
            </div>
          ) : (
            <div className="divide-y">
              {filteredFees.map((fee) => (
                <div
                  key={fee.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedFee?.id === fee.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                  onClick={() => setSelectedFee(fee)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{fee.name}</h4>
                      {fee.is_taxable ? (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          Taxable
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          Tax Exempt
                        </Badge>
                      )}
                      {!fee.is_active && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  {fee.description && (
                    <p className="text-sm text-gray-500 mt-1">{fee.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Edit form */}
      <div className="w-1/2 border rounded-lg p-6 flex flex-col">
        {selectedFee ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Edit Landing Fee</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(selectedFee)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Enter landing fee name"
                />
              </div>

              {/* Aircraft-specific rates */}
              {aircraftTypes.length > 0 && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <Label className="mb-3 block">Aircraft-Specific Rates (Tax Inclusive)</Label>
                  <div className="text-xs text-gray-500 mb-3">
                    Set rates for each aircraft type. At least one rate is required.
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {aircraftTypes.map((aircraftType) => (
                      <div key={aircraftType.id} className="flex items-center gap-2">
                        <Label htmlFor={`rate-${aircraftType.id}`} className="w-32 text-sm truncate">
                          {aircraftType.name}
                        </Label>
                        <Input
                          id={`rate-${aircraftType.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={aircraftRates[aircraftType.id] || ''}
                          onChange={(e) => setAircraftRates({ ...aircraftRates, [aircraftType.id]: e.target.value })}
                          placeholder="0.00"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_taxable"
                  checked={editFormData.is_taxable}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_taxable: checked })}
                />
                <Label htmlFor="edit-is_taxable">Taxable (uses organization tax rate)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={editFormData.is_active}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_active: checked })}
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={handleEdit}
                disabled={saving || !editFormData.name.trim()}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <PlaneLanding className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a landing fee from the list to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
