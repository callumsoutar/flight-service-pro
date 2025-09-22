"use client";

import { useState, useEffect } from "react";
import { Package, ClipboardList, History, Settings, Info, ArrowLeft, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import type { Equipment, EquipmentStatus, EquipmentType } from "@/types/equipment";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { EquipmentIssuance } from "@/types/equipment";
import { EquipmentUpdatesTable } from "@/components/equipment/EquipmentUpdatesTable";
import type { EquipmentUpdate } from "@/types/equipment";
import { EquipmentIssuanceTable } from "@/components/equipment/EquipmentIssuanceTable";

const tabItems = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "issuance", label: "Issuance History", icon: ClipboardList },
  { id: "updates", label: "Updates", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];

const EQUIPMENT_TYPES: EquipmentType[] = [
  "AIP",
  "Stationery", 
  "Headset",
  "Technology",
  "Maps",
  "Radio",
  "Transponder",
  "ELT",
  "Lifejacket",
  "FirstAidKit",
  "FireExtinguisher",
  "Other",
];

const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "active",
  "lost",
  "maintenance",
  "retired",
];

export default function EquipmentViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment & {
    location?: string;
    last_issued?: string;
    next_due_update?: string;
    year_purchased?: number | null;
    notes?: string;
  }>({
    id: id || "",
    name: "",
    type: "Other",
    status: "active",
    created_at: null,
    updated_at: null,
    location: "",
    last_issued: "",
    next_due_update: "",
    year_purchased: null,
    notes: "",
  });

  // Fetch equipment by id from API
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/equipment/${id}`);
        const json = await res.json();
        if (json.equipment) {
          setEquipment({ ...json.equipment });
        }
      } catch {
        // Optionally handle error
      }
    })();
  }, [id]);

  // Issuance history state
  const [issuance, setIssuance] = useState<EquipmentIssuance[]>([]);
  const [issuanceLoading, setIssuanceLoading] = useState(false);
  const [issuanceError, setIssuanceError] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // Fetch issuance history
  useEffect(() => {
    if (!id) return;
    setIssuanceLoading(true);
    setIssuanceError(null);
    fetch(`/api/equipment_issuance?equipment_id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setIssuance(data.issuances || []);
        // After fetching issuance, fetch user info for all unique user IDs
        const userIds = Array.from(new Set((data.issuances || []).flatMap((row: EquipmentIssuance) => [row.user_id, row.issued_by])));
        if (userIds.length > 0) {
          fetch(`/api/users?ids=${userIds.join(",")}`)
            .then((res) => res.json())
            .then((userData) => {
              // userData.users should be an array of user objects with id, first_name, last_name, email
              const map: Record<string, string> = {};
              (userData.users || []).forEach((u: { id: string; first_name?: string; last_name?: string; email?: string }) => {
                map[u.id] = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : (u.email || u.id);
              });
              setUserMap(map);
            });
        }
      })
      .catch(() => {
        setIssuanceError("Failed to load issuance history");
      })
      .finally(() => setIssuanceLoading(false));
  }, [id]);

  // Add after issuance state
  const [updates, setUpdates] = useState<EquipmentUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updatesError, setUpdatesError] = useState<string | null>(null);
  const [updatesUserMap, setUpdatesUserMap] = useState<Record<string, string>>({});

  // Fetch equipment updates
  useEffect(() => {
    if (!id) return;
    setUpdatesLoading(true);
    setUpdatesError(null);
    fetch(`/api/equipment_updates?equipment_id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setUpdates(data.updates || []);
        // After fetching updates, fetch user info for all unique updated_by IDs
        const userIds = Array.from(new Set((data.updates || []).map((row: EquipmentUpdate) => row.updated_by)));
        if (userIds.length > 0) {
          fetch(`/api/users?ids=${userIds.join(",")}`)
            .then((res) => res.json())
            .then((userData) => {
              const map: Record<string, string> = {};
              (userData.users || []).forEach((u: { id: string; first_name?: string; last_name?: string; email?: string }) => {
                map[u.id] = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : (u.email || u.id);
              });
              setUpdatesUserMap(map);
            });
        }
      })
      .catch(() => {
        setUpdatesError("Failed to load update history");
      })
      .finally(() => setUpdatesLoading(false));
  }, [id]);

  // Removed unused detailsDraft and notesDraft state and effect

  // Track initial values for dirty/undo
  const [initialEquipment, setInitialEquipment] = useState(equipment);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Watch for changes to set dirty state
  useEffect(() => {
    setIsDirty(JSON.stringify(equipment) !== JSON.stringify(initialEquipment));
  }, [equipment, initialEquipment]);

  // Save handler (now with real PATCH request)
  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      // Remove id from the body before sending PATCH
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...updateFields } = equipment;
      const res = await fetch(`/api/equipment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateFields),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update equipment");
      } else if (!json.equipment) {
        toast.warning("No equipment was updated. It may already be up to date or not found.");
      } else {
        setEquipment(json.equipment);
        setInitialEquipment(json.equipment);
        setIsDirty(false);
        toast.success("Equipment updated successfully");
      }
    } catch {
      toast.error("Network error while saving equipment");
    } finally {
      setIsSaving(false);
    }
  }

  // Undo handler
  function handleUndo() {
    setEquipment(initialEquipment);
    setIsDirty(false);
  }

  // Delete handler
  async function handleDelete() {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Failed to delete equipment");
        return;
      }
      
      toast.success("Equipment deleted successfully");
      setShowDeleteDialog(false);
      router.push("/dashboard/equipment");
    } catch {
      toast.error("Network error while deleting equipment");
    } finally {
      setIsDeleting(false);
    }
  }

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedTab, setSelectedTab] = useState("overview");
  const mainTabs = tabItems.slice(0, 3); // Only overview, issuance, updates

  return (
    <main className="w-full min-h-screen flex flex-col p-6 gap-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
        {/* Back link */}
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-2">
          <a href="/dashboard/equipment" className="text-indigo-600 hover:underline text-base flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Equipment
          </a>
        </div>
        {/* Equipment header and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <Package className="w-10 h-10 text-indigo-700" />
            <div>
              <div className="text-2xl font-bold">{equipment.name}</div>
              <div className="text-muted-foreground text-sm">{equipment.type} &bull; Serial: {equipment.serial_number}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  Options
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Equipment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Tabs Layout */}
        <div className="w-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          <Tabs.Root value={selectedTab} onValueChange={setSelectedTab} className="w-full flex flex-col">
            <div className="w-full border-b border-gray-200 bg-white">
              <Tabs.List className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]" aria-label="Equipment tabs">
                {mainTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Tabs.Trigger
                      key={tab.id}
                      value={tab.id}
                      className={`inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                        data-[state=active]:border-indigo-700 data-[state=active]:text-indigo-800
                        data-[state=inactive]:text-muted-foreground hover:text-indigo-600 whitespace-nowrap`}
                      style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </Tabs.Trigger>
                  );
                })}
              </Tabs.List>
            </div>
            <div className="w-full p-6">
              <Tabs.Content value="overview" className="h-full w-full">
                <form className="flex flex-col gap-6 p-0 md:p-4" onSubmit={handleSave}>
                  <div className="flex flex-row items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      Equipment Details
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button type="submit" disabled={!isDirty || isSaving} size="sm" className="min-w-[100px] font-semibold">
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={!isDirty || isSaving} onClick={handleUndo}>
                        Undo
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <Input
                        name="name"
                        value={equipment.name}
                        onChange={e => setEquipment(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Equipment Name"
                        className="bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Label</label>
                      <Input
                        name="label"
                        value={equipment.label || ""}
                        onChange={e => setEquipment(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="Label"
                        className="bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Serial Number</label>
                      <Input
                        name="serial_number"
                        value={equipment.serial_number || ""}
                        onChange={e => setEquipment(prev => ({ ...prev, serial_number: e.target.value }))}
                        placeholder="Serial Number"
                        className="bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Location</label>
                      <Input
                        name="location"
                        value={equipment.location || ""}
                        onChange={e => setEquipment(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Location"
                        className="bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <Select
                        value={equipment.status ?? ""}
                        onValueChange={val => setEquipment(prev => ({ ...prev, status: val as EquipmentStatus }))}
                      >
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Type</label>
                      <Select
                        value={equipment.type ?? ""}
                        onValueChange={val => setEquipment(prev => ({ ...prev, type: val as EquipmentType }))}
                      >
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <Textarea
                      name="notes"
                      value={equipment.notes || ""}
                      onChange={e => setEquipment(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notes"
                      className="bg-white min-h-[60px]"
                    />
                  </div>
                </form>
              </Tabs.Content>
              <Tabs.Content value="issuance" className="h-full w-full">
                <EquipmentIssuanceTable
                  issuances={issuance}
                  userMap={userMap}
                  loading={issuanceLoading}
                  error={issuanceError}
                  equipment={equipment}
                  refresh={() => {
                    if (!id) return;
                    setIssuanceLoading(true);
                    setIssuanceError(null);
                    fetch(`/api/equipment_issuance?equipment_id=${id}`)
                      .then((res) => res.json())
                      .then((data) => {
                        setIssuance(data.issuances || []);
                        // After fetching issuance, fetch user info for all unique user IDs
                        const userIds = Array.from(new Set((data.issuances || []).flatMap((row: EquipmentIssuance) => [row.user_id, row.issued_by])));
                        if (userIds.length > 0) {
                          fetch(`/api/users?ids=${userIds.join(",")}`)
                            .then((res) => res.json())
                            .then((userData) => {
                              const map: Record<string, string> = {};
                              (userData.users || []).forEach((u: { id: string; first_name?: string; last_name?: string; email?: string }) => {
                                map[u.id] = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : (u.email || u.id);
                              });
                              setUserMap(map);
                            });
                        }
                      })
                      .catch(() => {
                        setIssuanceError("Failed to load issuance history");
                      })
                      .finally(() => setIssuanceLoading(false));
                  }}
                />
              </Tabs.Content>
              <Tabs.Content value="updates" className="h-full w-full">
                <EquipmentUpdatesTable
                  updates={updates}
                  userMap={updatesUserMap}
                  loading={updatesLoading}
                  error={updatesError}
                  equipment={equipment}
                  refresh={() => {
                    if (!id) return;
                    setUpdatesLoading(true);
                    setUpdatesError(null);
                    fetch(`/api/equipment_updates?equipment_id=${id}`)
                      .then((res) => res.json())
                      .then((data) => {
                        setUpdates(data.updates || []);
                        // After fetching updates, fetch user info for all unique updated_by IDs
                        const userIds = Array.from(new Set((data.updates || []).map((row: EquipmentUpdate) => row.updated_by)));
                        if (userIds.length > 0) {
                          fetch(`/api/users?ids=${userIds.join(",")}`)
                            .then((res) => res.json())
                            .then((userData) => {
                              const map: Record<string, string> = {};
                              (userData.users || []).forEach((u: { id: string; first_name?: string; last_name?: string; email?: string }) => {
                                map[u.id] = u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : (u.email || u.id);
                              });
                              setUpdatesUserMap(map);
                            });
                        }
                      })
                      .catch(() => {
                        setUpdatesError("Failed to load update history");
                      })
                      .finally(() => setUpdatesLoading(false));
                  }}
                />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Equipment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{equipment.name}</strong>? This action cannot be undone and will permanently remove the equipment from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Equipment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
} 