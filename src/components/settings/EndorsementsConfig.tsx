"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, AlertCircle, Award, Trash2 } from "lucide-react";
import { Endorsement } from "@/types/endorsements";

interface EndorsementFormData {
  name: string;
  description: string;
}

export default function EndorsementsConfig() {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [selectedEndorsement, setSelectedEndorsement] = useState<Endorsement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [editFormData, setEditFormData] = useState<EndorsementFormData>({
    name: "",
    description: "",
  });

  const [addFormData, setAddFormData] = useState<EndorsementFormData>({
    name: "",
    description: "",
  });

  const fetchEndorsements = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/endorsements");
      if (!response.ok) {
        throw new Error("Failed to fetch endorsements");
      }
      const data = await response.json();
      setEndorsements(data.endorsements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndorsements();
  }, []);

  useEffect(() => {
    if (selectedEndorsement) {
      setEditFormData({
        name: selectedEndorsement.name,
        description: selectedEndorsement.description || "",
      });
    }
  }, [selectedEndorsement]);

  const resetAddForm = () => {
    setAddFormData({
      name: "",
      description: "",
    });
  };

  const handleAdd = async () => {
    if (!addFormData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/endorsements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create endorsement");
      }

      await fetchEndorsements();
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
    if (!selectedEndorsement) return;

    if (!editFormData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/endorsements", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedEndorsement.id,
          ...editFormData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update endorsement");
      }

      await fetchEndorsements();
      setError(null);

      const updatedEndorsements = endorsements.map(e =>
        e.id === selectedEndorsement.id ? { ...e, ...editFormData } : e
      );
      const updatedSelected = updatedEndorsements.find(e => e.id === selectedEndorsement.id);
      if (updatedSelected) {
        setSelectedEndorsement(updatedSelected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (endorsement: Endorsement) => {
    if (!confirm(`Are you sure you want to delete "${endorsement.name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/endorsements?id=${endorsement.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete endorsement");
      }

      await fetchEndorsements();
      if (selectedEndorsement?.id === endorsement.id) {
        setSelectedEndorsement(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const filteredEndorsements = endorsements.filter(endorsement =>
    endorsement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endorsement.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading endorsements...</div>
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
              placeholder="Search endorsements..."
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
                <DialogTitle>Add New Endorsement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-name">Name</Label>
                  <Input
                    id="add-name"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    placeholder="e.g., Aerobatics, Tailwheel, High Performance"
                  />
                </div>
                <div>
                  <Label htmlFor="add-description">Description (Optional)</Label>
                  <Textarea
                    id="add-description"
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    placeholder="Enter a description for this endorsement"
                    rows={3}
                  />
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
          {filteredEndorsements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "No endorsements match your search." : "No endorsements configured yet."}
            </div>
          ) : (
            <div className="divide-y">
              {filteredEndorsements.map((endorsement) => (
                <div
                  key={endorsement.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedEndorsement?.id === endorsement.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                  onClick={() => setSelectedEndorsement(endorsement)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{endorsement.name}</h4>
                    </div>
                  </div>
                  {endorsement.description && (
                    <p className="text-sm text-gray-600 mt-1">{endorsement.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-1/2 border rounded-lg p-6">
        {selectedEndorsement ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Edit Endorsement</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(selectedEndorsement)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g., Aerobatics, Tailwheel, High Performance"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Enter a description for this endorsement"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-auto pt-6 border-t">
              <Button
                onClick={handleEdit}
                disabled={saving || !editFormData.name.trim()}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select an endorsement from the list to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}