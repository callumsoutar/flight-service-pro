"use client";
import { Button } from "@/components/ui/button";
import InvoiceOptionsDropdown from "./InvoiceOptionsDropdown";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface InvoiceActionsToolbarProps {
  // Common props
  mode: 'new' | 'edit' | 'view';
  invoiceId?: string;
  invoiceNumber?: string | null;
  status?: string;

  // Navigation
  backHref?: string;
  backLabel?: string;

  // Edit/New mode props
  onSave?: () => void;
  onApprove?: () => void;
  onDelete?: () => void;
  saveDisabled?: boolean;
  approveDisabled?: boolean;
  saveLoading?: boolean;
  approveLoading?: boolean;
  showApprove?: boolean; // Only show approve for draft invoices in edit mode

  // View mode props
  bookingId?: string | null;
}

export default function InvoiceActionsToolbar({
  mode,
  invoiceId,
  invoiceNumber,
  status,
  backHref = "/dashboard/invoices",
  backLabel = "Back to Invoices",
  onSave,
  onApprove,
  onDelete,
  saveDisabled = false,
  approveDisabled = false,
  saveLoading = false,
  approveLoading = false,
  showApprove = false,
  bookingId,
}: InvoiceActionsToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* Back link */}
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          className="text-indigo-600 hover:underline text-base flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* New/Edit mode actions */}
        {(mode === 'new' || mode === 'edit') && (
          <>
            {mode === 'new' && (
              <Button
                variant="outline"
                onClick={onSave}
                disabled={saveDisabled || saveLoading}
              >
                {saveLoading ? 'Saving...' : 'Save Draft'}
              </Button>
            )}

            {mode === 'edit' && (
              <Button
                variant="outline"
                onClick={onSave}
                disabled={saveDisabled || saveLoading}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              >
                {saveLoading ? 'Saving...' : 'Save'}
              </Button>
            )}

            {showApprove && (
              <Button
                onClick={onApprove}
                disabled={approveDisabled || approveLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {approveLoading ? 'Approving...' : 'Approve'}
              </Button>
            )}

            {mode === 'edit' && invoiceId && invoiceNumber && (
              <InvoiceOptionsDropdown
                invoiceId={invoiceId}
                invoiceNumber={invoiceNumber}
                bookingId={bookingId}
                mode="edit"
                onDelete={onDelete}
                status={status}
              />
            )}
          </>
        )}

        {/* View mode actions */}
        {mode === 'view' && invoiceId && invoiceNumber && (
          <InvoiceOptionsDropdown
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            bookingId={bookingId}
            mode="view"
            status={status}
          />
        )}
      </div>
    </div>
  );
}
