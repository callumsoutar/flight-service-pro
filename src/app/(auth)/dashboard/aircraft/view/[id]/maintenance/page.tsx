import React from "react";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CalendarCheck2, History, GaugeCircle } from "lucide-react";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import { createClient } from "@/lib/SupabaseServerClient";
import { notFound } from "next/navigation";
import AircraftMaintenanceClient from "./AircraftMaintenanceClient";

interface AircraftMaintenancePageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function AircraftMaintenancePage({ params, user: _user, userRole: _userRole }: AircraftMaintenancePageProps) {
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
  type NextDue = { name: string, dueHours?: number, dueDate?: string, dueInHours?: number, dueInDays?: number };
  let nextDue: NextDue | null = null;
  if (components.length && aircraft.total_hours) {
    const now = new Date();
    components.forEach(comp => {
      let dueInHours = comp.current_due_hours != null ? comp.current_due_hours - Number(aircraft.total_hours) : undefined;
      let dueInDays = comp.current_due_date ? (new Date(comp.current_due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : undefined;
      if (dueInHours !== undefined && dueInHours < 0) dueInHours = undefined;
      if (dueInDays !== undefined && dueInDays < 0) dueInDays = undefined;
      if (!nextDue ||
          (dueInHours !== undefined && (nextDue?.dueInHours === undefined || dueInHours < (nextDue?.dueInHours || 0))) ||
          (dueInDays !== undefined && (nextDue?.dueInDays === undefined || dueInDays < (nextDue?.dueInDays || 0)))) {
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

  // Fetch most recent maintenance visit
  const { data: visitsData } = await supabase
    .from("maintenance_visits")
    .select("visit_date")
    .eq("aircraft_id", id)
    .order("visit_date", { ascending: false })
    .limit(1);

  const lastVisitDate = visitsData && visitsData.length > 0 ? visitsData[0].visit_date : "";

  return (
    <main className="max-w-screen-xl mx-auto p-6 flex flex-col gap-10">
      {/* Back link and page heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-0">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
            <a href={`/dashboard/aircraft/view/${id}`} className="text-indigo-600 hover:underline text-base flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Aircraft
            </a>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
            Maintenance Hub
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            {aircraft.registration} - {aircraft.type || "Aircraft"}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col gap-2 shadow-sm border border-gray-200 bg-white">
          <div className="font-semibold text-lg flex items-center gap-2 mb-2">
            <GaugeCircle className="w-5 h-5 text-indigo-500" /> Total Hours
          </div>
          <div className="text-3xl font-bold text-indigo-600">{aircraft.total_hours || 0}</div>
        </Card>
        <Card className="p-6 flex flex-col gap-2 shadow-sm border border-gray-200 bg-white">
          <div className="font-semibold text-lg flex items-center gap-2 mb-2">
            <CalendarCheck2 className="w-5 h-5 text-green-500" /> Next Due
          </div>
          <div className="text-3xl font-bold text-green-600">
            {nextDue ? (
              <>
                {(nextDue as NextDue).dueInHours != null && (
                  <span>{(nextDue as NextDue).dueInHours!.toFixed(1)}h</span>
                )}
                {(nextDue as NextDue).dueInHours != null && (nextDue as NextDue).dueInDays != null && " / "}
                {(nextDue as NextDue).dueInDays != null && (
                  <span>{Math.ceil((nextDue as NextDue).dueInDays!)} days</span>
                )}
                <span className="block text-xs text-muted-foreground">{(nextDue as NextDue).name}</span>
              </>
            ) : "-"}
          </div>
        </Card>
        <Card className="p-6 flex flex-col gap-2 shadow-sm border border-gray-200 bg-white">
          <div className="font-semibold text-lg flex items-center gap-2 mb-2">
            <History className="w-5 h-5 text-blue-500" /> Last Visit
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {lastVisitDate ? new Date(lastVisitDate).toLocaleDateString() : "Never"}
          </div>
        </Card>
      </div>

      {/* Maintenance Components */}
      <AircraftMaintenanceClient 
        aircraft={aircraft} 
        components={components} 
        nextDue={nextDue} 
        aircraftId={id} 
      />
    </main>
  );
}

// Export protected component with role restriction for instructors and above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(AircraftMaintenancePage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;