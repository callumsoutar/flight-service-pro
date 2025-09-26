"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Settings, Wrench, History, Layers, Info, Clock, AlertCircle } from "lucide-react";
import AircraftMaintenanceTab from "@/components/aircraft/maintenance/AircraftMaintenanceTab";
import AircraftMaintenanceHistoryTable from "@/components/aircraft/maintenance/AircraftMaintenanceHistoryTable";
import * as Tabs from "@radix-ui/react-tabs";
import ObservationsTable from '@/components/aircraft/ObservationsTable';
import type { Aircraft } from "@/types/aircraft";
import AircraftOverviewForm from '@/components/aircraft/AircraftOverviewForm';
import AircraftFlightHistoryTab from '@/components/aircraft/AircraftFlightHistoryTab';
import type { AircraftComponent } from "@/types/aircraft_components";

const tabItems = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "flight", label: "Flight History", icon: History },
  { id: "observations", label: "Observations", icon: AlertCircle },
  { id: "equipment", label: "Maintenance Items", icon: Layers },
  { id: "maintenance-history", label: "Maintenance History", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

interface AircraftViewClientProps {
  aircraft: Aircraft;
  components: AircraftComponent[];
  nextDue: { name: string, dueHours?: number, dueDate?: string, dueInHours?: number, dueInDays?: number } | null;
  aircraftId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AircraftViewClient({ aircraft, components: _components, nextDue, aircraftId }: AircraftViewClientProps) {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [aircraftState, setAircraftState] = useState(aircraft);

  return (
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
                <div className="flex justify-between"><span>Registration</span><span className="font-medium">{aircraftState.registration}</span></div>
                <div className="flex justify-between"><span>Type</span><span className="font-medium">{aircraftState.type || '-'}</span></div>
                <div className="flex justify-between"><span>Year</span><span className="font-medium">{aircraftState.year_manufactured || '-'}</span></div>
              </div>
            </Card>
            {/* Readings */}
            <Card className="p-6 flex flex-col gap-2 shadow-sm border border-gray-200 bg-white">
              <div className="font-semibold text-lg flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-indigo-500" /> Readings
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between"><span>Total Time</span><span className="font-medium">{aircraftState.total_hours}</span></div>
                <div className="flex justify-between"><span>Current Tacho</span><span className="font-medium">{aircraftState.current_tach}</span></div>
                <div className="flex justify-between"><span>Current Hobbs</span><span className="font-medium">{aircraftState.current_hobbs}</span></div>
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
                    {nextDue
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
          <AircraftFlightHistoryTab aircraftId={aircraftId} />
        </Tabs.Content>
        <Tabs.Content value="observations" className="h-full w-full">
          <ObservationsTable aircraftId={aircraftId} />
        </Tabs.Content>
        <Tabs.Content value="equipment" className="h-full w-full">
          <AircraftMaintenanceTab />
        </Tabs.Content>
        <Tabs.Content value="maintenance-history" className="h-full w-full">
          <AircraftMaintenanceHistoryTable />
        </Tabs.Content>
        <Tabs.Content value="settings" className="h-full w-full">
          <AircraftOverviewForm aircraft={aircraftState} onSave={setAircraftState} />
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}
