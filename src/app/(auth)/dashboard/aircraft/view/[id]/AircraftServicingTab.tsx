"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ClipboardList, CalendarCheck, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AircraftComponent } from "@/types/aircraft_components";

function isDueSoon(dueDate: string | null | undefined) {
  if (!dueDate) return false;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 30;
}

function getDueIn(comp: AircraftComponent, currentHours: number | null) {
  if (comp.current_due_hours !== null && comp.current_due_hours !== undefined && currentHours !== null) {
    const hoursLeft = comp.current_due_hours - currentHours;
    return hoursLeft > 0 ? `${hoursLeft} hours` : "Due now";
  } else if (comp.current_due_date) {
    const now = new Date();
    const due = new Date(comp.current_due_date);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days` : "Due now";
  }
  return "N/A";
}

export default function AircraftServicingTab() {
  const { id: aircraft_id } = useParams<{ id: string }>();
  const router = useRouter();
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHours, setCurrentHours] = useState<number | null>(null);

  useEffect(() => {
    if (!aircraft_id) return;
    setLoading(true);
    setError(null);
    // Fetch components
    fetch(`/api/aircraft_components?aircraft_id=${aircraft_id}`)
      .then((res) => res.json())
      .then((data: AircraftComponent[]) => {
        setComponents(data.filter((c) => c.component_type === "inspection"));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // Fetch aircraft for current hours (for due in calculation)
    fetch(`/api/aircraft?id=${aircraft_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.aircraft && data.aircraft.total_hours) {
          setCurrentHours(Number(data.aircraft.total_hours));
        }
      })
      .catch(() => {});
  }, [aircraft_id]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Scheduled Services</h2>
        <Button className="bg-indigo-600 text-white font-semibold">+ Add Service</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-muted bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Service Name</th>
              <th className="px-4 py-2 text-left font-semibold">Due Date</th>
              <th className="px-4 py-2 text-left font-semibold">Due Hours</th>
              <th className="px-4 py-2 text-left font-semibold">Due In</th>
              <th className="px-4 py-2 text-left font-semibold">Last Completed</th>
              <th className="px-4 py-2 text-left font-semibold">Next Due</th>
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
              <tr><td colSpan={8} className="text-center py-8">No scheduled inspections found.</td></tr>
            ) : (
              components.map((comp) => {
                const dueSoon = isDueSoon(comp.current_due_date);
                const dueIn = getDueIn(comp, currentHours);
                // Status: Due Soon, Upcoming, Overdue, etc. (simple logic for now)
                let status = "Upcoming";
                if (dueSoon) status = "Due Soon";
                if (
                  (typeof comp.current_due_hours === "number" && currentHours !== null && comp.current_due_hours - currentHours <= 0) ||
                  (comp.current_due_date && new Date(comp.current_due_date) <= new Date())
                ) status = "Overdue";
                return (
                  <tr
                    key={comp.id}
                    className={
                      dueSoon
                        ? "bg-yellow-50 border-l-4 border-yellow-400"
                        : "hover:bg-muted/50 transition-colors"
                    }
                  >
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{comp.name}</td>
                    <td className="px-4 py-2 font-semibold">{comp.current_due_date ? comp.current_due_date.split("T")[0] : "N/A"}</td>
                    <td className="px-4 py-2 font-semibold">{comp.current_due_hours !== null ? `${comp.current_due_hours}h` : "N/A"}</td>
                    <td className="px-4 py-2 font-semibold">{dueIn}</td>
                    <td className="px-4 py-2 text-muted-foreground">{comp.last_completed_date ? comp.last_completed_date.split("T")[0] : "N/A"}</td>
                    <td className="px-4 py-2">{comp.current_due_date ? comp.current_due_date.split("T")[0] : "N/A"}</td>
                    <td className="px-4 py-2">
                      <Badge variant={status === "Due Soon" ? "secondary" : status === "Overdue" ? "destructive" : "outline"} className="capitalize px-2 py-0.5 text-xs font-medium">{status}</Badge>
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