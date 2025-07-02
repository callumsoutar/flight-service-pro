import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import AircraftListClient from "./AircraftListClient";

export default function AircraftPage() {
  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
          <p className="text-muted-foreground mt-2">Manage your fleet and maintenance schedules</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2">
          <Plane className="w-5 h-5" /> Add Aircraft
        </Button>
      </div>
      <AircraftListClient />
    </main>
  );
} 