import { Card } from '@/components/ui/card';
import { Calendar, User, DollarSign } from 'lucide-react';
import PaymentHistory from '@/components/invoices/PaymentHistory';
import DraftRedirector from '@/components/invoices/DraftRedirector';
import { createClient } from '@/lib/SupabaseServerClient';
import { InvoiceItem } from '@/types/invoice_items';
import { cookies } from 'next/headers';
import * as React from 'react';
import InvoiceViewHeader from '@/components/invoices/InvoiceViewHeader';

async function getInvoiceAndItems(id: string) {
  const supabase = await createClient();
  // Get current org from cookie
  const cookieStore = await cookies();
  const currentOrgId = cookieStore.get('current_org_id')?.value;
  if (!currentOrgId) return { invoice: null, items: [] };
  // Fetch invoice
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, users:user_id(id, first_name, last_name, email)')
    .eq('id', id)
    .eq('organization_id', currentOrgId)
    .limit(1);
  const invoice = invoices && invoices.length > 0 ? invoices[0] : null;
  // Fetch items
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at', { ascending: true });
  return { invoice, items: items || [] };
}

export default async function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { invoice, items } = await getInvoiceAndItems(id);

  if (!invoice) {
    return <div className="p-10 text-center text-destructive">Invoice not found.</div>;
  }
  if (invoice.status === 'draft') {
    return <DraftRedirector invoiceId={invoice.id} />;
  }
  const memberName = invoice.users
    ? `${invoice.users.first_name || ''} ${invoice.users.last_name || ''}`.trim() || invoice.users.email
    : invoice.user_id;

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <InvoiceViewHeader
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        status={invoice.status}
        totalAmount={invoice.total_amount}
        balanceDue={typeof invoice.balance_due === 'number' ? invoice.balance_due : invoice.total_amount}
        memberName={memberName}
      />

      {/* Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="flex flex-row items-center gap-4 p-5">
          <div className="bg-indigo-100 text-indigo-600 rounded-full p-2">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Member</div>
            <div className="font-semibold text-base">{memberName}</div>
          </div>
        </Card>
        <Card className="flex flex-row items-center gap-4 p-5">
          <div className="bg-blue-100 text-blue-600 rounded-full p-2">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Due Date</div>
            <div className="font-semibold text-base">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</div>
          </div>
        </Card>
        <Card className="flex flex-row items-center gap-4 p-5">
          <div className="bg-green-100 text-green-600 rounded-full p-2">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Amount</div>
            <div className="font-semibold text-base">${invoice.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </Card>
      </section>

      {/* Invoice Document */}
      <Card className="p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
          <div>
            <div className="text-2xl font-bold mb-1">INVOICE</div>
            <div className="text-muted-foreground text-sm mb-2">Kapiti Aero Club</div>
            <div className="text-muted-foreground text-sm mb-4">Flight Training</div>
            <div className="mb-2">
              <div className="font-semibold">Bill To:</div>
              <div>{memberName}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-right mt-6 md:mt-0">
            <div className="text-sm text-muted-foreground">Invoice Number:</div>
            <div className="font-semibold">{invoice.invoice_number}</div>
            <div className="text-sm text-muted-foreground mt-2">Invoice Date:</div>
            <div className="font-semibold">{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}</div>
            <div className="text-sm text-muted-foreground mt-2">Due Date:</div>
            <div className="font-semibold">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</div>
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate (incl. tax)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-3 text-center text-muted-foreground">No items</td></tr>
              ) : (
                items.map((item: InvoiceItem) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-sm">{item.description}</td>
                    <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-sm">${item.rate_inclusive.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">${item.total_amount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Totals */}
        <div className="flex flex-col items-end mt-6 gap-1">
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Subtotal (excl. Tax):</div>
            <div className="font-medium">${invoice.subtotal?.toFixed(2) ?? '-'}</div>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Tax ({invoice.tax_rate ? Math.round(invoice.tax_rate * 100) : 0}%):</div>
            <div className="font-medium">${invoice.tax_amount?.toFixed(2) ?? '-'}</div>
          </div>
          <div className="flex gap-8 text-lg mt-2">
            <div className="font-bold">Total:</div>
            <div className="font-bold text-green-600">${invoice.total_amount?.toFixed(2) ?? '-'}</div>
          </div>
        </div>
        {/* Paid & Balance Due */}
        <div className="flex flex-col items-end mt-4 gap-1">
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Paid:</div>
            <div className="font-semibold text-blue-700">${typeof invoice.paid === 'number' ? invoice.paid.toFixed(2) : '0.00'}</div>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Balance Due:</div>
            <div className="font-semibold text-red-600">${typeof invoice.balance_due === 'number' ? invoice.balance_due.toFixed(2) : '0.00'}</div>
          </div>
        </div>
        {/* Footer */}
        <div className="mt-8 text-center text-muted-foreground text-sm border-t pt-4">
          Thank you for choosing to train with Kapiti Aero Club.<br />
          <span className="text-xs">Payment terms: within 7 days of receipt of this invoice. Late payments may incur additional charges.</span>
        </div>
      </Card>
      {/* Payment History */}
      <PaymentHistory invoiceId={invoice.id} />
    </div>
  );
} 