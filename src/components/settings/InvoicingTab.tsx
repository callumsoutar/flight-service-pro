"use client";
import { useState } from "react";
import { FileText, DollarSign, Calendar, Settings } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import TaxRateManager from "./TaxRateManager";

const invoicingTabs = [
  { id: "tax-rates", label: "Tax Rates", icon: DollarSign },
  { id: "invoice-config", label: "Invoice Configuration", icon: FileText },
  { id: "payment-terms", label: "Payment Terms", icon: Calendar },
  { id: "templates", label: "Templates", icon: Settings },
];

export default function InvoicingTab() {
  const [selectedTab, setSelectedTab] = useState("tax-rates");

  return (
    <div className="w-full h-full">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <Tabs.List
          className="flex flex-row gap-1 mb-8 border-b-2 border-gray-200"
          aria-label="Invoicing configuration types"
        >
          {invoicingTabs.map((tab) => {
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
          <Tabs.Content value="tax-rates" className="outline-none">
            <TaxRateManager />
          </Tabs.Content>

          <Tabs.Content value="invoice-config" className="outline-none">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice Configuration</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Configure how invoices are generated and formatted. This feature is coming soon.
              </p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="payment-terms" className="outline-none">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Terms</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Set default payment terms and due dates. This feature is coming soon.
              </p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="templates" className="outline-none">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Settings className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice Templates</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Customize invoice templates and branding. This feature is coming soon.
              </p>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}