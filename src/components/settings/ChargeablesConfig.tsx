"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, AlertCircle, DollarSign, Trash2 } from "lucide-react";
import { Chargeable, ChargeableType, ChargeableWithAircraftRates } from "@/types/chargeables";

interface ChargeableFormData {
  name: string;
  description: string;
  chargeable_type_id: string;
  rate: string;
  is_taxable: boolean;
  is_active: boolean;
}

export default function ChargeablesConfig() {
  const [chargeables, setChargeables] = useState<ChargeableWithAircraftRates[]>([]);
  const [selectedChargeable, setSelectedChargeable] = useState<ChargeableWithAircraftRates | null>(null);
  const [chargeableTypes, setChargeableTypes] = useState<ChargeableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [taxRate, setTaxRate] = useState(0.15); // Default 15%
  const [filterTypeId, setFilterTypeId] = useState<string>("all");

  const [editFormData, setEditFormData] = useState<ChargeableFormData>({
    name: "",
    description: "",
    chargeable_type_id: "",
    rate: "",
    is_taxable: true,
    is_active: true,
  });

  const [addFormData, setAddFormData] = useState<ChargeableFormData>({
    name: "",
    description: "",
    chargeable_type_id: "",
    rate: "",
    is_taxable: true,
    is_active: true,
  });

  const fetchChargeables = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/chargeables?include_rates=true");
      if (!response.ok) {
        throw new Error("Failed to fetch chargeables");
      }
      const data = await response.json();
      // Exclude landing fees - they have their own tab now
      const nonLandingFees = (data.chargeables || []).filter(
        (c: ChargeableWithAircraftRates) => c.chargeable_types?.code !== 'landing_fee'
      );
      setChargeables(nonLandingFees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchChargeableTypes = async () => {
    try {
      const response = await fetch("/api/chargeable-types?active_only=true");
      if (!response.ok) {
        throw new Error("Failed to fetch chargeable types");
      }
      const data = await response.json();
      // Exclude landing_fee type - it has its own tab
      const types = (data.chargeable_types || []).filter(
        (t: ChargeableType) => t.code !== 'landing_fee'
      );
      setChargeableTypes(types);
    } catch (err) {
      console.error("Failed to fetch chargeable types:", err);
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

  useEffect(() => {
    fetchChargeables();
    fetchChargeableTypes();
    fetchTaxRate();
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
    if (selectedChargeable) {
      // Convert stored exclusive rate to inclusive for display
      const inclusiveRate = calculateTaxInclusiveRate(selectedChargeable.rate, selectedChargeable.is_taxable);
      setEditFormData({
        name: selectedChargeable.name,
        description: selectedChargeable.description || "",
        chargeable_type_id: selectedChargeable.chargeable_type_id,
        rate: inclusiveRate.toFixed(2),
        is_taxable: selectedChargeable.is_taxable,
        is_active: selectedChargeable.is_active ?? true,
      });
    }
  }, [selectedChargeable, taxRate, calculateTaxInclusiveRate]);

  const resetAddForm = () => {
    setAddFormData({
      name: "",
      description: "",
      chargeable_type_id: "",
      rate: "",
      is_taxable: true,
      is_active: true,
    });
  };

  const handleAdd = async () => {
    if (!addFormData.name.trim() || !addFormData.chargeable_type_id || !addFormData.rate) {
      setError("Name, type, and rate are required");
      return;
    }

    try {
      setSaving(true);
      // Convert inclusive input to exclusive for storage
      const inclusiveRate = parseFloat(addFormData.rate);
      const exclusiveRate = calculateTaxExclusiveRate(inclusiveRate, addFormData.is_taxable);

      const response = await fetch("/api/chargeables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...addFormData,
          rate: exclusiveRate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create chargeable");
      }

      await fetchChargeables();
      setIsAddDialogOpen(false);
      resetAddForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedChargeable) return;

    if (!editFormData.name.trim() || !editFormData.chargeable_type_id || !editFormData.rate) {
      setError("Name, type, and rate are required");
      return;
    }

    try {
      setSaving(true);
      // Convert inclusive input to exclusive for storage
      const inclusiveRate = parseFloat(editFormData.rate);
      const exclusiveRate = calculateTaxExclusiveRate(inclusiveRate, editFormData.is_taxable);

      const response = await fetch("/api/chargeables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedChargeable.id,
          ...editFormData,
          rate: exclusiveRate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update chargeable");
      }

      await fetchChargeables();
      setError(null);

      // Refresh to get updated data
      setSelectedChargeable(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chargeable: Chargeable) => {
    if (!confirm(`Are you sure you want to delete "${chargeable.name}"? This will hide it from the system but preserve historical data.`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/chargeables?id=${chargeable.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete chargeable");
      }

      await fetchChargeables();
      if (selectedChargeable?.id === chargeable.id) {
        setSelectedChargeable(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const filteredChargeables = chargeables.filter(chargeable => {
    const typeName = chargeable.chargeable_types?.name || '';
    const matchesSearch = chargeable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chargeable.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      typeName.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterTypeId === "all") return matchesSearch;

    return matchesSearch && chargeable.chargeable_type_id === filterTypeId;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading chargeables...</div>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex gap-6">
      {/* Left side - List of chargeables */}
      <div className="w-1/2 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search chargeables..."
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
                <DialogTitle>Add New Chargeable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-name">Name</Label>
                  <Input
                    id="add-name"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    placeholder="Enter chargeable name"
                  />
                </div>
                <div>
                  <Label htmlFor="add-type">Type</Label>
                  <Select
                    value={addFormData.chargeable_type_id}
                    onValueChange={(value) => setAddFormData({ ...addFormData, chargeable_type_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {chargeableTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="add-rate">Rate (NZD, Tax Inclusive)</Label>
                  <Input
                    id="add-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={addFormData.rate}
                    onChange={(e) => setAddFormData({ ...addFormData, rate: e.target.value })}
                    placeholder="0.00"
                  />
                  {addFormData.rate && !isNaN(parseFloat(addFormData.rate)) && (
                    <div className="mt-2 text-xs text-gray-500">
                      {addFormData.is_taxable
                        ? `Tax Exclusive: ${formatCurrency(calculateTaxExclusiveRate(parseFloat(addFormData.rate), true))}`
                        : `Tax Exempt (no conversion needed)`
                      }
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="add-description">Description (Optional)</Label>
                  <Textarea
                    id="add-description"
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    placeholder="Enter description"
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
                    disabled={saving || !addFormData.name.trim() || !addFormData.chargeable_type_id || !addFormData.rate}
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

        <div className="mb-4">
          <Label htmlFor="filter-type" className="text-sm mb-2 block">Filter by Type</Label>
          <Select
            value={filterTypeId}
            onValueChange={(value) => setFilterTypeId(value)}
          >
            <SelectTrigger id="filter-type" className="w-full">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {chargeableTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg">
          {filteredChargeables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "No chargeables match your search." : "No chargeables configured yet."}
            </div>
          ) : (
            <div className="divide-y">
              {filteredChargeables.map((chargeable) => (
                <div
                  key={chargeable.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChargeable?.id === chargeable.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                  onClick={() => setSelectedChargeable(chargeable)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{chargeable.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {chargeable.chargeable_types?.name || 'Unknown'}
                      </Badge>
                      {chargeable.is_taxable ? (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          Taxable
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          Tax Exempt
                        </Badge>
                      )}
                      {!chargeable.is_active && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Edit form */}
      <div className="w-1/2 border rounded-lg p-6 flex flex-col">
        {selectedChargeable ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Edit Chargeable</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(selectedChargeable)}
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
                  placeholder="Enter chargeable name"
                />
              </div>

              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={editFormData.chargeable_type_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, chargeable_type_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {chargeableTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-rate">Rate (NZD, Tax Inclusive)</Label>
                <Input
                  id="edit-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.rate}
                  onChange={(e) => setEditFormData({ ...editFormData, rate: e.target.value })}
                  placeholder="0.00"
                />
                {editFormData.rate && !isNaN(parseFloat(editFormData.rate)) && (
                  <div className="mt-2 text-xs text-gray-500">
                    {editFormData.is_taxable
                      ? `Tax Exclusive: ${formatCurrency(calculateTaxExclusiveRate(parseFloat(editFormData.rate), true))}`
                      : `Tax Exempt (no conversion needed)`
                    }
                  </div>
                )}
              </div>

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
                disabled={saving || !editFormData.name.trim() || !editFormData.chargeable_type_id || !editFormData.rate}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a chargeable from the list to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}