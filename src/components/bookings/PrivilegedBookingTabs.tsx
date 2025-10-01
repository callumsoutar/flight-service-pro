"use client";
import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plane, Calendar, Search } from "lucide-react";

export type BookingTabType = "unconfirmed" | "flying" | "today" | "search";

interface PrivilegedBookingTabsProps {
  activeTab: BookingTabType;
  onTabChange: (tab: BookingTabType) => void;
  unconfirmedCount: number;
  flyingCount: number;
  todayCount: number;
  searchResultsCount?: number;
  hasSearchResults?: boolean;
}

export default function PrivilegedBookingTabs({
  activeTab,
  onTabChange,
  unconfirmedCount,
  flyingCount,
  todayCount,
  searchResultsCount,
  hasSearchResults = false
}: PrivilegedBookingTabsProps) {
  const tabs = [
    {
      id: "today" as BookingTabType,
      label: "Today",
      icon: Calendar,
      count: todayCount,
      color: "text-green-600",
      activeColor: "data-[state=active]:text-green-700 data-[state=active]:border-green-700"
    },
    {
      id: "unconfirmed" as BookingTabType,
      label: "Unconfirmed",
      icon: AlertCircle,
      count: unconfirmedCount,
      color: "text-yellow-600",
      activeColor: "data-[state=active]:text-yellow-700 data-[state=active]:border-yellow-700"
    },
    {
      id: "flying" as BookingTabType,
      label: "Flying",
      icon: Plane,
      count: flyingCount,
      color: "text-blue-600",
      activeColor: "data-[state=active]:text-blue-700 data-[state=active]:border-blue-700"
    }
  ];

  // Add search tab if there are search results
  if (hasSearchResults) {
    tabs.push({
      id: "search" as BookingTabType,
      label: "Search Results",
      icon: Search,
      count: searchResultsCount || 0,
      color: "text-purple-600",
      activeColor: "data-[state=active]:text-purple-700 data-[state=active]:border-purple-700"
    });
  }

  const handleTabChange = (value: string) => {
    onTabChange(value as BookingTabType);
  };

  return (
    <div className="border-b border-gray-200">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="inline-flex bg-transparent border-0 rounded-none p-0 h-auto space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={`inline-flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=inactive]:text-gray-500 hover:text-gray-700 whitespace-nowrap bg-transparent ${tab.activeColor}`}
                style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
              >
                <Icon className={`w-4 h-4 ${tab.color}`} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}