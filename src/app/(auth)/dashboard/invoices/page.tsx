import React from "react";
import InvoicesTable from "@/components/invoices/InvoicesTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

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
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm">
          <div className="text-2xl font-bold">12</div>
          <div className="text-muted-foreground mt-1">Total Invoices</div>
        </div>
        <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm">
          <div className="text-2xl font-bold">8</div>
          <div className="text-muted-foreground mt-1">Paid Invoices</div>
        </div>
        <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center shadow-sm">
          <div className="text-2xl font-bold">4</div>
          <div className="text-muted-foreground mt-1">Outstanding Invoices</div>
        </div>
      </section>
      <InvoicesTable />
    </main>
  );
} 