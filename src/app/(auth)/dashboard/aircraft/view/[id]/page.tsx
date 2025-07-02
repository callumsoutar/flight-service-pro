import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plane, Settings, Wrench, ClipboardList, History, Layers, Info } from "lucide-react";
import AircraftMaintenanceTab from "./AircraftMaintenanceTab";
import AircraftServicingTab from "./AircraftServicingTab";

export default function AircraftViewPage() {
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

  const statusMap: Record<string, { label: string; color: string }> = {
    available: { label: "Available", color: "bg-green-500" },
    in_use: { label: "In Use", color: "bg-blue-600" },
    maintenance: { label: "Maintenance", color: "bg-red-500" },
  };

  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <Plane className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {aircraft.registration}
              <Badge className={`${statusMap[aircraft.status].color} text-white font-semibold px-3 py-1.5 text-xs`}>{statusMap[aircraft.status].label}</Badge>
            </h1>
            <div className="text-muted-foreground text-lg font-medium mt-1">{aircraft.type} &bull; Maintenance Management</div>
          </div>
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total Hours</div>
              <div className="text-2xl font-bold">{aircraft.total_hours}h</div>
            </div>
            <Badge className="bg-green-500 text-white font-semibold px-3 py-1.5 text-xs">{statusMap[aircraft.status].label}</Badge>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col items-center justify-center">
          <div className="text-sm text-yellow-600 font-semibold flex items-center gap-1"><Wrench className="w-4 h-4" /> Due Soon</div>
          <div className="text-3xl font-bold mt-2">2</div>
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center">
          <div className="text-sm text-blue-600 font-semibold flex items-center gap-1"><ClipboardList className="w-4 h-4" /> Upcoming</div>
          <div className="text-3xl font-bold mt-2">4</div>
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center">
          <div className="text-sm text-green-600 font-semibold flex items-center gap-1"><span>$</span> Est. Cost</div>
          <div className="text-3xl font-bold mt-2">$3,585</div>
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center">
          <div className="text-sm text-indigo-600 font-semibold flex items-center gap-1"><History className="w-4 h-4" /> Next Due</div>
          <div className="text-3xl font-bold mt-2">9 <span className="text-base font-normal">days</span></div>
        </Card>
      </section>

      {/* Tabs */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-screen-lg">
          <Tabs defaultValue="overview" className="w-full mt-2">
            <TabsList className="mb-4 w-full flex flex-wrap gap-2">
              <TabsTrigger value="overview" className="flex items-center gap-2"><Info className="w-4 h-4" /> Overview</TabsTrigger>
              <TabsTrigger value="flight" className="flex items-center gap-2"><History className="w-4 h-4" /> Flight History</TabsTrigger>
              <TabsTrigger value="techlog" className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Tech Log</TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2"><Layers className="w-4 h-4" /> Equipment</TabsTrigger>
              <TabsTrigger value="equipment" className="flex items-center gap-2"><Wrench className="w-4 h-4" /> Servicing</TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="w-full max-w-screen-lg mx-auto">
              {/* Aircraft Overview Section */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              </section>
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
            </TabsContent>
            <TabsContent value="flight" className="w-full max-w-screen-lg mx-auto">
              <Card className="p-6">Flight History (Coming soon)</Card>
            </TabsContent>
            <TabsContent value="techlog" className="w-full max-w-screen-lg mx-auto">
              <Card className="p-6">Tech Log (Coming soon)</Card>
            </TabsContent>
            <TabsContent value="maintenance" className="w-full max-w-screen-lg mx-auto">
              <AircraftMaintenanceTab />
            </TabsContent>
            <TabsContent value="equipment" className="w-full max-w-screen-lg mx-auto">
              <AircraftServicingTab />
            </TabsContent>
            <TabsContent value="settings" className="w-full max-w-screen-lg mx-auto">
              <Card className="p-6">Settings (Coming soon)</Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
} 