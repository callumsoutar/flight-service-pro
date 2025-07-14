"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Plane, Settings, Wrench, ClipboardList, History, Layers, Info, Clock, ArrowLeft } from "lucide-react";
import AircraftMaintenanceTab from "@/components/aircraft/maintenance/AircraftMaintenanceTab";
import AircraftServicingTab from "@/components/aircraft/maintenance/AircraftServicingTab";
import AircraftMaintenanceHistoryTable from "@/components/aircraft/maintenance/AircraftMaintenanceHistoryTable";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import AircraftHeader from "@/components/aircraft/AircraftHeader";
import * as Tabs from "@radix-ui/react-tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

const tabItems = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "flight", label: "Flight History", icon: History },
  { id: "techlog", label: "Tech Log", icon: ClipboardList },
  { id: "equipment", label: "Equipment", icon: Layers },
  { id: "servicing", label: "Servicing", icon: Wrench },
  { id: "maintenance-history", label: "Maintenance History", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AircraftViewPage() {
  const { id } = useParams<{ id: string }>();
  // Placeholder data for now
  const aircraft = {
    registration: "ZK-ABC",
    type: "Cessna 172",
    status: "available",
    total_hours: 1245,
    last_maintenance_date: "2024-05-15",
    next_maintenance_date: "2024-07-05",
    manufacturer: "Cessna",
    year_manufactured: 2018,
    serial_number: "C172S-12345",
    location: "Hangar A3",
    last_flight: "2024-07-01",
  };

  const [selectedTab, setSelectedTab] = useState("overview");
  const MAIN_TABS_COUNT = 5;
  const mainTabs = tabItems.slice(0, MAIN_TABS_COUNT);
  const overflowTabs = tabItems.slice(MAIN_TABS_COUNT);
  const selectedOverflow = overflowTabs.find((t) => t.id === selectedTab);

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
        <AircraftHeader aircraft={aircraft}>
          <Button asChild variant="secondary" className="flex items-center gap-2" title="View all maintenance, services, and history for this aircraft">
            <a href={`/dashboard/aircraft/view/${id}/maintenance`}>
              Maintenance Overview <span><Plane className="w-4 h-4" /></span>
            </a>
          </Button>
        </AircraftHeader>
        {/* Tabs Layout */}
        <div className="w-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          <Tabs.Root value={selectedTab} onValueChange={setSelectedTab} className="w-full flex flex-col">
            <div className="w-full border-b border-gray-200 bg-white">
              <Tabs.List className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]" aria-label="Aircraft tabs">
                {mainTabs.map((tab) => {
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
                {overflowTabs.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                          ${selectedOverflow ? "border-indigo-700 text-indigo-800" : "text-muted-foreground hover:text-indigo-600"} whitespace-nowrap`}
                        style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                        aria-label="More tabs"
                      >
                        <ChevronDown className="w-5 h-5" />
                        <span>More</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px] rounded-xl shadow-lg p-2 bg-white border border-gray-200">
                      {overflowTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = selectedTab === tab.id;
                        return (
                          <DropdownMenuItem
                            key={tab.id}
                            onSelect={() => setSelectedTab(tab.id)}
                            className={`flex items-center gap-3 px-3 py-2 text-base rounded-lg transition-colors hover:bg-gray-100 focus:bg-gray-100 ${isActive ? "font-semibold text-indigo-700 bg-indigo-50" : "text-gray-900"}`}
                            data-state={isActive ? "active" : undefined}
                            style={{ minHeight: 44 }}
                          >
                            {isActive && <Check className="w-5 h-5 text-indigo-700" />}
                            <Icon className="w-5 h-5" />
                            <span>{tab.label}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Tabs.List>
            </div>
            <div className="w-full p-6">
              <Tabs.Content value="overview" className="h-full w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="p-6 flex flex-col items-center">
                    <div className="text-3xl font-bold text-indigo-700">{aircraft.total_hours}</div>
                    <div className="text-muted-foreground mt-1">Total Hours</div>
                  </Card>
                  <Card className="p-6 flex flex-col items-center">
                    <div className="text-2xl font-bold text-green-700">{aircraft.last_flight}</div>
                    <div className="text-muted-foreground mt-1">Last Flight</div>
                  </Card>
                  <Card className="p-6 flex flex-col items-center">
                    <div className="text-2xl font-bold text-orange-700">{aircraft.next_maintenance_date}</div>
                    <div className="text-muted-foreground mt-1">Next Scheduled</div>
                  </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Aircraft Details */}
                  <Card className="p-6">
                    <div className="font-semibold mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Aircraft Details</div>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex justify-between"><span>Manufacturer</span><span className="font-medium">{aircraft.manufacturer}</span></div>
                      <div className="flex justify-between"><span>Year</span><span className="font-medium">{aircraft.year_manufactured}</span></div>
                      <div className="flex justify-between"><span>Serial Number</span><span className="font-medium">{aircraft.serial_number}</span></div>
                      <div className="flex justify-between"><span>Registration</span><span className="font-medium">{aircraft.registration}</span></div>
                      <div className="flex justify-between"><span>Location</span><span className="font-medium">{aircraft.location}</span></div>
                    </div>
                  </Card>
                  {/* Recent Activity */}
                  <Card className="p-6 md:col-span-2">
                    <div className="font-semibold mb-2 flex items-center gap-2"><History className="w-4 h-4" /> Recent Activity</div>
                    <div className="flex flex-col gap-3 text-sm">
                      <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-blue-500" /> <span>Flight Completed</span> <span className="text-muted-foreground ml-auto">2 days ago</span></div>
                      <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-green-500" /> <span>Maintenance Completed</span> <span className="text-muted-foreground ml-auto">2 days ago</span></div>
                      <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-yellow-500" /> <span>Maintenance Due</span> <span className="text-muted-foreground ml-auto">Upcoming</span></div>
                    </div>
                  </Card>
                </div>
              </Tabs.Content>
              <Tabs.Content value="flight" className="h-full w-full">
                <Card className="p-6">Flight History (Coming soon)</Card>
              </Tabs.Content>
              <Tabs.Content value="techlog" className="h-full w-full">
                <Card className="p-6">Tech Log (Coming soon)</Card>
              </Tabs.Content>
              <Tabs.Content value="equipment" className="h-full w-full">
                <AircraftMaintenanceTab />
              </Tabs.Content>
              <Tabs.Content value="servicing" className="h-full w-full">
                <AircraftServicingTab />
              </Tabs.Content>
              <Tabs.Content value="maintenance-history" className="h-full w-full">
                <AircraftMaintenanceHistoryTable />
              </Tabs.Content>
              <Tabs.Content value="settings" className="h-full w-full">
                <Card className="p-6">Settings (Coming soon)</Card>
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>
      </div>
    </main>
  );
} 