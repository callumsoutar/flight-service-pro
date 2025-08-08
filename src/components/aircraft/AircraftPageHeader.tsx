"use client";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import { AddAircraftModal } from "./AddAircraftModal";
import { useState } from "react";

interface AircraftPageHeaderProps {
  refresh?: () => void;
}

export default function AircraftPageHeader({ refresh }: AircraftPageHeaderProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
          <p className="text-muted-foreground mt-2">Manage your fleet and maintenance schedules</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2"
        >
          <Plane className="w-5 h-5" /> Add Aircraft
        </Button>
      </div>

      <AddAircraftModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        refresh={refresh}
      />
    </>
  );
}