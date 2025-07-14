"use client";
import * as React from "react";
import InvoicesTabsClient from "@/components/invoices/InvoicesTabsClient";
import InvoicesTable from "@/components/invoices/InvoicesTable";

export default function InvoicesClientView() {
  const [selectedTab, setSelectedTab] = React.useState("all");
  return (
    <>
      <InvoicesTabsClient selectedTab={selectedTab} onTabChange={setSelectedTab} />
      <div className="w-full bg-white rounded-xl shadow-sm border p-0 md:p-4">
        <InvoicesTable statusFilter={selectedTab} />
      </div>
    </>
  );
} 