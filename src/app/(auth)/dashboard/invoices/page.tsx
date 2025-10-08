import React from "react";
import InvoiceSummaryCardsClient from "@/components/invoices/InvoiceSummaryCardsClient";
import InvoicesClientView from "@/components/invoices/InvoicesClientView";
import InvoicePageActions from "@/components/invoices/InvoicePageActions";
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
        <InvoicePageActions />
      </div>
      <InvoiceSummaryCardsClient />
      <InvoicesClientView />
    </main>
  );
}

// Export the protected component using the standardized HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(InvoicesPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any; 