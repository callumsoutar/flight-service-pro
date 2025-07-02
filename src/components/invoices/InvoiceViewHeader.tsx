"use client";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Send } from 'lucide-react';
import InvoiceOptionsDropdown from '@/components/invoices/InvoiceOptionsDropdown';
import RecordPaymentModal from '@/components/invoices/RecordPaymentModal';
import * as React from 'react';

export default function InvoiceViewHeader({
  invoiceId,
  invoiceNumber,
  status,
  totalAmount,
  balanceDue,
  memberName,
}: {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  balanceDue: number;
  memberName: string;
}) {
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
          <a href="/dashboard/invoices" className="text-indigo-600 hover:underline text-base">&larr; Back to Invoices</a>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2">{invoiceNumber}</h1>
        <div className="text-muted-foreground text-base mt-1">Invoice for {memberName}</div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2 md:mt-0">
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1.5 text-sm font-semibold">{status}</Badge>
        <Button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
        >
          <Send className="w-5 h-5 text-white" />
          Send Invoice
        </Button>
        <InvoiceOptionsDropdown />
      </div>
    </div>
  );
} 