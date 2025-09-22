"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Plane, Settings, Wrench, History, Layers, Info, Clock, ArrowLeft, AlertCircle } from "lucide-react";
import AircraftMaintenanceTab from "@/components/aircraft/maintenance/AircraftMaintenanceTab";
import AircraftMaintenanceHistoryTable from "@/components/aircraft/maintenance/AircraftMaintenanceHistoryTable";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import AircraftHeader from "@/components/aircraft/AircraftHeader";
import * as Tabs from "@radix-ui/react-tabs";
import ObservationsTable from '@/components/aircraft/ObservationsTable';
import type { Aircraft } from "@/types/aircraft";
import React from "react";
import AircraftOverviewForm from '@/components/aircraft/AircraftOverviewForm';
import AircraftFlightHistoryTab from '@/components/aircraft/AircraftFlightHistoryTab';
import { useEffect } from 'react';
import type { AircraftComponent } from "@/types/aircraft_components";

const tabItems = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "flight", label: "Flight History", icon: History },
  { id: "observations", label: "Observations", icon: AlertCircle },
  { id: "equipment", label: "Maintenance Items", icon: Layers },
  { id: "maintenance-history", label: "Maintenance History", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AircraftViewPage() {
  const { id } = useParams<{ id: string }>();
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [nextDue, setNextDue] = useState<{ name: string, dueHours?: number, dueDate?: string, dueInHours?: number, dueInDays?: number } | null>(null);

  // Fetch aircraft data
  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/aircraft?id=${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch aircraft");
        }
        return res.json();
      })
      .then((data) => {
        setAircraft(data.aircraft || null);
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch aircraft components for next maintenance due
  useEffect(() => {
    if (!id) return;
    fetch(`/api/aircraft_components?aircraft_id=${id}`)
      .then(res => res.json())
      .then(data => setComponents(data || []));
  }, [id]);

  // Calculate next maintenance due
  useEffect(() => {
    if (!components.length || !aircraft?.total_hours) {
      setNextDue(null);
      return;
    }
    let soonest: { name: string, dueHours?: number, dueDate?: string, dueInHours?: number, dueInDays?: number } | null = null;
    const now = new Date();
    components.forEach(comp => {
      let dueInHours = comp.current_due_hours != null ? comp.current_due_hours - Number(aircraft.total_hours) : undefined;
      let dueInDays = comp.current_due_date ? (new Date(comp.current_due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : undefined;
      if (dueInHours !== undefined && dueInHours < 0) dueInHours = undefined;
      if (dueInDays !== undefined && dueInDays < 0) dueInDays = undefined;
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
  }, [components, aircraft?.total_hours]);

  const [selectedTab, setSelectedTab] = useState("overview");

  if (loading) {
    return (
      <main className="w-full min-h-screen flex flex-col p-6 gap-8">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
          <div className="text-center text-muted-foreground py-20 text-lg">Loading aircraft...</div>
        </div>
      </main>
    );
  }
  if (error || !aircraft) {
    return (
      <main className="w-full min-h-screen flex flex-col p-6 gap-8">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
          <div className="text-center text-red-600 py-20 text-lg">{error || "Aircraft not found."}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen flex flex-col p-6 gap-8">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
        {/* Back link */}
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-2">
          <a href="/dashboard/aircraft" className="text-indigo-600 hover:underline text-base flex items-center gap-1">
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
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow"
            title="View all maintenance, services, and history for this aircraft"
          >
            <a href={`/dashboard/aircraft/view/${id}/maintenance`}>
              Maintenance Hub <span><Plane className="w-4 h-4" /></span>
            </a>
          </Button>
        </AircraftHeader>
        {/* Tabs Layout */}
        <div className="w-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          <Tabs.Root value={selectedTab} onValueChange={setSelectedTab} className="w-full flex flex-col">
            <div className="w-full border-b border-gray-200 bg-white">
              <Tabs.List className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]" aria-label="Aircraft tabs">
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Tabs.Trigger
                      key={tab.id}
                      value={tab.id}
                      className={`inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                        data-[state=active]:border-indigo-700 data-[state=active]:text-indigo-800
                        data-[state=inactive]:text-muted-foreground hover:text-indigo-600 whitespace-nowrap`}
                      style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </Tabs.Trigger>
                  );
                })}
              </Tabs.List>
            </div>
            <div className="w-full p-6">
              <Tabs.Content value="overview" className="h-full w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Aircraft Details */}
                  <Card className="p-6 flex flex-col gap-2 shadow-sm border border-gray-200 bg-white">
                    <div className="font-semibold text-lg flex items-center gap-2 mb-2">
                      <Info className="w-5 h-5 text-indigo-500" /> Aircraft Details
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex justify-between"><span>Registration</span><span className="font-medium">{aircraft.registration}</span></div>
                      <div className="flex justify-between"><span>Type</span><span className="font-medium">{aircraft.type || '-'}</span></div>
                      <div className="flex justify-between"><span>Year</span><span className="font-medium">{aircraft.year_manufactured || '-'}</span></div>
                    </div>
                  </Card>
                  {/* Readings */}
                  <Card className="p-6 flex flex-col gap-2 shadow-sm border border-gray-200 bg-white">
                    <div className="font-semibold text-lg flex items-center gap-2 mb-2">
                      <Settings className="w-5 h-5 text-indigo-500" /> Readings
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex justify-between"><span>Total Time</span><span className="font-medium">{aircraft.total_hours}</span></div>
                      <div className="flex justify-between"><span>Current Tacho</span><span className="font-medium">{aircraft.current_tach}</span></div>
                      <div className="flex justify-between"><span>Current Hobbs</span><span className="font-medium">{aircraft.current_hobbs}</span></div>
                    </div>
                  </Card>
                  {/* Next Maintenance Due */}
                  <Card className="p-6 flex flex-col gap-2 shadow-sm border border-gray-200 bg-white">
                    <div className="font-semibold text-lg flex items-center gap-2 mb-2">
                      <Wrench className="w-5 h-5 text-indigo-500" /> Next Maintenance Due
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex justify-between">
                        <span>Date/Time</span>
                        <span className="font-medium">
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
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Aircraft Observations */}
                  <Card className="p-6 flex flex-col gap-2 shadow-sm border border-gray-200 bg-white">
                    <div className="font-semibold text-lg flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500" /> Aircraft Observations
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">No open defects</span>
                    </div>
                  </Card>
                </div>
              </Tabs.Content>
              <Tabs.Content value="flight" className="h-full w-full">
                <AircraftFlightHistoryTab aircraftId={id} />
              </Tabs.Content>
              <Tabs.Content value="observations" className="h-full w-full">
                <ObservationsTable aircraftId={id} />
              </Tabs.Content>
              <Tabs.Content value="equipment" className="h-full w-full">
                <AircraftMaintenanceTab />
              </Tabs.Content>
              <Tabs.Content value="maintenance-history" className="h-full w-full">
                <AircraftMaintenanceHistoryTable />
              </Tabs.Content>
              <Tabs.Content value="settings" className="h-full w-full">
                <AircraftOverviewForm aircraft={aircraft} onSave={setAircraft} />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>
      </div>
    </main>
  );
} 