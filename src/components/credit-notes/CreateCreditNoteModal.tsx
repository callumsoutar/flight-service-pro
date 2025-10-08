"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Invoice } from "@/types/invoices";
import type { InvoiceItem } from "@/types/invoice_items";

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  onSuccess: () => void;
}

interface CreditNoteItemForm {
  id: string;
  original_invoice_item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export default function CreateCreditNoteModal({
  isOpen,
  onClose,
  invoice,
  invoiceItems,
  onSuccess,
}: CreateCreditNoteModalProps) {
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<CreditNoteItemForm[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Initialize with empty item when modal opens
  React.useEffect(() => {
    if (isOpen && items.length === 0) {
      addNewItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const addNewItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price: 0,
        tax_rate: invoice.tax_rate || 0.15,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error("Credit note must have at least one item");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof CreditNoteItemForm, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const copyFromInvoiceItem = (itemId: string, invoiceItemId: string) => {
    const invoiceItem = invoiceItems.find((i) => i.id === invoiceItemId);
    if (!invoiceItem) return;

    updateItem(itemId, "original_invoice_item_id", invoiceItemId);
    updateItem(itemId, "description", invoiceItem.description);
    updateItem(itemId, "quantity", invoiceItem.quantity);
    updateItem(itemId, "unit_price", invoiceItem.unit_price);
    updateItem(itemId, "tax_rate", invoiceItem.tax_rate ?? 0);
  };

  const calculateItemTotal = (item: CreditNoteItemForm) => {
    const amount = item.quantity * item.unit_price;
    const tax = amount * item.tax_rate;
    return amount + tax;
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (!reason.trim()) {
      toast.error("Please provide a reason for the credit note");
      return;
    }

    if (items.length === 0) {
      toast.error("Credit note must have at least one item");
      return;
    }

    for (const item of items) {
      if (!item.description.trim()) {
        toast.error("All items must have a description");
        return;
      }
      if (item.quantity <= 0) {
        toast.error("All items must have a quantity greater than zero");
        return;
      }
      if (item.unit_price < 0) {
        toast.error("Item prices cannot be negative");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_invoice_id: invoice.id,
          user_id: invoice.user_id,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          items: items.map((item) => ({
            original_invoice_item_id: item.original_invoice_item_id,
            description: item.description.trim(),
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create credit note");
      }

      toast.success(`Credit note ${data.credit_note.credit_note_number} created successfully`);
      
      // Reset form
      setReason("");
      setNotes("");
      setItems([]);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Create credit note error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create credit note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      setNotes("");
      setItems([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Credit Note</DialogTitle>
          <DialogDescription>
            Correct invoice {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Credit Note <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Incorrect amount charged, duplicate charge, service not provided"
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context or internal information"
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addNewItem}
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Item {index + 1}</span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>

                {/* Copy from invoice item */}
                {invoiceItems.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Copy from invoice</Label>
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          copyFromInvoiceItem(item.id, value);
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Select item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceItems.map((invItem) => (
                          <SelectItem key={invItem.id} value={invItem.id}>
                            {invItem.description} - ${invItem.unit_price} x {invItem.quantity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-sm">Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Description of credit"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Quantity *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Unit Price *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price || ""}
                        onChange={(e) => updateItem(item.id, "unit_price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                        disabled={isSubmitting}
                        className="pl-9"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Tax Rate</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(item.id, "tax_rate", parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        {(item.tax_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Line Total</Label>
                    <div className="flex items-center h-10 px-3 border rounded-md bg-gray-100">
                      <span className="font-semibold">
                        ${calculateItemTotal(item).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center gap-4 pt-4 border-t">
            <span className="text-base font-semibold">Credit Note Total:</span>
            <span className="text-2xl font-bold text-green-600">
              ${calculateGrandTotal().toFixed(2)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Credit Note"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

