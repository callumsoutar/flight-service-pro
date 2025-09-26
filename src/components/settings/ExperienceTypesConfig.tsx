"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { ExperienceType } from "@/types/experience_types";

interface ExperienceTypeFormData {
  name: string;
  description: string;
  is_active: boolean;
}

export default function ExperienceTypesConfig() {
  const [experienceTypes, setExperienceTypes] = useState<ExperienceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExperienceType, setEditingExperienceType] = useState<ExperienceType | null>(null);
  const [formData, setFormData] = useState<ExperienceTypeFormData>({
    name: "",
    description: "",
    is_active: true,
  });

  const fetchExperienceTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/experience-types");
      if (!response.ok) {
        throw new Error("Failed to fetch experience types");
      }
      const data = await response.json();
      setExperienceTypes(data.experience_types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperienceTypes();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
  };

  const handleAdd = async () => {
    try {
      const response = await fetch("/api/experience-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create experience type");
      }

      await fetchExperienceTypes();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleEdit = async () => {
    if (!editingExperienceType) return;

    try {
      const response = await fetch("/api/experience-types", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, id: editingExperienceType.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update experience type");
      }

      await fetchExperienceTypes();
      setIsEditDialogOpen(false);
      setEditingExperienceType(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience type? This will hide it from the list but preserve the data.")) {
      return;
    }

    try {
      const response = await fetch(`/api/experience-types?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete experience type");
      }

      await fetchExperienceTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const openEditDialog = (experienceType: ExperienceType) => {
    setEditingExperienceType(experienceType);
    setFormData({
      name: experienceType.name,
      description: experienceType.description || "",
      is_active: experienceType.is_active,
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading experience types...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Experience Types</h3>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Experience Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full rounded-xl p-6">
              <DialogHeader>
                <DialogTitle>Add New Experience Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Night Flying, Cross Country, Instrument"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter a description for this experience type"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={!formData.name.trim()}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {experienceTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No experience types configured yet. Click &quot;Add Experience Type&quot; to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {experienceTypes.map((experienceType) => (
                <TableRow key={experienceType.id}>
                  <TableCell className="font-medium">{experienceType.name}</TableCell>
                  <TableCell>{experienceType.description || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        experienceType.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {experienceType.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(experienceType)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(experienceType.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete experience type"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md w-full rounded-xl p-6">
            <DialogHeader>
              <DialogTitle>Edit Experience Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Night Flying, Cross Country, Instrument"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter a description for this experience type"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingExperienceType(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={!formData.name.trim()}>
                  Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}