"use client";
import { useState, Suspense, lazy } from "react";
import {
  FileText,
  DollarSign,
  Calendar,
  GraduationCap,
  Settings as SettingsIcon,
  Check,
  ChevronDown,
  CreditCard
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/contexts/SettingsContext";

const InvoicingTab = lazy(() => import("@/components/settings/InvoicingTab"));
const ChargesTab = lazy(() => import("@/components/settings/ChargesTab"));
const BookingsTab = lazy(() => import("@/components/settings/BookingsTab"));
const TrainingTab = lazy(() => import("@/components/settings/TrainingTab"));
const MembershipsTab = lazy(() => import("@/components/settings/MembershipsTab"));
const GeneralTab = lazy(() => import("@/components/settings/GeneralTab"));

const tabItems = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "invoicing", label: "Invoicing", icon: FileText },
  { id: "charges", label: "Charges", icon: DollarSign },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "memberships", label: "Memberships", icon: CreditCard },
];

export default function SettingsClient() {
  const [selectedTab, setSelectedTab] = useState("general");

  // How many tabs to show before overspill
  const MAIN_TABS_COUNT = 7;
  const mainTabs = tabItems.slice(0, MAIN_TABS_COUNT);
  const overflowTabs = tabItems.slice(MAIN_TABS_COUNT);
  const selectedOverflow = overflowTabs.find((t) => t.id === selectedTab);

  return (
    <SettingsProvider>
      <TooltipProvider>
        <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <div className="w-full border-b border-gray-200 bg-white">
          <Tabs.List
            className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]"
            aria-label="Settings tabs"
          >
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
          <Tabs.Content value="general" className="h-full w-full">
            {selectedTab === "general" && (
              <Suspense fallback={<div className="flex items-center justify-center py-8">Loading...</div>}>
                <GeneralTab />
              </Suspense>
            )}
          </Tabs.Content>
          <Tabs.Content value="invoicing" className="h-full w-full">
            {selectedTab === "invoicing" && (
              <Suspense fallback={<div className="flex items-center justify-center py-8">Loading...</div>}>
                <InvoicingTab />
              </Suspense>
            )}
          </Tabs.Content>
          <Tabs.Content value="charges" className="h-full w-full">
            {selectedTab === "charges" && (
              <Suspense fallback={<div className="flex items-center justify-center py-8">Loading...</div>}>
                <ChargesTab />
              </Suspense>
            )}
          </Tabs.Content>
          <Tabs.Content value="bookings" className="h-full w-full">
            {selectedTab === "bookings" && (
              <Suspense fallback={<div className="flex items-center justify-center py-8">Loading...</div>}>
                <BookingsTab />
              </Suspense>
            )}
          </Tabs.Content>
          <Tabs.Content value="training" className="h-full w-full">
            {selectedTab === "training" && (
              <Suspense fallback={<div className="flex items-center justify-center py-8">Loading...</div>}>
                <TrainingTab />
              </Suspense>
            )}
          </Tabs.Content>
          <Tabs.Content value="memberships" className="h-full w-full">
            {selectedTab === "memberships" && (
              <Suspense fallback={<div className="flex items-center justify-center py-8">Loading...</div>}>
                <MembershipsTab />
              </Suspense>
            )}
          </Tabs.Content>
        </div>
      </Tabs.Root>
        </div>
      </TooltipProvider>
    </SettingsProvider>
  );
}