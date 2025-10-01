"use client";

import AircraftMaintenanceTab from "@/components/aircraft/maintenance/AircraftMaintenanceTab";
import AircraftMaintenanceHistoryTable from "@/components/aircraft/maintenance/AircraftMaintenanceHistoryTable";
import type { Aircraft } from "@/types/aircraft";
import type { AircraftComponent } from "@/types/aircraft_components";

interface AircraftMaintenanceClientProps {
  aircraft: Aircraft;
  components: AircraftComponent[];
  nextDue: { name: string, dueHours?: number, dueDate?: string, dueInHours?: number, dueInDays?: number } | null;
  aircraftId: string;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export default function AircraftMaintenanceClient({
  aircraft: _aircraft,
  components: _components,
  nextDue: _nextDue,
  aircraftId: _aircraftId
}: AircraftMaintenanceClientProps) {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return (
    <div className="flex flex-col gap-8">
      {/* Maintenance Items */}
      <div className="w-full space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Maintenance Items</h2>
        <AircraftMaintenanceTab />
      </div>

      {/* Maintenance History */}
      <div className="w-full space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Maintenance History</h2>
        <AircraftMaintenanceHistoryTable />
      </div>
    </div>
  );
}
