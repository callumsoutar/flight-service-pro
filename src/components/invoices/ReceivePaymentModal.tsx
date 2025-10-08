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
import { BadgeCheck, CreditCard, DollarSign, Landmark, Receipt, Wallet, CheckCircle, User } from "lucide-react";
import { roundToTwoDecimals, formatCurrencyDisplay } from "@/lib/utils";
import { useRouter } from "next/navigation";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";

const paymentMethods = [
  { value: "cash", label: "Cash", icon: DollarSign },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "debit_card", label: "Debit Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Landmark },
  { value: "check", label: "Check", icon: Receipt },
  { value: "online_payment", label: "Online Payment", icon: Wallet },
  { value: "other", label: "Other", icon: Wallet },
];

export default function ReceivePaymentModal({
  open,
  onOpenChange,
  defaultAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
}) {
  const [selectedUser, setSelectedUser] = React.useState<UserResult | null>(null);
  const [amount, setAmount] = React.useState(roundToTwoDecimals(defaultAmount || 0));
  const [method, setMethod] = React.useState<string>("");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [paymentNumber, setPaymentNumber] = React.useState<string | null>(null);
  const router = useRouter();

  const validatePaymentAmount = (amount: number) => {
    if (amount <= 0) {
      return "Payment amount must be greater than zero.";
    }
    return null;
  };

  const resetForm = () => {
    setSelectedUser(null);
    setAmount(roundToTwoDecimals(defaultAmount || 0));
    setMethod("");
    setReference("");
    setNotes("");
    setError(null);
    setSuccess(false);
    setPaymentNumber(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (!selectedUser) {
      setError("Please select a member.");
      return;
    }
    
    const validationError = validatePaymentAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (!method) {
      setError("Payment method is required.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/payments/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          amount: amount.toFixed(2),
          payment_method: method,
          payment_reference: reference || null,
          notes: notes || null,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to process credit payment.");
        setLoading(false);
        return;
      }
      
      const result = await res.json();
      
      // Store payment number for success message
      setPaymentNumber(result.payment_number);
      
      // Show success state
      setSuccess(true);
      setLoading(false);
      
      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        router.refresh();
      }, 2000); // Extended from 1500ms to allow reading payment number
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to process credit payment.");
      } else {
        setError("Failed to process credit payment.");
      }
      setLoading(false);
    }
  }

  // Reset form when modal is closed
  React.useEffect(() => {
    if (!open) {
      // Small delay to avoid visual glitch during close animation
      setTimeout(resetForm, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-lg flex flex-col justify-between rounded-2xl p-0 overflow-visible"
      >
        <DialogHeader className="px-6 pt-6 pb-2 border-b flex flex-row items-center gap-3 relative">
          <span className="bg-green-100 text-green-600 rounded-full p-2">
            <BadgeCheck className="w-6 h-6" />
          </span>
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold">Receive Payment</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Apply credit to a member&apos;s account
            </DialogDescription>
          </div>
        </DialogHeader>
        
        {success ? (
          // Success state
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="bg-green-100 text-green-600 rounded-full p-4 mb-4">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-green-600 mb-2">Payment Received!</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Credit payment of ${formatCurrencyDisplay(amount)} has been applied to {selectedUser?.first_name} {selectedUser?.last_name}&apos;s account.
            </p>
            {/* Display payment reference number */}
            {paymentNumber && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-green-200 rounded-lg">
                <Receipt className="w-4 h-4 text-green-600" />
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">Payment Reference</div>
                  <div className="font-mono font-bold text-green-700">{paymentNumber}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Form state
          <>
            {/* Member selection */}
            <div className="px-6 pt-4 pb-2 bg-muted/40 border-b">
              <label className="block text-sm font-medium mb-2">
                Select Member <span className="text-destructive">*</span>
              </label>
              <MemberSelect
                value={selectedUser}
                onSelect={setSelectedUser}
                disabled={loading}
              />
              {selectedUser && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{selectedUser.email}</span>
                </div>
              )}
            </div>
            
            {/* Form fields */}
            <form className="flex flex-col gap-3 px-6 py-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Amount <span className="text-destructive">*</span>
                </label>
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
                    disabled={loading}
                    style={{ MozAppearance: 'textfield' }}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Method <span className="text-destructive">*</span>
                </label>
                <Select value={method} onValueChange={setMethod} required disabled={loading}>
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
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Input
                  placeholder="Additional payment details or notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className="text-destructive text-sm mb-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}
              
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-4 mt-4 px-0 pb-0 pt-0">
                <DialogClose asChild>
                  <Button 
                    variant="outline" 
                    type="button" 
                    className="flex-1 cursor-pointer" 
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold cursor-pointer" 
                  disabled={loading || !selectedUser}
                >
                  {loading ? 'Processing...' : 'Receive Payment'}
                </Button>
              </DialogFooter>
            </form>
            
            {/* Payment summary */}
            {selectedUser && amount > 0 && (
              <div className="px-6 py-4 flex items-center gap-4 border-t bg-muted/40">
                <div className="flex-1">
                  <div className="text-sm font-medium">Credit Amount:</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${formatCurrencyDisplay(amount)}
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{selectedUser.first_name} {selectedUser.last_name}</span>
                  </div>
                  <div className="text-xs">
                    This will add credit to their account
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

