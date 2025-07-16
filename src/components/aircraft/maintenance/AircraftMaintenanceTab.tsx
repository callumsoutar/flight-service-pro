"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import ComponentEditModal from "@/components/aircraft/maintenance/ComponentEditModal";
import ComponentNewModal from "@/components/aircraft/maintenance/ComponentNewModal";
import { useOrgContext } from "@/components/OrgContextProvider";
import LogMaintenanceModal from "@/components/aircraft/maintenance/LogMaintenanceModal";
import UpcomingMaintenanceTable from "@/components/aircraft/maintenance/UpcomingMaintenanceTable";

export default function AircraftMaintenanceTab() {
  const { id: aircraft_id } = useParams<{ id: string }>();
  // Only keep modal state and org context for modals if still needed elsewhere
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedComponent] = useState(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logComponentId] = useState<string | null>(null);
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitType, setVisitType] = useState("");
  const [description, setDescription] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [hoursAtVisit, setHoursAtVisit] = useState("");
  const [notes] = useState("");
  const [dateOutOfMaintenance, setDateOutOfMaintenance] = useState<Date | undefined>(undefined);
  const { currentOrgId } = useOrgContext();

  return (
    <div className="flex flex-col gap-6">
      {/* Old table removed. Only UpcomingMaintenanceTable remains. */}
      <UpcomingMaintenanceTable aircraft_id={aircraft_id} />
      <ComponentEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        component={selectedComponent}
        onSave={() => {}}
      />
      <ComponentNewModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSave={() => {}}
      />
      <LogMaintenanceModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        visitDate={visitDate}
        setVisitDate={setVisitDate}
        visitType={visitType}
        setVisitType={setVisitType}
        description={description}
        setDescription={setDescription}
        totalCost={totalCost}
        setTotalCost={setTotalCost}
        hoursAtVisit={hoursAtVisit}
        setHoursAtVisit={setHoursAtVisit}
        notes={notes}
        dateOutOfMaintenance={dateOutOfMaintenance}
        setDateOutOfMaintenance={setDateOutOfMaintenance}
        aircraft_id={aircraft_id}
        component_id={logComponentId}
        organization_id={currentOrgId || ""}
      />
    </div>
  );
} 