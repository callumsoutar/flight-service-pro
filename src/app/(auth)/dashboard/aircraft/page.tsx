import React from "react";
import { Plane, Wrench, AlertTriangle } from "lucide-react";
import AircraftListClient from "./AircraftListClient";
import AircraftPageHeader from "@/components/aircraft/AircraftPageHeader";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

// Component now receives guaranteed authenticated user and role data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function AircraftPage({ user: _user, userRole: _userRole }: ProtectedPageProps) {
  // TODO: Replace with real data from API or props
  const totalAircraft = 0;
  const activeAircraft = 0;
  const dueForMaintenance = 0;

  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <AircraftPageHeader />

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

// Export the protected component using the standardized HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(AircraftPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any; 