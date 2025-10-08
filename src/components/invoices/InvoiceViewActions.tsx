"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText } from "lucide-react";
import RecordPaymentModal from "@/components/invoices/RecordPaymentModal";
import CreateCreditNoteModal from "@/components/credit-notes/CreateCreditNoteModal";
import { useCurrentUserRoles } from "@/hooks/use-user-roles";
import type { Invoice } from "@/types/invoices";
import type { InvoiceItem } from "@/types/invoice_items";

export default function InvoiceViewActions({
  invoiceId,
  invoiceNumber,
  totalAmount,
  balanceDue,
  status,
  invoice: invoiceProp,
  invoiceItems: invoiceItemsProp,
}: {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  balanceDue: number;
  status: string;
  invoice?: Invoice | null;
  invoiceItems?: InvoiceItem[];
}) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);

  // Use provided props or fetch if not provided (for backwards compatibility)
  const [invoice, setInvoice] = useState<Invoice | null>(invoiceProp || null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>(invoiceItemsProp || []);

  // Use the proper React Query hook for user roles
  const { data: userRoleData, isLoading: rolesLoading } = useCurrentUserRoles();
  const isAdminOrOwner = userRoleData ? ['admin', 'owner'].includes(userRoleData.role) : false;

  useEffect(() => {
    // Only fetch if data not provided via props
    if (!invoiceProp || !invoiceItemsProp) {
      fetchInvoiceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, invoiceProp, invoiceItemsProp]);

  const fetchInvoiceData = async () => {
    try {
      // Fetch invoice and items for credit note modal
      const [invoiceRes, itemsRes] = await Promise.all([
        fetch(`/api/invoices?id=${invoiceId}`),
        fetch(`/api/invoice_items?invoice_id=${invoiceId}`)
      ]);

      const invoiceData = await invoiceRes.json();
      const itemsData = await itemsRes.json();

      if (invoiceData.invoices && invoiceData.invoices.length > 0) {
        setInvoice(invoiceData.invoices[0]);
      }

      if (itemsData.invoice_items) {
        setInvoiceItems(itemsData.invoice_items);
      }
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    }
  };

  const handleCreditNoteSuccess = () => {
    // Refresh page to show new credit note
    window.location.reload();
  };

  // Show nothing if paid or still loading role data
  if (status === "paid" || rolesLoading) return null;

  // Only show credit note button for approved invoices to admins/owners
  const showCreditNoteButton = isAdminOrOwner && status !== 'draft' && invoice;

  return (
    <div className="flex justify-end gap-2 mb-4">
      {showCreditNoteButton && (
        <Button
          variant="outline"
          className="border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold flex items-center gap-2"
          onClick={() => setCreditNoteModalOpen(true)}
        >
          <FileText className="w-5 h-5" />
          Create Credit Note
        </Button>
      )}
      
      <Button
        variant="default"
        className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2"
        onClick={() => setPaymentModalOpen(true)}
      >
        <PlusCircle className="w-5 h-5" />
        Add Payment
      </Button>

      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        totalAmount={totalAmount}
        balanceDue={balanceDue}
        defaultAmount={balanceDue}
      />

      {invoice && (
        <CreateCreditNoteModal
          isOpen={creditNoteModalOpen}
          onClose={() => setCreditNoteModalOpen(false)}
          invoice={invoice}
          invoiceItems={invoiceItems}
          onSuccess={handleCreditNoteSuccess}
        />
      )}
    </div>
  );
} 