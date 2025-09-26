"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Archive, AlertCircle } from "lucide-react";
import { FlightType, InstructionType } from "@/types/flight_types";

interface FlightTypeFormData {
  name: string;
  description: string;
  instruction_type: InstructionType | null;
  is_active: boolean;
}

export default function FlightTypesConfig() {
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFlightType, setEditingFlightType] = useState<FlightType | null>(null);
  const [formData, setFormData] = useState<FlightTypeFormData>({
    name: "",
    description: "",
    instruction_type: null,
    is_active: true,
  });

  const fetchFlightTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/flight_types");
      if (!response.ok) {
        throw new Error("Failed to fetch flight types");
      }
      const data = await response.json();
      setFlightTypes(data.flight_types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlightTypes();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      instruction_type: null,
      is_active: true,
    });
  };

  const handleAdd = async () => {
    try {
      const response = await fetch("/api/flight_types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create flight type");
      }

      await fetchFlightTypes();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleEdit = async () => {
    if (!editingFlightType) return;

    try {
      const response = await fetch("/api/flight_types", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, id: editingFlightType.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update flight type");
      }

      await fetchFlightTypes();
      setIsEditDialogOpen(false);
      setEditingFlightType(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to void this flight type? This will make it unavailable for new bookings.")) {
      return;
    }

    try {
      const response = await fetch(`/api/flight_types?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to void flight type");
      }

      await fetchFlightTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const openEditDialog = (flightType: FlightType) => {
    setEditingFlightType(flightType);
    setFormData({
      name: flightType.name,
      description: flightType.description || "",
      instruction_type: flightType.instruction_type,
      is_active: flightType.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const instructionTypeOptions = [
    { value: "dual", label: "Dual" },
    { value: "solo", label: "Solo" },
    { value: "trial", label: "Trial" },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading flight types...</div>
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
          <h3 className="text-lg font-medium">Flight Types</h3>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Flight Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full rounded-xl p-6">
              <DialogHeader>
                <DialogTitle>Add New Flight Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter flight type name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="instruction_type">Instruction Type</Label>
                  <Select
                    value={formData.instruction_type || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        instruction_type: value === "none" ? null : (value as InstructionType),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select instruction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {instructionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        {flightTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No flight types configured yet. Click &quot;Add Flight Type&quot; to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Instruction Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flightTypes.map((flightType) => (
                <TableRow key={flightType.id}>
                  <TableCell className="font-medium">{flightType.name}</TableCell>
                  <TableCell>
                    {flightType.instruction_type ? (
                      <span className="capitalize">{flightType.instruction_type}</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        flightType.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {flightType.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(flightType)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(flightType.id)}
                        className="text-orange-600 hover:text-orange-700"
                        title="Void flight type"
                      >
                        <Archive className="w-4 h-4" />
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
              <DialogTitle>Edit Flight Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter flight type name"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-instruction_type">Instruction Type</Label>
                <Select
                  value={formData.instruction_type || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      instruction_type: value === "none" ? null : (value as InstructionType),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select instruction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {instructionTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    setEditingFlightType(null);
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