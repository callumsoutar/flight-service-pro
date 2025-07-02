"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { BadgeCheck, CreditCard, Banknote, DollarSign, Landmark, Receipt, Wallet, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const paymentMethods = [
  { value: "cash", label: "Cash", icon: DollarSign },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Landmark },
  { value: "direct_debit", label: "Direct Debit", icon: Banknote },
  { value: "cheque", label: "Cheque", icon: Receipt },
  { value: "other", label: "Other", icon: Wallet },
];

export default function RecordPaymentModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  totalAmount,
  balanceDue,
  defaultAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  balanceDue: number;
  defaultAmount?: number;
}) {
  const [amount, setAmount] = React.useState(defaultAmount || balanceDue);
  const [method, setMethod] = React.useState<string>("");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const isFullyPaid = amount >= balanceDue;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amount || amount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }
    if (!method) {
      setError("Payment method is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: amount.toFixed(2),
          payment_method: method,
          payment_reference: reference || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to record payment.");
        setLoading(false);
        return;
      }
      // Reset form and close modal
      setAmount(defaultAmount || balanceDue);
      setMethod("");
      setReference("");
      setNotes("");
      setLoading(false);
      onOpenChange(false);
      // Refresh the page to update payment history and invoice fields
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to record payment.");
      } else {
        setError("Failed to record payment.");
      }
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[66vh] w-full max-w-lg flex flex-col justify-between rounded-2xl p-0 overflow-hidden"
        style={{ minHeight: 480 }}
      >
        <DialogHeader className="px-6 pt-6 pb-2 border-b flex flex-row items-center gap-3 relative">
          <span className="bg-green-100 text-green-600 rounded-full p-2">
            <BadgeCheck className="w-6 h-6" />
          </span>
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold">Record Payment</DialogTitle>
            <DialogDescription className="text-sm mt-1">Record a payment for this invoice</DialogDescription>
          </div>
        </DialogHeader>
        {/* Invoice summary */}
        <div className="px-6 pt-4 pb-2 bg-muted/40 flex flex-row justify-between items-center text-sm border-b">
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground">Invoice:</div>
            <div className="font-semibold">{invoiceNumber}</div>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <div className="text-muted-foreground">Total Amount:</div>
            <div className="font-semibold">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-muted-foreground mt-1">Remaining Balance:</div>
            <div className="font-semibold text-green-600">${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        {/* Form fields */}
        <form className="flex-1 flex flex-col gap-3 px-6 py-5 overflow-y-auto" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Amount <span className="text-destructive">*</span></label>
            <div className="relative flex items-center">
              <span className="pointer-events-none select-none absolute left-3 text-gray-400 text-lg">$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="pl-8 pr-3 py-2 text-lg font-semibold h-11"
                required
                style={{ MozAppearance: 'textfield' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method <span className="text-destructive">*</span></label>
            <Select value={method} onValueChange={setMethod} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select method..." />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(pm => (
                  <SelectItem key={pm.value} value={pm.value} className="flex items-center gap-2">
                    <pm.icon className="w-4 h-4 mr-2 inline-block" />
                    {pm.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reference Number</label>
            <Input
              placeholder="Transaction ID, Check Number, etc."
              value={reference}
              onChange={e => setReference(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Input
              placeholder="Additional payment details or notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          {error && <div className="text-destructive text-sm mb-2">{error}</div>}
          <DialogFooter className="flex flex-row gap-2 px-6 pb-8 pt-2 bg-background border-t mt-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="flex-1 cursor-pointer" disabled={loading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold cursor-pointer" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
        {/* Payment summary */}
        <div className="px-6 py-4 flex items-center gap-4 border-t bg-muted/40">
          <div className="flex-1">
            <div className="text-sm font-medium">Payment Amount:</div>
            <div className={cn("text-2xl font-bold", isFullyPaid ? "text-green-600" : "text-foreground")}>${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          {isFullyPaid && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="w-5 h-5" />
              This will mark the invoice as fully paid
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 