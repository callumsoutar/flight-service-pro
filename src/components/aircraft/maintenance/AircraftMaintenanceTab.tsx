"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ClipboardList, CalendarCheck, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { AircraftComponent } from "@/types/aircraft_components";
import ComponentEditModal from "@/components/aircraft/maintenance/ComponentEditModal";
import ComponentNewModal from "@/components/aircraft/maintenance/ComponentNewModal";
import { useOrgContext } from "@/components/OrgContextProvider";
import { toast } from "sonner";
import { format } from 'date-fns';

export default function AircraftMaintenanceTab() {
  const { id: aircraft_id } = useParams<{ id: string }>();
  // router is not used
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<AircraftComponent | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const { currentOrgId } = useOrgContext();

  useEffect(() => {
    if (!aircraft_id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/aircraft_components?aircraft_id=${aircraft_id}`)
      .then((res) => res.json())
      .then((data: AircraftComponent[]) => {
        setComponents(data.filter((c) => c.component_type !== "inspection"));
      })
      .catch((e: unknown) => {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("Failed to fetch components");
        }
      })
      .finally(() => setLoading(false));
  }, [aircraft_id]);

  const handleEditSave = async (updated: Partial<AircraftComponent>) => {
    console.log('handleEditSave called', { selectedComponent, updated });
    if (!selectedComponent) return;
    // Convert empty string dates to null
    const cleanUpdate = { ...updated };
    if (cleanUpdate.current_due_date === "") cleanUpdate.current_due_date = null;
    if (cleanUpdate.last_completed_date === "") cleanUpdate.last_completed_date = null;
    try {
      const res = await fetch(`/api/aircraft_components`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedComponent.id, ...cleanUpdate }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || "Failed to update component");
        return;
      }
      const updatedComponent = await res.json();
      setComponents((prev) => prev.map((c) => c.id === selectedComponent.id ? updatedComponent : c));
    setEditModalOpen(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message || "An error occurred");
      } else {
        setError("An error occurred");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Equipment & Components</h2>
        <Button className="bg-indigo-600 text-white font-semibold" onClick={() => setNewModalOpen(true)}>+ Add Component</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-muted bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-sm w-56">Component Name</th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-32">Due At (hrs)</th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-40 flex items-center gap-1 justify-center">Extension Limit (hrs)
                <Popover>
                  <PopoverTrigger asChild>
                    <span className="ml-1 cursor-pointer align-middle"><Info className="w-4 h-4 text-muted-foreground" /></span>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-xs text-sm">
                    <span>This is the maximum hours allowed with a regulatory extension (e.g., 10% over the normal interval).<br/>If the component is past this, it is overdue after extension.</span>
                  </PopoverContent>
                </Popover>
              </th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-40">Due At (date)</th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-40">Days Until Service</th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-40">Due In</th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-32">Status</th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-6">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="text-center text-red-500 py-6">{error}</td></tr>
            ) : components.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-6">No equipment/components found.</td></tr>
            ) : (
              components.map((comp) => {
                // Status logic (reuse from service tab)
                let status = "Upcoming";
                const currentHours = comp.last_completed_hours ?? null;
                if (
                  typeof comp.current_due_hours === "number" && currentHours !== null && comp.current_due_hours - currentHours <= 0
                ) {
                  if (
                    typeof comp.extension_limit_hours === "number" && currentHours !== null && currentHours <= comp.extension_limit_hours
                  ) {
                    status = "Within Extension";
                  } else if (
                    typeof comp.extension_limit_hours === "number" && currentHours !== null && currentHours > comp.extension_limit_hours
                  ) {
                    status = "Overdue (after extension)";
                  } else {
                    status = "Overdue";
                  }
                } else if (
                  typeof comp.current_due_hours === "number" && currentHours !== null && comp.current_due_hours - currentHours <= 10 ||
                  (comp.current_due_date && (new Date(comp.current_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30)
                ) {
                  status = "Due Soon";
                }
                // Calculate days until service
                let daysUntilService = "N/A";
                if (comp.current_due_date) {
                  const now = new Date();
                  const due = new Date(comp.current_due_date);
                  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  daysUntilService = diff >= 0 ? diff.toString() : "0";
                }
                // Due In logic (reuse from service tab)
                let dueIn = "N/A";
                if (currentHours === null) {
                  dueIn = "N/A";
                } else if (
                  comp.extension_limit_hours !== null &&
                  comp.extension_limit_hours !== undefined &&
                  comp.extension_limit_hours > (comp.current_due_hours ?? 0)
                ) {
                  const hoursLeft = comp.extension_limit_hours - currentHours;
                  dueIn = Math.abs(hoursLeft) < 0.01 ? "Due now" : `${Number(hoursLeft.toFixed(2))} hours`;
                } else if (comp.current_due_hours !== null && comp.current_due_hours !== undefined) {
                  const hoursLeft = comp.current_due_hours - currentHours;
                  dueIn = Math.abs(hoursLeft) < 0.01 ? "Due now" : `${Number(hoursLeft.toFixed(2))} hours`;
                } else if (comp.current_due_date) {
                  const now = new Date();
                  const due = new Date(comp.current_due_date);
                  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  dueIn = daysLeft > 0 ? `${daysLeft} days` : "Due now";
                }
                return (
                  <tr
                    key={comp.id}
                    className={
                      (status === "Due Soon"
                        ? "bg-yellow-50 border-l-4 border-yellow-400"
                        : status === "Within Extension"
                        ? "bg-orange-50 border-l-4 border-orange-400"
                        : status === "Overdue (after extension)"
                        ? "bg-red-100 border-l-4 border-red-500"
                        : status === "Overdue"
                        ? "bg-red-50 border-l-4 border-red-400"
                        : "hover:bg-muted/40 transition-colors") +
                      " text-xs min-h-[44px]"
                    }
                  >
                    <td className="px-3 py-2 text-left font-semibold align-middle w-56 whitespace-nowrap">{comp.name}</td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-32">{comp.current_due_hours !== null && comp.current_due_hours !== undefined ? `${comp.current_due_hours}h` : "N/A"}</td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-40">{comp.extension_limit_hours !== null && comp.extension_limit_hours !== undefined ? `${comp.extension_limit_hours}h` : <span className="text-muted-foreground">N/A</span>}</td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-40">{comp.current_due_date ? format(new Date(comp.current_due_date), 'yyyy-MM-dd') : "N/A"}</td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-40">{daysUntilService}</td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-40">{dueIn}</td>
                    <td className="px-3 py-2 text-center align-middle w-32">
                      <span className="flex items-center justify-center gap-2">
                        {status === "Due Soon" && (
                          <Badge variant="secondary" className="capitalize px-2 py-0.5 text-[10px] font-medium">Due Soon</Badge>
                        )}
                        {status === "Overdue" && (
                          <Badge variant="destructive" className="capitalize px-2 py-0.5 text-[10px] font-medium">Overdue</Badge>
                        )}
                        {status === "Overdue (after extension)" && (
                          <Badge variant="destructive" className="capitalize px-2 py-0.5 text-[10px] font-medium">Overdue (after extension)</Badge>
                        )}
                        {status === "Within Extension" && (
                          <Badge variant="secondary" className="capitalize px-2 py-0.5 text-[10px] font-medium">Extension</Badge>
                        )}
                        {status === "Upcoming" && (
                          <Badge className="capitalize px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-800 border-green-300">OK</Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center align-middle w-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <ClipboardList className="w-4 h-4 mr-2" /> Log Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CalendarCheck className="w-4 h-4 mr-2" /> Schedule Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedComponent(comp); setEditModalOpen(true); }}>
                            <Info className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <ComponentEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        component={selectedComponent}
        onSave={handleEditSave}
      />
      <ComponentNewModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSave={async (newComponent) => {
          const newComp = {
            ...newComponent,
            aircraft_id: aircraft_id,
            organization_id: currentOrgId || "",
            current_due_date: newComponent.current_due_date === "" ? null : newComponent.current_due_date,
            last_completed_date: newComponent.last_completed_date === "" ? null : newComponent.last_completed_date,
          };
          try {
            const res = await fetch("/api/aircraft_components", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newComp),
            });
            if (!res.ok) {
              const errorData = await res.json();
              toast.error(errorData.error || "Failed to create component");
              return;
            }
            const created = await res.json();
            setComponents(prev => [...prev, created]);
            toast.success("Component created");
          } catch (e: unknown) {
            if (e instanceof Error) {
              toast.error(e.message || "Failed to create component");
            } else {
              toast.error("Failed to create component");
            }
          }
        }}
      />
    </div>
  );
} 