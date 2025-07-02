import React from "react";
import InvoicesTable from "@/components/invoices/InvoicesTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

// Move InvoiceSummaryCards to a client wrapper
import InvoiceSummaryCardsClient from "@/components/invoices/InvoiceSummaryCardsClient";

export default function InvoicesPage() {
  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-2">
            Manage your flight school&apos;s invoices and billing
          </p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Invoice
          </Button>
        </Link>
      </div>
      {/* Render summary cards via client wrapper */}
      <InvoiceSummaryCardsClient />
      <InvoicesTable />
    </main>
  );
} 