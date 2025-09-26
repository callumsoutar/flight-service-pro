"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, AlertCircle, Users, Trash2, X } from "lucide-react";
import { MembershipType } from "@/types/memberships";

interface MembershipTypeFormData {
  name: string;
  code: string;
  description: string;
  price: string;
  duration_months: string;
  benefits: string[];
  is_active: boolean;
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

  const [editFormData, setEditFormData] = useState<MembershipTypeFormData>({
    name: "",
    code: "",
    description: "",
    price: "",
    duration_months: "",
    benefits: [],
    is_active: true,
  });

  const [addFormData, setAddFormData] = useState<MembershipTypeFormData>({
    name: "",
    code: "",
    description: "",
    price: "",
    duration_months: "12",
    benefits: [],
    is_active: true,
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

  useEffect(() => {
    fetchMembershipTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      setEditFormData({
        name: selectedType.name,
        code: selectedType.code,
        description: selectedType.description || "",
        price: selectedType.price.toString(),
        duration_months: selectedType.duration_months.toString(),
        benefits: [...selectedType.benefits],
        is_active: selectedType.is_active ?? true,
      });
    }
  }, [selectedType]);

  const resetAddForm = () => {
    setAddFormData({
      name: "",
      code: "",
      description: "",
      price: "",
      duration_months: "12",
      benefits: [],
      is_active: true,
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
      const response = await fetch("/api/membership_types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...addFormData,
          price: parseFloat(addFormData.price),
          duration_months: parseInt(addFormData.duration_months),
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
      const response = await fetch(`/api/membership_types/${selectedType.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFormData,
          price: parseFloat(editFormData.price),
          duration_months: parseInt(editFormData.duration_months),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update membership type");
      }

      await fetchMembershipTypes();
      setError(null);

      const updatedTypes = membershipTypes.map(t =>
        t.id === selectedType.id ? {
          ...t,
          ...editFormData,
          price: parseFloat(editFormData.price),
          duration_months: parseInt(editFormData.duration_months)
        } : t
      );
      const updatedSelected = updatedTypes.find(t => t.id === selectedType.id);
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
                  <Label htmlFor="add-price">Annual Fee (NZD)</Label>
                  <Input
                    id="add-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={addFormData.price}
                    onChange={(e) => setAddFormData({ ...addFormData, price: e.target.value })}
                    placeholder="0.00"
                  />
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

            <div className="space-y-4 overflow-y-auto flex-1">
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

              <div>
                <Label htmlFor="edit-price">Annual Fee (NZD)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                  placeholder="0.00"
                />
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

              <div>
                <Label>Benefits</Label>
                <div className="space-y-2">
                  {editFormData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      <span className="flex-1 text-sm">{benefit}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBenefitFromForm(index, "edit")}
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
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefitToForm("edit"))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addBenefitToForm("edit")}
                      disabled={!newBenefit.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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