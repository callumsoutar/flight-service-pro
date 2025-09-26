import React from "react";
import InvoiceEditClient from "./InvoiceEditClient";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

interface EditInvoicePageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;
  if (!id) return null;
  return <InvoiceEditClient id={id} />;
}

// Export protected component with role restriction for admin/owner only
/* eslint-disable @typescript-eslint/no-explicit-any */
export default withRoleProtection(EditInvoicePage as any, ROLE_CONFIGS.ADMIN_ONLY) as any; 