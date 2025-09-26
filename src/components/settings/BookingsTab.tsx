"use client";
import { useState } from "react";
import { Calendar, Clock, AlertTriangle, Settings } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import CancellationCategoriesConfig from "./CancellationCategoriesConfig";
import TimeSlotConfiguration from "./TimeSlotConfiguration";
import FlightAuthorizationSettings from "./FlightAuthorizationSettings";

const bookingTabs = [
  { id: "booking-rules", label: "Booking Rules", icon: Calendar },
  { id: "time-slots", label: "Time Slots", icon: Clock },
  { id: "cancellations", label: "Cancellations", icon: AlertTriangle },
  { id: "workflow", label: "Workflow", icon: Settings },
];

export default function BookingsTab() {
  const [selectedTab, setSelectedTab] = useState("booking-rules");

  return (
    <div className="w-full h-full">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <Tabs.List
          className="flex flex-row gap-1 mb-8 border-b-2 border-gray-200"
          aria-label="Booking configuration types"
        >
          {bookingTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:bg-indigo-50 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 hover:text-indigo-600 hover:bg-gray-50 whitespace-nowrap rounded-t-lg -mb-[2px]"
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="flex-1 overflow-auto">
          <Tabs.Content value="booking-rules" className="outline-none">
            <FlightAuthorizationSettings />
          </Tabs.Content>

          <Tabs.Content value="time-slots" className="outline-none">
            <TimeSlotConfiguration />
          </Tabs.Content>

          <Tabs.Content value="cancellations" className="outline-none">
            <CancellationCategoriesConfig />
          </Tabs.Content>

          <Tabs.Content value="workflow" className="outline-none">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Settings className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Booking Workflow</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Configure the booking approval and confirmation process. This feature is coming soon.
              </p>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}