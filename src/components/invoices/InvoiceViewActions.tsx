"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import RecordPaymentModal from "@/components/invoices/RecordPaymentModal";

export default function InvoiceViewActions({
  invoiceId,
  invoiceNumber,
  totalAmount,
  balanceDue,
  status,
}: {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  balanceDue: number;
  status: string;
}) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  if (status === "paid") return null;

  return (
    <div className="flex justify-end mb-4">
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
    </div>
  );
} 