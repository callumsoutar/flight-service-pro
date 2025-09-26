import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import InvoiceSummaryCardsClient from "@/components/invoices/InvoiceSummaryCardsClient";
import InvoicesClientView from "@/components/invoices/InvoicesClientView";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

// Component now receives guaranteed authenticated user and role data
async function InvoicesPage({}: ProtectedPageProps) {
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
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Invoice
          </Button>
        </Link>
      </div>
      <InvoiceSummaryCardsClient />
      <InvoicesClientView />
    </main>
  );
}

// Export the protected component using the standardized HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(InvoicesPage, ROLE_CONFIGS.ADMIN_ONLY) as any; 