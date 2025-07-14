import { Button } from "@/components/ui/button";
import { Plane, Wrench, AlertTriangle } from "lucide-react";
import AircraftListClient from "./AircraftListClient";

export default function AircraftPage() {
  // TODO: Replace with real data from API or props
  const totalAircraft = 0;
  const activeAircraft = 0;
  const dueForMaintenance = 0;

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
      {/* Aircraft Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-950 rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><Plane className="w-6 h-6 text-indigo-600" /></span>
          <h3 className="text-zinc-600 dark:text-zinc-300 font-medium mb-2">Total Aircraft</h3>
          <p className="text-3xl font-bold text-indigo-600">{totalAircraft}</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><Wrench className="w-6 h-6 text-green-600" /></span>
          <h3 className="text-zinc-600 dark:text-zinc-300 font-medium mb-2">Active Aircraft</h3>
          <p className="text-3xl font-bold text-green-600">{activeAircraft}</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><AlertTriangle className="w-6 h-6 text-yellow-600" /></span>
          <h3 className="text-zinc-600 dark:text-zinc-300 font-medium mb-2">Due for Maintenance</h3>
          <p className="text-3xl font-bold text-yellow-600">{dueForMaintenance}</p>
        </div>
      </div>
      <AircraftListClient />
    </main>
  );
} 