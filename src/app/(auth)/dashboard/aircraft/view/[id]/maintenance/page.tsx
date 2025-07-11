"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CalendarCheck2, History, GaugeCircle } from "lucide-react";
import AircraftServicingTab from "@/components/aircraft/maintenance/AircraftServicingTab";
import AircraftMaintenanceTab from "@/components/aircraft/maintenance/AircraftMaintenanceTab";
import AircraftMaintenanceHistoryTable from "@/components/aircraft/maintenance/AircraftMaintenanceHistoryTable";
import { AircraftComponent } from '@/types/aircraft_components';

export default function AircraftMaintenancePage() {
  const { id } = useParams<{ id: string }>();
  const [registration, setRegistration] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [totalHours, setTotalHours] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [nextDue, setNextDue] = useState<{ name: string, dueHours?: number, dueDate?: string, dueInHours?: number, dueInDays?: number } | null>(null);
  const [lastVisitDate, setLastVisitDate] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/aircraft?id=${id}`)
      .then(res => res.json())
      .then(data => {
        setRegistration(data?.aircraft?.registration || "");
        setType(data?.aircraft?.type || "");
        setTotalHours(data?.aircraft?.total_hours || "");
      })
      .finally(() => setLoading(false));
    fetch(`/api/aircraft_components?aircraft_id=${id}`)
      .then(res => res.json())
      .then(data => setComponents(data || []));
    // Fetch most recent maintenance visit
    fetch(`/api/maintenance_visits?aircraft_id=${id}`)
      .then(res => res.json())
      .then((visits) => {
        if (Array.isArray(visits) && visits.length > 0) {
          setLastVisitDate(visits[0].visit_date);
        } else {
          setLastVisitDate("");
        }
      });
  }, [id]);

  useEffect(() => {
    if (!components.length || !totalHours) {
      setNextDue(null);
      return;
    }
    let soonest: { name: string, dueHours?: number, dueDate?: string, dueInHours?: number, dueInDays?: number } | null = null;
    const now = new Date();
    components.forEach(comp => {
      let dueInHours = comp.current_due_hours != null ? comp.current_due_hours - Number(totalHours) : undefined;
      let dueInDays = comp.current_due_date ? (new Date(comp.current_due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : undefined;
      // Only consider future due
      if (dueInHours !== undefined && dueInHours < 0) dueInHours = undefined;
      if (dueInDays !== undefined && dueInDays < 0) dueInDays = undefined;
      // Pick the soonest
      if (!soonest ||
          (dueInHours !== undefined && (soonest.dueInHours === undefined || dueInHours < soonest.dueInHours)) ||
          (dueInDays !== undefined && (soonest.dueInDays === undefined || dueInDays < soonest.dueInDays))) {
        soonest = {
          name: comp.name,
          dueHours: comp.current_due_hours !== null && comp.current_due_hours !== undefined ? comp.current_due_hours : undefined,
          dueDate: comp.current_due_date || undefined,
          dueInHours,
          dueInDays,
        };
      }
    });
    setNextDue(soonest);
  }, [components, totalHours]);

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
          <div className="flex items-center gap-4 mt-2">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Maintenance Overview
            </h1>
            {registration && (
              <span className="inline-block bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-lg tracking-wide shadow-sm border border-indigo-200" aria-label="Aircraft registration">
                {registration}
              </span>
            )}
            {type && (
              <span className="text-base font-medium text-muted-foreground">{type}</span>
            )}
          </div>
          <div className="text-muted-foreground text-base mt-1 max-w-2xl">
            View and manage all scheduled services, equipment/components, and maintenance history for this aircraft in one place.
          </div>
        </div>
      </div>
      {/* Removed divider for minimal spacing */}

      {/* Aircraft highlights */}
      <div className="flex flex-row gap-4 mb-0 w-full bg-muted/40 rounded-xl px-4 py-3">
        <Card className="flex-1 p-4 flex flex-col items-center justify-center shadow-sm border border-muted bg-white rounded-lg transition hover:shadow-md hover:-translate-y-0.5 focus-within:shadow-md focus-within:-translate-y-0.5" tabIndex={0} aria-label="Next Maintenance Due">
          <CalendarCheck2 className="w-6 h-6 text-indigo-500 mb-1" aria-hidden />
          <div className="text-xs text-muted-foreground mb-1">Next Maintenance Due</div>
          <div className="text-lg font-bold text-indigo-700">
            {loading ? <span className="text-muted-foreground">Loading...</span> :
              nextDue
                ? <>
                    {nextDue.dueInHours != null && (
                      <span>{nextDue.dueInHours.toFixed(1)}h</span>
                    )}
                    {nextDue.dueInHours != null && nextDue.dueInDays != null && " / "}
                    {nextDue.dueInDays != null && (
                      <span>{Math.ceil(nextDue.dueInDays)} days</span>
                    )}
                    <span className="block text-xs text-muted-foreground">{nextDue.name}</span>
                  </>
                : "-"}
          </div>
        </Card>
        <Card className="flex-1 p-4 flex flex-col items-center justify-center shadow-sm border border-muted bg-white rounded-lg transition hover:shadow-md hover:-translate-y-0.5 focus-within:shadow-md focus-within:-translate-y-0.5" tabIndex={0} aria-label="Last Maintenance">
          <History className="w-6 h-6 text-green-500 mb-1" aria-hidden />
          <div className="text-xs text-muted-foreground mb-1">Last Maintenance</div>
          <div className="text-lg font-bold text-green-700">
            {loading ? <span className="text-muted-foreground">Loading...</span> : (lastVisitDate ? new Date(lastVisitDate).toLocaleDateString() : "-")}
          </div>
        </Card>
        <Card className="flex-1 p-4 flex flex-col items-center justify-center shadow-sm border border-muted bg-white rounded-lg transition hover:shadow-md hover:-translate-y-0.5 focus-within:shadow-md focus-within:-translate-y-0.5" tabIndex={0} aria-label="Total Hours">
          <GaugeCircle className="w-6 h-6 text-orange-500 mb-1" aria-hidden />
          <div className="text-xs text-muted-foreground mb-1">Total Hours</div>
          <div className="text-lg font-bold text-orange-700">
            {loading ? <span className="text-muted-foreground">Loading...</span> : (totalHours ? `${totalHours}h` : "-")}
          </div>
        </Card>
      </div>

      {/* Scheduled Services Section */}
      <Card className="p-6 mb-8 rounded-xl shadow-sm">
        <AircraftServicingTab />
      </Card>

      {/* Equipment & Components Section */}
      <Card className="p-6 mb-8 rounded-xl shadow-sm">
        <AircraftMaintenanceTab />
      </Card>

      {/* Maintenance History Section */}
      <Card className="p-6 rounded-xl shadow-sm">
        <AircraftMaintenanceHistoryTable />
      </Card>
    </main>
  );
} 