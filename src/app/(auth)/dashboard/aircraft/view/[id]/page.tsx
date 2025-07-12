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
        {/* Sidebar + Content Layout */}
        <div className="flex w-full h-[600px] min-h-[600px] bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          {/* Sidebar */}
          <aside className="flex-shrink-0 h-full min-w-[210px] max-w-[240px] border-r border-gray-300 p-6 flex flex-col gap-2 bg-gray-50 z-10">
            <div className="text-lg font-semibold mb-2 pl-1">Aircraft</div>
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition font-medium text-base
                    ${isActive ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"}
                  `}
                  type="button"
                  aria-current={isActive}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>
          {/* Main Content */}
          <section className="flex-1 min-w-0 p-8 h-full overflow-y-auto">
            {selectedTab === "overview" && (
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
            )}
            {selectedTab === "overview" && (
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
            )}
            {selectedTab === "flight" && (
              <Card className="p-6">Flight History (Coming soon)</Card>
            )}
            {selectedTab === "techlog" && (
              <Card className="p-6">Tech Log (Coming soon)</Card>
            )}
            {selectedTab === "equipment" && (
              <AircraftMaintenanceTab />
            )}
            {selectedTab === "servicing" && (
              <AircraftServicingTab />
            )}
            {selectedTab === "maintenance-history" && (
              <AircraftMaintenanceHistoryTable />
            )}
            {selectedTab === "settings" && (
              <Card className="p-6">Settings (Coming soon)</Card>
            )}
          </section>
        </div>
      </div>
    </main>
  );
} 