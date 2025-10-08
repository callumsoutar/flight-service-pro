"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, AlertCircle, Users, Trash2, X, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { MembershipType } from "@/types/memberships";

interface MembershipTypeFormData {
  name: string;
  code: string;
  description: string;
  price: string;
  duration_months: string;
  benefits: string[];
  is_active: boolean;
  chargeable_id: string | null;
}

export default function MembershipTypesConfig() {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [selectedType, setSelectedType] = useState<MembershipType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBenefit, setNewBenefit] = useState("");
  const [membershipChargeables, setMembershipChargeables] = useState<{id: string; name: string; rate: number; is_taxable: boolean}[]>([]);
  const [isBenefitsExpanded, setIsBenefitsExpanded] = useState(false);
  const [taxRate, setTaxRate] = useState(0.15);

  const [editFormData, setEditFormData] = useState<MembershipTypeFormData>({
    name: "",
    code: "",
    description: "",
    price: "",
    duration_months: "",
    benefits: [],
    is_active: true,
    chargeable_id: null,
  });

  const [addFormData, setAddFormData] = useState<MembershipTypeFormData>({
    name: "",
    code: "",
    description: "",
    price: "",
    duration_months: "12",
    benefits: [],
    is_active: true,
    chargeable_id: null,
  });

  const fetchMembershipTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/membership_types");
      if (!response.ok) {
        throw new Error("Failed to fetch membership types");
      }
      const data = await response.json();
      setMembershipTypes(data.membership_types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipChargeables = async () => {
    try {
      const response = await fetch("/api/chargeables?type=membership_fee");
      if (response.ok) {
        const data = await response.json();
        setMembershipChargeables(data.chargeables || []);
      }
    } catch (err) {
      console.error("Failed to fetch membership chargeables:", err);
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
    fetchMembershipTypes();
    fetchMembershipChargeables();
    fetchTaxRate();
  }, []);

  const getChargeableTaxStatus = useCallback((chargeableId: string | null) => {
    if (!chargeableId) return false;
    const chargeable = membershipChargeables.find(c => c.id === chargeableId);
    return chargeable?.is_taxable || false;
  }, [membershipChargeables]);

  const calculateTaxInclusiveRate = useCallback((rate: number, isTaxable: boolean = true) => {
    if (!isTaxable) return rate;
    return rate * (1 + taxRate);
  }, [taxRate]);

  const calculateTaxExclusiveRate = useCallback((inclusiveRate: number, isTaxable: boolean = true) => {
    if (!isTaxable) return inclusiveRate;
    return inclusiveRate / (1 + taxRate);
  }, [taxRate]);

  useEffect(() => {
    if (selectedType) {
      // Convert stored exclusive price to inclusive for display
      const isTaxable = getChargeableTaxStatus(selectedType.chargeable_id);
      const inclusivePrice = calculateTaxInclusiveRate(selectedType.price, isTaxable);
      setEditFormData({
        name: selectedType.name,
        code: selectedType.code,
        description: selectedType.description || "",
        price: inclusivePrice.toFixed(2),
        duration_months: selectedType.duration_months.toString(),
        benefits: [...selectedType.benefits],
        is_active: selectedType.is_active ?? true,
        chargeable_id: selectedType.chargeable_id || null,
      });
    }
  }, [selectedType, membershipChargeables, taxRate, getChargeableTaxStatus, calculateTaxInclusiveRate]);

  const resetAddForm = () => {
    setAddFormData({
      name: "",
      code: "",
      description: "",
      price: "",
      duration_months: "12",
      benefits: [],
      is_active: true,
      chargeable_id: null,
    });
  };

  const generateCode = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);
  };

  const handleAdd = async () => {
    if (!addFormData.name.trim() || !addFormData.code.trim() || !addFormData.price || !addFormData.duration_months) {
      setError("Name, code, price, and duration are required");
      return;
    }

    try {
      setSaving(true);
      // Convert inclusive input to exclusive for storage
      const isTaxable = getChargeableTaxStatus(addFormData.chargeable_id);
      const inclusivePrice = parseFloat(addFormData.price);
      const exclusivePrice = calculateTaxExclusiveRate(inclusivePrice, isTaxable);

      const response = await fetch("/api/membership_types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...addFormData,
          price: exclusivePrice,
          duration_months: parseInt(addFormData.duration_months),
          chargeable_id: addFormData.chargeable_id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create membership type");
      }

      await fetchMembershipTypes();
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
    if (!selectedType) return;

    if (!editFormData.name.trim() || !editFormData.code.trim() || !editFormData.price || !editFormData.duration_months) {
      setError("Name, code, price, and duration are required");
      return;
    }

    try {
      setSaving(true);
      // Convert inclusive input to exclusive for storage
      const isTaxable = getChargeableTaxStatus(editFormData.chargeable_id);
      const inclusivePrice = parseFloat(editFormData.price);
      const exclusivePrice = calculateTaxExclusiveRate(inclusivePrice, isTaxable);

      // Update the membership type
      const response = await fetch(`/api/membership_types/${selectedType.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFormData,
          price: exclusivePrice,
          duration_months: parseInt(editFormData.duration_months),
          chargeable_id: editFormData.chargeable_id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update membership type");
      }

      // If there's a linked chargeable, update its rate to match (chargeable is source of truth for invoicing)
      if (editFormData.chargeable_id) {
        try {
          await fetch(`/api/chargeables`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: editFormData.chargeable_id,
              rate: exclusivePrice,
            }),
          });
        } catch (chargeableErr) {
          console.error("Failed to update linked chargeable:", chargeableErr);
          // Don't fail the whole operation if chargeable update fails
        }
      }

      await fetchMembershipTypes();
      await fetchMembershipChargeables();
      setError(null);

      // Refresh the selected type from the fetched data
      const refreshedTypes = await fetch("/api/membership_types").then(r => r.json());
      const updatedSelected = refreshedTypes.membership_types?.find((t: MembershipType) => t.id === selectedType.id);
      if (updatedSelected) {
        setSelectedType(updatedSelected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: MembershipType) => {
    if (!confirm(`Are you sure you want to delete "${type.name}"? This will deactivate it but preserve historical data.`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/membership_types/${type.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete membership type");
      }

      await fetchMembershipTypes();
      if (selectedType?.id === type.id) {
        setSelectedType(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const addBenefitToForm = (formType: "add" | "edit") => {
    if (!newBenefit.trim()) return;

    if (formType === "add") {
      setAddFormData({
        ...addFormData,
        benefits: [...addFormData.benefits, newBenefit.trim()],
      });
    } else {
      setEditFormData({
        ...editFormData,
        benefits: [...editFormData.benefits, newBenefit.trim()],
      });
    }
    setNewBenefit("");
  };

  const removeBenefitFromForm = (index: number, formType: "add" | "edit") => {
    if (formType === "add") {
      setAddFormData({
        ...addFormData,
        benefits: addFormData.benefits.filter((_, i) => i !== index),
      });
    } else {
      setEditFormData({
        ...editFormData,
        benefits: editFormData.benefits.filter((_, i) => i !== index),
      });
    }
  };

  const filteredTypes = membershipTypes.filter(type => {
    const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDuration = (months: number) => {
    if (months === 1) return "1 month";
    if (months === 12) return "1 year";
    if (months % 12 === 0) return `${months / 12} years`;
    return `${months} months`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading membership types...</div>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex gap-6">
      <div className="w-1/2 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search membership types..."
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
            <DialogContent className="max-w-2xl w-full rounded-xl p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Membership Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-name">Name</Label>
                  <Input
                    id="add-name"
                    value={addFormData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setAddFormData({
                        ...addFormData,
                        name,
                        code: generateCode(name)
                      });
                    }}
                    placeholder="e.g., Flying Member"
                  />
                </div>
                <div>
                  <Label htmlFor="add-code">Code</Label>
                  <Input
                    id="add-code"
                    value={addFormData.code}
                    onChange={(e) => setAddFormData({ ...addFormData, code: e.target.value })}
                    placeholder="e.g., flying_member"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier (auto-generated from name)</p>
                </div>
                <div>
                  <Label htmlFor="add-price">Annual Fee (NZD, Tax Inclusive)</Label>
                  <Input
                    id="add-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={addFormData.price}
                    onChange={(e) => setAddFormData({ ...addFormData, price: e.target.value })}
                    placeholder="0.00"
                  />
                  {addFormData.price && !isNaN(parseFloat(addFormData.price)) && (
                    <div className="mt-2 text-xs text-gray-500">
                      {getChargeableTaxStatus(addFormData.chargeable_id)
                        ? `Tax Exclusive: ${formatCurrency(calculateTaxExclusiveRate(parseFloat(addFormData.price), true))}`
                        : `Not linked to taxable chargeable (no conversion needed)`
                      }
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="add-duration">Duration (Months)</Label>
                  <Input
                    id="add-duration"
                    type="number"
                    min="1"
                    value={addFormData.duration_months}
                    onChange={(e) => setAddFormData({ ...addFormData, duration_months: e.target.value })}
                    placeholder="12"
                  />
                  <p className="text-xs text-gray-500 mt-1">12 for annual, 1 for monthly</p>
                </div>
                <div>
                  <Label htmlFor="add-chargeable">Linked Chargeable (Optional)</Label>
                  <Select
                    value={addFormData.chargeable_id || "none"}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, chargeable_id: value === "none" ? null : value })
                    }
                  >
                    <SelectTrigger id="add-chargeable" className="w-full">
                      <SelectValue placeholder="Select a chargeable..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-gray-500">No linked chargeable</span>
                      </SelectItem>
                      {membershipChargeables.map((chargeable) => (
                        <SelectItem key={chargeable.id} value={chargeable.id}>
                          <div className="flex items-center gap-2">
                            <Link2 className="w-3 h-3" />
                            <span>{chargeable.name}</span>
                            <span className="text-xs text-gray-500">
                              - ${chargeable.rate.toFixed(2)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Link to an existing membership fee chargeable</p>
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
                <div>
                  <Label>Benefits</Label>
                  <div className="space-y-2">
                    {addFormData.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <span className="flex-1 text-sm">{benefit}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBenefitFromForm(index, "add")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newBenefit}
                        onChange={(e) => setNewBenefit(e.target.value)}
                        placeholder="Add a benefit..."
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefitToForm("add"))}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addBenefitToForm("add")}
                        disabled={!newBenefit.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-is_active"
                    checked={addFormData.is_active}
                    onCheckedChange={(checked) => setAddFormData({ ...addFormData, is_active: checked })}
                  />
                  <Label htmlFor="add-is_active">Active</Label>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={saving || !addFormData.name.trim() || !addFormData.code.trim() || !addFormData.price || !addFormData.duration_months}
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
          {filteredTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "No membership types match your search." : "No membership types configured yet."}
            </div>
          ) : (
            <div className="divide-y">
              {filteredTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedType?.id === type.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                  onClick={() => setSelectedType(type)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{type.name}</h4>
                      {!type.is_active && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <span className="font-semibold text-indigo-600">{formatCurrency(type.price)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Code: {type.code}</span>
                    <span>•</span>
                    <span>{formatDuration(type.duration_months)}</span>
                    {type.benefits.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{type.benefits.length} benefits</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-1/2 border rounded-lg p-6">
        {selectedType ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Edit Membership Type</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(selectedType)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="e.g., Flying Member"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-code">Code</Label>
                    <Input
                      id="edit-code"
                      value={editFormData.code}
                      onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                      placeholder="e.g., flying_member"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Enter description"
                    rows={2}
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pricing & Billing</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-price">Annual Fee (NZD, Tax Inclusive)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                      placeholder="0.00"
                    />
                    {editFormData.price && !isNaN(parseFloat(editFormData.price)) && (
                      <div className="mt-2 text-xs text-gray-500">
                        {getChargeableTaxStatus(editFormData.chargeable_id)
                          ? `Tax Exclusive: ${formatCurrency(calculateTaxExclusiveRate(parseFloat(editFormData.price), true))}`
                          : `Not linked to taxable chargeable (no conversion needed)`
                        }
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="edit-duration">Duration (Months)</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      min="1"
                      value={editFormData.duration_months}
                      onChange={(e) => setEditFormData({ ...editFormData, duration_months: e.target.value })}
                      placeholder="12"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-chargeable">Linked Chargeable</Label>
                  <Select
                    value={editFormData.chargeable_id || "none"}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, chargeable_id: value === "none" ? null : value })
                    }
                  >
                    <SelectTrigger id="edit-chargeable" className="w-full">
                      <SelectValue placeholder="Select a chargeable..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-gray-500">No linked chargeable</span>
                      </SelectItem>
                      {membershipChargeables.map((chargeable) => (
                        <SelectItem key={chargeable.id} value={chargeable.id}>
                          <div className="flex items-center gap-2">
                            <Link2 className="w-3 h-3" />
                            <span>{chargeable.name}</span>
                            <span className="text-xs text-gray-500">
                              - ${chargeable.rate.toFixed(2)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editFormData.chargeable_id && selectedType?.chargeables && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <p className="text-blue-700 text-xs">
                        Rate: ${selectedType.chargeables.rate.toFixed(2)} |
                        Tax: {selectedType.chargeables.is_taxable ? 'Taxable' : 'Tax Exempt'}
                      </p>
                    </div>
                  )}
                  {editFormData.chargeable_id && selectedType?.chargeables &&
                   parseFloat(editFormData.price) !== selectedType.chargeables.rate && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-amber-900 font-medium">Price Mismatch</p>
                        <p className="text-amber-700 text-xs mt-1">
                          Membership price (${parseFloat(editFormData.price).toFixed(2)}) doesn&apos;t match chargeable rate (${selectedType.chargeables.rate.toFixed(2)})
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Benefits Section */}
              <div className="space-y-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsBenefitsExpanded(!isBenefitsExpanded)}
                  className="w-full flex items-center justify-between group hover:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Member Benefits</h4>
                    {editFormData.benefits.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {editFormData.benefits.length}
                      </Badge>
                    )}
                  </div>
                  {isBenefitsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {isBenefitsExpanded && (
                  <div className="space-y-2">
                    {editFormData.benefits.length > 0 ? (
                      editFormData.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-md border border-gray-200">
                          <span className="flex-1 text-sm text-gray-700">{benefit}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBenefitFromForm(index, "edit")}
                            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic py-2">No benefits added yet</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newBenefit}
                        onChange={(e) => setNewBenefit(e.target.value)}
                        placeholder="Add a benefit..."
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefitToForm("edit"))}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addBenefitToForm("edit")}
                        disabled={!newBenefit.trim()}
                        className="px-3"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Section */}
              <div className="space-y-4 pt-4 border-t pb-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status</h4>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="edit-is_active"
                      checked={editFormData.is_active}
                      onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_active: checked })}
                    />
                    <Label htmlFor="edit-is_active" className="cursor-pointer">
                      <span className="font-medium">Active</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {editFormData.is_active ? 'Available for new memberships' : 'Hidden from selection'}
                      </p>
                    </Label>
                  </div>
                  {editFormData.is_active ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 border-gray-300">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t">
              <Button
                onClick={handleEdit}
                disabled={saving || !editFormData.name.trim() || !editFormData.code.trim() || !editFormData.price || !editFormData.duration_months}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a membership type from the list to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}