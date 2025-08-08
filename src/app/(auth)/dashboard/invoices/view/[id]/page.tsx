import { Card } from '@/components/ui/card';
import PaymentHistory from '@/components/invoices/PaymentHistory';
import DraftRedirector from '@/components/invoices/DraftRedirector';
import { createClient } from '@/lib/SupabaseServerClient';
import { InvoiceItem } from '@/types/invoice_items';
import * as React from 'react';
import InvoiceViewHeader from '@/components/invoices/InvoiceViewHeader';
import InvoiceViewActions from '@/components/invoices/InvoiceViewActions';

async function getInvoiceAndItems(id: string) {
  const supabase = await createClient();
  
  // Fetch invoice
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, users:user_id(id, first_name, last_name, email)')
    .eq('id', id)
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
      <InvoiceViewHeader
        invoiceNumber={invoice.invoice_number}
        status={invoice.status}
        memberName={memberName}
        bookingId={invoice.booking_id}
      />

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
                    <td className="px-4 py-3 text-right text-sm">{item.quantity || 0}</td>
                    <td className="px-4 py-3 text-right text-sm">${(item.rate_inclusive || item.unit_price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">${(item.line_total || 0).toFixed(2)}</td>
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
            <div className="font-medium">${(invoice.subtotal || 0).toFixed(2)}</div>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Tax ({invoice.tax_rate ? Math.round(invoice.tax_rate * 100) : 0}%):</div>
            <div className="font-medium">${(invoice.tax_total || 0).toFixed(2)}</div>
          </div>
          <div className="flex gap-8 text-lg mt-2">
            <div className="font-bold">Total:</div>
            <div className="font-bold text-green-600">${(invoice.total_amount || 0).toFixed(2)}</div>
          </div>
        </div>
        {/* Paid & Balance Due */}
        <div className="flex flex-col items-end mt-4 gap-1">
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Paid:</div>
            <div className="font-semibold text-blue-700">${(invoice.total_paid || 0).toFixed(2)}</div>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Balance Due:</div>
            <div className="font-semibold text-red-600">${(invoice.balance_due || 0).toFixed(2)}</div>
          </div>
        </div>
        {/* Add Payment Button (below balance due, tight spacing) */}
        <div className="mt-2">
          <InvoiceViewActions
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            totalAmount={invoice.total_amount || 0}
            balanceDue={invoice.balance_due || invoice.total_amount || 0}
            status={invoice.status}
          />
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