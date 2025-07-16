import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import React from "react";

interface AircraftHeaderProps {
  aircraft: {
    registration: string;
    type: string;
    status: string;
  };
  children?: React.ReactNode; // For actions (e.g., Maintenance Overview button)
}

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-500" },
  inactive: { label: "Inactive", color: "bg-gray-400" },
  available: { label: "Available", color: "bg-green-500" },
  in_use: { label: "In Use", color: "bg-blue-600" },
  maintenance: { label: "Maintenance", color: "bg-red-500" },
};

export default function AircraftHeader({ aircraft, children }: AircraftHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-xl shadow p-6 border border-gray-200 mb-6">
      <div className="flex items-center gap-6">
        <div className="bg-indigo-100 p-3 rounded-lg">
          <Plane className="w-12 h-12 text-indigo-600" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight text-gray-900">{aircraft.registration}</span>
            <Badge className={`${statusMap[aircraft.status]?.color || "bg-gray-400"} text-white font-semibold px-3 py-1.5 text-xs`}>
              {statusMap[aircraft.status]?.label || "Unknown"}
            </Badge>
          </div>
          <div className="text-muted-foreground text-lg font-medium mt-1">{aircraft.type} &bull; Maintenance Management</div>
        </div>
      </div>
      <div className="flex flex-col gap-2 items-end">{children}</div>
    </div>
  );
} 