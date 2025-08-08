"use client";
import { useParams } from "next/navigation";
import UpcomingMaintenanceTable from "@/components/aircraft/maintenance/UpcomingMaintenanceTable";

export default function AircraftMaintenanceTab() {
  const { id: aircraft_id } = useParams<{ id: string }>();
  return (
    <div className="flex flex-col gap-6">
      <UpcomingMaintenanceTable aircraft_id={aircraft_id} />
    </div>
  );
} 