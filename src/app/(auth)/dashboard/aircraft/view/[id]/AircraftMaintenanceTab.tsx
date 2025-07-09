"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Progress from "@/components/ui/progress";
import { MoreHorizontal, ClipboardList, CalendarCheck, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AircraftComponent } from "@/types/aircraft_components";

function getProgress(since: number | null | undefined, next: number | null | undefined) {
  if (!since || !next) return 0;
  return Math.min(100, Math.round((since / next) * 100));
}

function isDueSoon(since: number | null | undefined, next: number | null | undefined) {
  if (!since || !next) return false;
  return since / next >= 0.9; // 90% or more used
}

export default function AircraftMaintenanceTab() {
  const { id: aircraft_id } = useParams<{ id: string }>();
  const router = useRouter();
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!aircraft_id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/aircraft_components?aircraft_id=${aircraft_id}`)
      .then((res) => res.json())
      .then((data: AircraftComponent[]) => {
        setComponents(data.filter((c) => c.component_type !== "inspection"));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [aircraft_id]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Equipment & Components</h2>
        <Button className="bg-indigo-600 text-white font-semibold">+ Add Component</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-muted bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Name</th>
              <th className="px-4 py-2 text-left font-semibold">Total Time</th>
              <th className="px-4 py-2 text-left font-semibold">Since Overhaul</th>
              <th className="px-4 py-2 text-left font-semibold">Next Overhaul</th>
              <th className="px-4 py-2 text-left font-semibold">Description</th>
              <th className="px-4 py-2 text-left font-semibold">Status</th>
              <th className="px-4 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="text-center text-red-500 py-8">{error}</td></tr>
            ) : components.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8">No equipment/components found.</td></tr>
            ) : (
              components.map((comp) => {
                return (
                  <tr
                    key={comp.id}
                    className={
                      isDueSoon(comp.last_completed_hours, comp.current_due_hours)
                        ? "bg-yellow-50 border-l-4 border-yellow-400"
                        : "hover:bg-muted/50 transition-colors"
                    }
                  >
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{comp.name}</td>
                    <td className="px-4 py-2 font-semibold">{comp.last_completed_hours !== null && comp.last_completed_hours !== undefined ? `${comp.last_completed_hours}h` : "N/A"}</td>
                    <td className="px-4 py-2 font-semibold">{comp.last_completed_hours !== null && comp.last_completed_hours !== undefined ? `${comp.last_completed_hours}h` : "N/A"}</td>
                    <td className="px-4 py-2 font-semibold">{comp.current_due_hours !== null && comp.current_due_hours !== undefined ? `${comp.current_due_hours}h` : "N/A"}</td>
                    <td className="px-4 py-2">{comp.description || "-"}</td>
                    <td className="px-4 py-2">
                      <Badge variant="secondary" className="uppercase px-2 py-1 text-xs font-semibold tracking-wide">{comp.status}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0"><MoreHorizontal className="w-5 h-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <ClipboardList className="w-4 h-4 mr-2" /> Log Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CalendarCheck className="w-4 h-4 mr-2" /> Schedule Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/aircraft/view/${aircraft_id}/component/${comp.id}`)}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
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
    </div>
  );
} 