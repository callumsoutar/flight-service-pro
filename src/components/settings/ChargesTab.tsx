"use client";
import { useState } from "react";
import { Plane, Clock, DollarSign, PlaneLanding } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import FlightTypesConfig from "./FlightTypesConfig";
import ChargeablesConfig from "./ChargeablesConfig";
import LandingFeesConfig from "./LandingFeesConfig";

const chargeTabs = [
  { id: "aircraft", label: "Aircraft Rates", icon: Plane },
  { id: "instructor", label: "Instructor Rates", icon: Clock },
  { id: "landing", label: "Landing Fees", icon: PlaneLanding },
  { id: "additional", label: "Additional Charges", icon: DollarSign },
];

export default function ChargesTab() {
  const [selectedTab, setSelectedTab] = useState("aircraft");

  return (
    <div className="w-full h-full">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <Tabs.List
          className="flex flex-row gap-1 mb-8 border-b-2 border-gray-200"
          aria-label="Charge types"
        >
          {chargeTabs.map((tab) => {
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
          <Tabs.Content value="aircraft" className="outline-none">
            <FlightTypesConfig />
          </Tabs.Content>

          <Tabs.Content value="instructor" className="outline-none">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Instructor Rates</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Set hourly rates for different types of instruction. This feature is coming soon.
              </p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="landing" className="outline-none">
            <LandingFeesConfig />
          </Tabs.Content>

          <Tabs.Content value="additional" className="outline-none">
            <ChargeablesConfig />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}