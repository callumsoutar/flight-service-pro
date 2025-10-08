"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, AlertCircle, Tag, Trash2 } from "lucide-react";
import { ChargeableType } from "@/types/chargeables";

interface ChargeableTypeFormData {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export default function ChargeableTypesConfig() {
  const [chargeableTypes, setChargeableTypes] = useState<ChargeableType[]>([]);
  const [selectedType, setSelectedType] = useState<ChargeableType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [editFormData, setEditFormData] = useState<ChargeableTypeFormData>({
    code: "",
    name: "",
    description: "",
    is_active: true,
  });

  const [addFormData, setAddFormData] = useState<ChargeableTypeFormData>({
    code: "",
    name: "",
    description: "",
    is_active: true,
  });

  const fetchChargeableTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/chargeable-types");
      if (!response.ok) {
        throw new Error("Failed to fetch chargeable types");
      }
      const data = await response.json();
      setChargeableTypes(data.chargeable_types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChargeableTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      setEditFormData({
        code: selectedType.code,
        name: selectedType.name,
        description: selectedType.description || "",
        is_active: selectedType.is_active,
      });
    }
  }, [selectedType]);

  const resetAddForm = () => {
    setAddFormData({
      code: "",
      name: "",
      description: "",
      is_active: true,
    });
  };

  const handleAdd = async () => {
    if (!addFormData.name.trim() || !addFormData.code.trim()) {
      setError("Name and code are required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/chargeable-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create chargeable type");
      }

      await fetchChargeableTypes();
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

    if (!editFormData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/chargeable-types", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedType.id,
          ...editFormData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update chargeable type");
      }

      await fetchChargeableTypes();
      setError(null);
      setSelectedType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: ChargeableType) => {
    if (type.is_system) {
      setError("Cannot delete system chargeable types");
      return;
    }

    if (!confirm(`Are you sure you want to deactivate "${type.name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/chargeable-types?id=${type.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete chargeable type");
      }

      await fetchChargeableTypes();
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

  const filteredTypes = chargeableTypes.filter(type => {
    return type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading chargeable types...</div>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex gap-6">
      {/* Left side - List of chargeable types */}
      <div className="w-1/2 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search chargeable types..."
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
                <DialogTitle>Add New Chargeable Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-name">Name</Label>
                  <Input
                    id="add-name"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    placeholder="e.g., Equipment Rental"
                  />
                </div>
                <div>
                  <Label htmlFor="add-code">Code</Label>
                  <Input
                    id="add-code"
                    value={addFormData.code}
                    onChange={(e) => setAddFormData({ ...addFormData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    placeholder="e.g., equipment_rental"
                  />
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
                    disabled={saving || !addFormData.name.trim() || !addFormData.code.trim()}
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
              {searchTerm ? "No chargeable types match your search." : "No chargeable types configured yet."}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{type.name}</h4>
                      <Badge variant="outline" className="text-xs font-mono">
                        {type.code}
                      </Badge>
                      {type.is_system && (
                        <Badge variant="default" className="text-xs bg-purple-100 text-purple-800">
                          System
                        </Badge>
                      )}
                      {!type.is_active && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  {type.description && (
                    <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Edit form */}
      <div className="w-1/2 border rounded-lg p-6 flex flex-col">
        {selectedType ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">
                {selectedType.is_system ? "View Chargeable Type" : "Edit Chargeable Type"}
              </h3>
              {!selectedType.is_system && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(selectedType)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Enter type name"
                  disabled={selectedType.is_system}
                />
              </div>

              <div>
                <Label htmlFor="edit-code">Code</Label>
                <Input
                  id="edit-code"
                  value={editFormData.code}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
              </div>

              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Enter description"
                  rows={3}
                  disabled={selectedType.is_system}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={editFormData.is_active}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_active: checked })}
                  disabled={selectedType.is_system}
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>

              {selectedType.is_system && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  <p><strong>System Type:</strong> This is a system chargeable type and cannot be modified.</p>
                </div>
              )}
            </div>

            {!selectedType.is_system && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={handleEdit}
                  disabled={saving || !editFormData.name.trim()}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a chargeable type from the list to view or edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
