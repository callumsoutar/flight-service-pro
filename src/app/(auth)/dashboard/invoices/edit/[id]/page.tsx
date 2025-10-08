import React from "react";
import InvoiceEditClient from "./InvoiceEditClient";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';
import { createClient } from '@/lib/SupabaseServerClient';
import { redirect } from 'next/navigation';

interface EditInvoicePageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;
  
  if (!id) return null;
  
  // Handle new invoice mode
  if (id === 'new') {
    return <InvoiceEditClient mode="new" />;
  }
  
  // Check if invoice is paid - redirect to view if it is
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .single();
  
  // Paid invoices cannot be edited - redirect to view page
  if (invoice && invoice.status === 'paid') {
    redirect(`/dashboard/invoices/view/${id}`);
  }
  
  // Handle existing invoice edit
  return <InvoiceEditClient id={id} mode="edit" />;
}

// Export protected component with role restriction for instructors and above
/* eslint-disable @typescript-eslint/no-explicit-any */
export default withRoleProtection(EditInvoicePage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any; 