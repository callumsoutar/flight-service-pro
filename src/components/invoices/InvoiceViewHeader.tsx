"use client";
import { Badge } from '@/components/ui/badge';
import InvoiceOptionsDropdown from '@/components/invoices/InvoiceOptionsDropdown';
import InvoiceMemberLink from '@/components/invoices/InvoiceMemberLink';
import { CheckCircle2 } from 'lucide-react';
import * as React from 'react';

interface InvoiceViewHeaderProps {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  currentUserRole?: string | null;
  bookingId?: string | null;
}

export default function InvoiceViewHeader({
  invoiceId,
  invoiceNumber,
  status,
  userId,
  firstName,
  lastName,
  email,
  currentUserRole,
  bookingId,
}: InvoiceViewHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
          <a href="/dashboard/invoices" className="text-indigo-600 hover:underline text-base">&larr; Back to Invoices</a>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2">{invoiceNumber}</h1>
        <div className="text-muted-foreground text-base mt-1">
          Invoice for <InvoiceMemberLink
            userId={userId}
            firstName={firstName}
            lastName={lastName}
            email={email}
            currentUserRole={currentUserRole}
          />
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2 md:mt-0">
        {status === 'paid' ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border-2 border-green-500">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-700 uppercase tracking-wide">Paid</span>
          </div>
        ) : status === 'pending' ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border-2 border-amber-400">
            <span className="font-semibold text-amber-700 uppercase tracking-wide">Pending</span>
          </div>
        ) : (
          <Badge
            className="large"
            variant={(() => {
              switch (status) {
                case 'draft': return 'secondary';
                case 'overdue': return 'destructive';
                case 'cancelled': return 'outline';
                case 'refunded': return 'outline';
                default: return 'outline';
              }
            })()}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )}
        <InvoiceOptionsDropdown invoiceId={invoiceId} invoiceNumber={invoiceNumber} bookingId={bookingId} status={status} />
      </div>
    </div>
  );
} 