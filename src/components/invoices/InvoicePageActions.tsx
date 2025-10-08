"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Plus, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReceivePaymentModal from "@/components/invoices/ReceivePaymentModal";

export default function InvoicePageActions() {
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/credit-notes">
          <Button
            variant="outline"
            className="font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Credit Notes
          </Button>
        </Link>
        <Button
          onClick={() => setReceivePaymentOpen(true)}
          variant="outline"
          className="font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2"
        >
          <DollarSign className="w-5 h-5" />
          Receive Payment
        </Button>
        <Link href="/dashboard/invoices/edit/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Invoice
          </Button>
        </Link>
      </div>

      <ReceivePaymentModal
        open={receivePaymentOpen}
        onOpenChange={setReceivePaymentOpen}
      />
    </>
  );
}

