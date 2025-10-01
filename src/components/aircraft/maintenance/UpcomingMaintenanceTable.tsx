import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ClipboardList, CalendarCheck, Eye, Info, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { AircraftComponent } from "@/types/aircraft_components";
import { format } from 'date-fns';
import ComponentEditModal from "@/components/aircraft/maintenance/ComponentEditModal";
import LogMaintenanceModal from "@/components/aircraft/maintenance/LogMaintenanceModal";
import { toast } from "sonner";
import ComponentNewModal from "@/components/aircraft/maintenance/ComponentNewModal";

interface UpcomingMaintenanceTableProps {
  aircraft_id: string;
}

interface ComponentWithComputed extends AircraftComponent {
  _computed: {
    extendedHours: number | null;
    extendedDate: Date | null;
    effectiveDueHours: number | null;
    effectiveDueDate: Date | null;
    dueScore: number;
    dueIn: string;
  };
}

// Calculate extended due hours when extension_limit_hours is set
function getExtendedDueHours(comp: AircraftComponent): number | null {
  if (
    comp.extension_limit_hours !== null &&
    comp.extension_limit_hours !== undefined &&
    comp.current_due_hours !== null &&
    comp.current_due_hours !== undefined &&
    comp.interval_hours !== null &&
    comp.interval_hours !== undefined
  ) {
    // Explicitly convert to numbers to avoid string concatenation
    const currentDue = Number(comp.current_due_hours);
    const intervalHours = Number(comp.interval_hours);
    const extensionPercent = Number(comp.extension_limit_hours);
    
    return currentDue + (intervalHours * (extensionPercent / 100));
  }
  return null;
}

// Calculate extended due date when extension_limit_hours is set
function getExtendedDueDate(comp: AircraftComponent): Date | null {
  if (
    comp.extension_limit_hours !== null &&
    comp.extension_limit_hours !== undefined &&
    comp.current_due_date &&
    comp.interval_days !== null &&
    comp.interval_days !== undefined
  ) {
    const baseDate = new Date(comp.current_due_date);
    // Explicitly convert to numbers to avoid type issues
    const intervalDays = Number(comp.interval_days);
    const extensionPercent = Number(comp.extension_limit_hours);
    const extensionDays = intervalDays * (extensionPercent / 100);
    
    return new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);
  }
  return null;
}

function getDueIn(comp: AircraftComponent, currentHours: number | null) {
  if (currentHours === null) return "N/A";
  
  // Check if extension is in effect
  const extendedHours = getExtendedDueHours(comp);
  const extendedDate = getExtendedDueDate(comp);
  
  // Use extended hours if available
  if (extendedHours !== null) {
    const hoursLeft = extendedHours - currentHours;
    if (Math.abs(hoursLeft) < 0.01) return "Due now";
    return `${Number(hoursLeft.toFixed(2))} hours`;
  } else if (comp.current_due_hours !== null && comp.current_due_hours !== undefined) {
    const hoursLeft = Number(comp.current_due_hours) - currentHours;
    if (Math.abs(hoursLeft) < 0.01) return "Due now";
    return `${Number(hoursLeft.toFixed(2))} hours`;
  } else if (extendedDate) {
    const now = new Date();
    const daysLeft = Math.ceil((extendedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days` : "Due now";
  } else if (comp.current_due_date) {
    const now = new Date();
    const due = new Date(comp.current_due_date);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days` : "Due now";
  }
  return "N/A";
}

export default function UpcomingMaintenanceTable({ aircraft_id }: UpcomingMaintenanceTableProps) {
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHours, setCurrentHours] = useState<number | null>(null);
  
  // Modal state
  const [logMaintenanceModalOpen, setLogMaintenanceModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<AircraftComponent | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<ComponentWithComputed | null>(null);

  useEffect(() => {
    if (!aircraft_id) return;
    setLoading(true);
    setError(null);

    // Fetch both components and aircraft data in parallel
    Promise.all([
      fetch(`/api/aircraft_components?aircraft_id=${aircraft_id}`).then(res => res.json()),
      fetch(`/api/aircraft?id=${aircraft_id}`).then(res => res.json())
    ])
      .then(([componentsData, aircraftData]) => {
        // Set raw components initially, memoized computation will happen later
        setComponents(componentsData);
        if (aircraftData.aircraft && aircraftData.aircraft.total_hours) {
          setCurrentHours(Number(aircraftData.aircraft.total_hours));
        }
      })
      .catch(() => {
        setError("Failed to fetch data");
      })
      .finally(() => setLoading(false));
  }, [aircraft_id]);

  const handleLogMaintenance = (componentId: string) => {
    setSelectedComponentId(componentId);
    setLogMaintenanceModalOpen(true);
  };

  const handleScheduleMaintenance = (component: AircraftComponent) => {
    void component; // Explicitly mark as intentionally unused
    // TODO: Implement schedule maintenance functionality
    toast.info("Schedule maintenance functionality coming soon!");
  };

  const handleViewDetails = (component: AircraftComponent) => {
    setSelectedComponent(component);
    setEditModalOpen(true);
  };

  const handleDeleteComponent = (component: ComponentWithComputed) => {
    setComponentToDelete(component);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteComponent = async () => {
    if (!componentToDelete) return;

    try {
      const res = await fetch(`/api/aircraft_components`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: componentToDelete.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to delete component");
        return;
      }

      // Remove component from local state
      setComponents(prev => prev.filter(c => c.id !== componentToDelete.id));
      toast.success("Component deleted successfully");
      setDeleteConfirmOpen(false);
      setComponentToDelete(null);
    } catch {
      toast.error("Failed to delete component");
    }
  };

  const handleEditSave = async (updated: Partial<AircraftComponent>) => {
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
        await res.json(); // consume body, but do not assign
        return;
      }
      const updatedComponent = await res.json();
      setComponents((prev) => prev.map((c) => c.id === selectedComponent.id ? updatedComponent : c));
      setEditModalOpen(false);
    } catch {
      // Optionally set error state here
    }
  };

  const handleNewComponentSave = async (newComponent: Partial<AircraftComponent>) => {
    const newComp = {
      ...newComponent,
      aircraft_id: aircraft_id,
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
        const errorMessage = errorData.error || "Failed to create component";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
      const created = await res.json();
      setComponents(prev => [...prev, created]);
      toast.success("Component created");
      setNewModalOpen(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message || "Failed to create component");
        throw e;
      } else {
        const errorMessage = "Failed to create component";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  };

  // Pre-calculate extension data and sort - memoized for performance
  const sortedComponents = useMemo(() => {
    if (!components.length) return [];

    // Pre-calculate all extension data to avoid redundant calculations
    const componentsWithExtensions = components.map(comp => {
      const extendedHours = getExtendedDueHours(comp);
      const extendedDate = getExtendedDueDate(comp);
      const effectiveDueHours = extendedHours ?? comp.current_due_hours;
      const effectiveDueDate = extendedDate ?? (comp.current_due_date ? new Date(comp.current_due_date) : null);

      let dueScore = Infinity;
      if (effectiveDueHours !== null && effectiveDueHours !== undefined && currentHours !== null) {
        dueScore = Number(effectiveDueHours) - currentHours;
      } else if (effectiveDueDate) {
        dueScore = effectiveDueDate.getTime() - Date.now();
      }

      return {
        ...comp,
        _computed: {
          extendedHours,
          extendedDate,
          effectiveDueHours,
          effectiveDueDate,
          dueScore,
          dueIn: getDueIn(comp, currentHours)
        }
      };
    });

    return componentsWithExtensions.sort((a, b) => a._computed.dueScore - b._computed.dueScore) as ComponentWithComputed[];
  }, [components, currentHours]);

  return (
    <div className="flex flex-col gap-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Upcoming Maintenance</h2>
        <Button className="bg-indigo-600 text-white font-semibold" onClick={() => setNewModalOpen(true)}>+ Add Component</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-muted bg-white">
        <table className="min-w-full text-sm">
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
              <th className="px-3 py-2 text-center font-semibold text-sm w-40">Due In (hrs)</th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-32">Status</th>
              <th className="px-3 py-2 text-center font-semibold text-sm w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-6">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="text-center text-red-500 py-6">{error}</td></tr>
            ) : sortedComponents.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-6">No components found.</td></tr>
            ) : (
              sortedComponents.map((comp) => {
                // Use pre-computed values for better performance
                const { extendedHours, effectiveDueHours, effectiveDueDate } = comp._computed;
                
                let status = "Upcoming";
                if (
                  typeof effectiveDueHours === "number" && currentHours !== null && effectiveDueHours - currentHours <= 0
                ) {
                  // If we have an extension and we're past the original due but within extension
                  if (
                    extendedHours !== null && 
                    comp.current_due_hours !== null &&
                    comp.current_due_hours !== undefined &&
                    currentHours > Number(comp.current_due_hours) &&
                    currentHours <= extendedHours
                  ) {
                    status = "Within Extension";
                  } else {
                    status = "Overdue";
                  }
                } else if (
                  typeof effectiveDueHours === "number" && currentHours !== null && effectiveDueHours - currentHours <= 10 ||
                  (effectiveDueDate && (effectiveDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30)
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
                // Use pre-computed dueIn value
                const dueIn = comp._computed.dueIn;
                const rowClass =
                  (status === "Due Soon"
                    ? "bg-yellow-50 border-l-4 border-yellow-400"
                    : status === "Within Extension"
                    ? "bg-orange-50 border-l-4 border-orange-400"
                    : status === "Overdue"
                    ? "bg-red-50 border-l-4 border-red-400"
                    : "hover:bg-muted/40 transition-colors");
                return (
                  <tr
                    key={comp.id}
                    className={rowClass + " min-h-[44px]"}
                  >
                    <td className="px-3 py-2 text-left font-semibold align-middle w-56 whitespace-nowrap text-sm">{comp.name}</td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-32 text-sm">
                      {comp.current_due_hours !== null && comp.current_due_hours !== undefined ? `${comp.current_due_hours}h` : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-40 text-sm">
                      {extendedHours !== null ? (
                        `${Number(extendedHours.toFixed(2))}h`
                      ) : <span className="text-muted-foreground">N/A</span>}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-40 text-sm">
                      {comp.current_due_date ? format(new Date(comp.current_due_date), 'yyyy-MM-dd') : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-40 text-sm">{daysUntilService}</td>
                    <td className="px-3 py-2 text-center font-semibold align-middle w-40 text-sm">
                      {extendedHours !== null ? (
                        <div className="flex flex-col items-center">
                          <span>{dueIn}</span>
                          <span className="text-[10px] text-muted-foreground">(extension applied)</span>
                        </div>
                      ) : (
                        dueIn
                      )}
                    </td>
                    <td className="px-3 py-2 text-center align-middle w-32 text-sm">
                      <span className="flex items-center justify-center gap-2">
                        {status === "Due Soon" && (
                          <Badge variant="secondary" className="capitalize px-2 py-0.5 text-[10px] font-medium">Due Soon</Badge>
                        )}
                        {status === "Overdue" && (
                          <Badge variant="destructive" className="capitalize px-2 py-0.5 text-[10px] font-medium">Overdue</Badge>
                        )}
                        {status === "Within Extension" && (
                          <Badge variant="secondary" className="capitalize px-2 py-0.5 text-[10px] font-medium">Extension</Badge>
                        )}
                        {status === "Upcoming" && (
                          <Badge className="capitalize px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-800 border-green-300">OK</Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center align-middle w-20 text-sm">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            handleLogMaintenance(comp.id);
                          }}>
                            <ClipboardList className="w-4 h-4 mr-2" /> Log Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleScheduleMaintenance(comp)}>
                            <CalendarCheck className="w-4 h-4 mr-2" /> Schedule Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(comp)}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteComponent(comp)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Item
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
      
      {/* Modals */}
      <ComponentEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        component={selectedComponent}
        onSave={handleEditSave}
      />
      <LogMaintenanceModal
        open={logMaintenanceModalOpen}
        onOpenChange={setLogMaintenanceModalOpen}
        aircraft_id={aircraft_id}
        component_id={selectedComponentId}
      />
      <ComponentNewModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSave={handleNewComponentSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the component &quot;{componentToDelete?.name}&quot;?
              This action cannot be undone and will remove the component from the aircraft&apos;s maintenance schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteComponent}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Component
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 