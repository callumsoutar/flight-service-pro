"use client";
import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const STATUS_TABS = [
  { id: "all", label: "All", icon: FileText },
  { id: "draft", label: "Draft", icon: Loader2 },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "paid", label: "Paid", icon: CheckCircle },
  { id: "overdue", label: "Overdue", icon: AlertCircle },
];

export default function InvoicesTabsClient({ selectedTab, onTabChange }: { selectedTab: string; onTabChange: (tab: string) => void }) {
  return (
    <div className="max-w-fit mb-2">
      <Tabs value={selectedTab} onValueChange={onTabChange} className="">
        <TabsList className="inline-flex bg-gray-50 border border-gray-200 rounded-2xl shadow-sm p-1">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:border-indigo-700 data-[state=active]:text-indigo-800 data-[state=inactive]:text-muted-foreground hover:text-indigo-600 whitespace-nowrap"
                style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
} 