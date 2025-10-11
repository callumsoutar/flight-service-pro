import { ArrowLeft, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import AircraftHeader from "@/components/aircraft/AircraftHeader";
// Types imported for potential future use
// import type { Aircraft } from "@/types/aircraft";
// import type { AircraftComponent } from "@/types/aircraft_components";
import React from "react";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import { createClient } from "@/lib/SupabaseServerClient";
import { notFound } from "next/navigation";
import AircraftViewClient from "./AircraftViewClient";

interface AircraftViewPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function AircraftViewPage({ params, user: _user, userRole: _userRole }: AircraftViewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch aircraft data server-side
  const { data: aircraft, error: aircraftError } = await supabase
    .from("aircraft")
    .select("*")
    .eq("id", id)
    .single();

  if (aircraftError || !aircraft) {
    notFound();
  }

  // Fetch aircraft components for next maintenance due
  const { data: componentsData } = await supabase
    .from("aircraft_components")
    .select("*")
    .eq("aircraft_id", id);

  const components = componentsData || [];

  // Calculate next maintenance due
  let nextDue: { name: string, dueHours?: number, dueDate?: string, dueInHours?: number, dueInDays?: number } | null = null;
  if (components.length && aircraft.total_hours) {
    const now = new Date();
    components.forEach(comp => {
      let dueInHours = comp.current_due_hours != null ? comp.current_due_hours - Number(aircraft.total_hours) : undefined;
      let dueInDays = comp.current_due_date ? (new Date(comp.current_due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : undefined;
      if (dueInHours !== undefined && dueInHours < 0) dueInHours = undefined;
      if (dueInDays !== undefined && dueInDays < 0) dueInDays = undefined;
      if (!nextDue ||
          (dueInHours !== undefined && (nextDue.dueInHours === undefined || dueInHours < nextDue.dueInHours)) ||
          (dueInDays !== undefined && (nextDue.dueInDays === undefined || dueInDays < nextDue.dueInDays))) {
        nextDue = {
          name: comp.name,
          dueHours: comp.current_due_hours !== null && comp.current_due_hours !== undefined ? comp.current_due_hours : undefined,
          dueDate: comp.current_due_date || undefined,
          dueInHours,
          dueInDays,
        };
      }
    });
  }

  return (
    <main className="w-full min-h-screen flex flex-col p-6 gap-8">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
        {/* Back link */}
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-2">
          <a href="/dashboard/aircraft" className="text-[#6564db] hover:underline text-base flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Aircraft
          </a>
        </div>
        {/* Aircraft header and actions */}
        <AircraftHeader aircraft={{
          registration: aircraft.registration,
          type: aircraft.type || "",
          status: aircraft.status || "available",
        }}>
          <Button
            asChild
            variant="default"
            className="flex items-center gap-2 bg-[#6564db] hover:bg-[#232ed1] text-white shadow"
            title="View all maintenance, services, and history for this aircraft"
          >
            <a href={`/dashboard/aircraft/view/${id}/maintenance`}>
              Maintenance Hub <span><Plane className="w-4 h-4" /></span>
            </a>
          </Button>
        </AircraftHeader>
        {/* Tabs Layout */}
        <div className="w-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          <AircraftViewClient aircraft={aircraft} components={components} nextDue={nextDue} aircraftId={id} />
        </div>
      </div>
    </main>
  );
}

// Export protected component with role restriction for instructors and above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(AircraftViewPage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any; 