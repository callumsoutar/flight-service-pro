"use client";
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

const services = [
  {
    id: "s1",
    name: "100 Hour Inspection",
    due_date: "2024-08-15",
    due_hours: 1300,
    last_completed: "2024-05-10",
    next_due: "2024-08-15",
    status: "Upcoming",
  },
  {
    id: "s2",
    name: "Annual Inspection",
    due_date: "2024-09-30",
    due_hours: null,
    last_completed: "2023-09-25",
    next_due: "2024-09-30",
    status: "Upcoming",
  },
  {
    id: "s3",
    name: "Pitot Static System Check",
    due_date: "2024-07-20",
    due_hours: null,
    last_completed: "2022-07-20",
    next_due: "2024-07-20",
    status: "Due Soon",
  },
];

function isDueSoon(dueDate: string) {
  // For demo: mark as due soon if within 30 days
  const now = new Date();
  const due = new Date(dueDate);
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 30;
}

function getDueIn(service: typeof services[0]) {
  // If due_hours is present, show hours; otherwise, show days until due_date
  if (service.due_hours !== null && service.due_hours !== undefined) {
    // For demo, assume current hours is 1245
    const currentHours = 1245;
    const hoursLeft = service.due_hours - currentHours;
    return hoursLeft > 0 ? `${hoursLeft} hours` : "Due now";
  } else if (service.due_date) {
    const now = new Date();
    const due = new Date(service.due_date);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days` : "Due now";
  }
  return "N/A";
}

export default function AircraftServicingTab() {
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
            {services.map((service) => {
              const dueSoon = isDueSoon(service.due_date);
              const dueIn = getDueIn(service);
              return (
                <tr
                  key={service.id}
                  className={
                    dueSoon
                      ? "bg-yellow-50 border-l-4 border-yellow-400"
                      : "hover:bg-muted/50 transition-colors"
                  }
                >
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{service.name}</td>
                  <td className="px-4 py-2 font-semibold">{service.due_date}</td>
                  <td className="px-4 py-2 font-semibold">{service.due_hours !== null ? `${service.due_hours}h` : "N/A"}</td>
                  <td className="px-4 py-2 font-semibold">{dueIn}</td>
                  <td className="px-4 py-2 text-muted-foreground">{service.last_completed}</td>
                  <td className="px-4 py-2">{service.next_due}</td>
                  <td className="px-4 py-2">
                    <Badge variant={service.status === "Due Soon" ? "secondary" : "outline"} className="capitalize px-2 py-0.5 text-xs font-medium">{service.status}</Badge>
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