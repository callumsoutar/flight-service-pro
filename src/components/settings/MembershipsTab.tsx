"use client";
import { useState } from "react";
import { Users, DollarSign, Gift, Calendar } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import MembershipTypesConfig from "./MembershipTypesConfig";
import { MembershipYearConfig } from "./MembershipYearConfig";

const membershipTabs = [
  { id: "membership-types", label: "Membership Types", icon: Users },
  { id: "membership-year", label: "Membership Year", icon: Calendar },
  { id: "invoicing", label: "Invoicing", icon: DollarSign },
  { id: "benefits", label: "Benefits", icon: Gift },
];

export default function MembershipsTab() {
  const [selectedTab, setSelectedTab] = useState("membership-types");

  return (
    <div className="w-full h-full">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <Tabs.List
          className="flex flex-row gap-1 mb-8 border-b-2 border-gray-200"
          aria-label="Membership configuration types"
        >
          {membershipTabs.map((tab) => {
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
          <Tabs.Content value="membership-types" className="outline-none">
            <MembershipTypesConfig />
          </Tabs.Content>

          <Tabs.Content value="membership-year" className="outline-none">
            <MembershipYearConfig />
          </Tabs.Content>

          <Tabs.Content value="invoicing" className="outline-none">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Membership Invoicing</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Set up recurring billing and invoicing for memberships. This feature is coming soon.
              </p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="benefits" className="outline-none">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Gift className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Membership Benefits</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Define benefits and perks for each membership tier. This feature is coming soon.
              </p>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}