"use client";
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

const components = [
  {
    id: "1",
    name: "Engine - Lycoming IO-360",
    serial: "L-36598-27A",
    total_time: 1245,
    since_overhaul: 890,
    next_overhaul: 2000,
    condition: "Good",
    status: "Serviceable",
  },
  {
    id: "2",
    name: "Propeller - McCauley 2-Blade",
    serial: "M2A32C201",
    total_time: 1245,
    since_overhaul: 456,
    next_overhaul: 1500,
    condition: "Fair",
    status: "Serviceable",
  },
  {
    id: "3",
    name: "Garmin G1000 PFD",
    serial: "G1000-PFD-789",
    total_time: 1245,
    since_overhaul: null,
    next_overhaul: null,
    condition: "Excellent",
    status: "Serviceable",
  },
];

function getProgress(since: number | null, next: number | null) {
  if (!since || !next) return 0;
  return Math.min(100, Math.round((since / next) * 100));
}

function isDueSoon(since: number | null, next: number | null) {
  if (!since || !next) return false;
  return since / next >= 0.9; // 90% or more used
}

export default function AircraftMaintenanceTab() {
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
              <th className="px-4 py-2 text-left font-semibold">Progress</th>
              <th className="px-4 py-2 text-left font-semibold">Condition</th>
              <th className="px-4 py-2 text-left font-semibold">Status</th>
              <th className="px-4 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {components.map((comp) => {
              const progress = getProgress(comp.since_overhaul, comp.next_overhaul);
              const dueSoon = isDueSoon(comp.since_overhaul, comp.next_overhaul);
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
                  <td className="px-4 py-2 font-semibold">{comp.total_time}h</td>
                  <td className="px-4 py-2 font-semibold">{comp.since_overhaul !== null ? `${comp.since_overhaul}h` : "N/A"}</td>
                  <td className="px-4 py-2 font-semibold">{comp.next_overhaul !== null ? `${comp.next_overhaul}h` : "N/A"}</td>
                  <td className="px-4 py-2 w-40">
                    {comp.since_overhaul && comp.next_overhaul ? (
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-28 h-1.5 bg-muted" />
                        <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="capitalize px-2 py-0.5 text-xs font-medium">{comp.condition}</Badge>
                  </td>
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
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 