import React from "react";
import AircraftListClient from "./AircraftListClient";
import AircraftPageHeader from "@/components/aircraft/AircraftPageHeader";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

// Component now receives guaranteed authenticated user and role data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function AircraftPage({ user: _user, userRole: _userRole }: ProtectedPageProps) {
  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <AircraftPageHeader />
      <AircraftListClient />
    </main>
  );
}

// Export the protected component using the standardized HOC
export default withRoleProtection(AircraftPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP); 