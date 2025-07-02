"use client";
import React, { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChargeableSearchDropdown from "@/components/invoices/ChargeableSearchDropdown";
import type { Invoice } from "@/types/invoices";
import type { InvoiceItem } from "@/types/invoice_items";
import { format } from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDown, Pencil, X, Check, Trash2, ChevronRight, Copy } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Chargeable } from '@/types/chargeables';
import MemberSelect from '@/components/invoices/MemberSelect';
import type { UserResult } from '@/components/invoices/MemberSelect';
import { toast } from "sonner";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function InvoiceEditClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reference, setReference] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedMember, setSelectedMember] = useState<UserResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const initialInvoiceRef = useRef<Invoice | null>(null);
  const initialItemsRef = useRef<InvoiceItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const router = useRouter();
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/invoices`)
      .then((res) => res.json())
      .then((data) => {
        if (data.invoices) {
          const found = data.invoices.find((inv: { id: string }) => inv.id === id);
          setInvoice(found || null);
        } else {
          setInvoice(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load invoice");
        setLoading(false);
      });
  }, [id]);

  const fetchItems = () => {
    if (!id) return;
    setItemsLoading(true);
    fetch(`/api/invoice_items?invoice_id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.invoice_items || []);
        setItemsLoading(false);
      })
      .catch(() => {
        setItemsError("Failed to load invoice items");
        setItemsLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (invoice && invoice.user_id) {
      fetch(`/api/users?id=${invoice.user_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.users && data.users.length > 0) {
            setSelectedMember(data.users[0]);
          } else {
            setSelectedMember(null);
          }
        });
    } else {
      setSelectedMember(null);
    }
  }, [invoice]);

  useEffect(() => {
    if (invoice) {
      setReference(invoice.reference || "");
      setInvoiceDate(invoice.issue_date ? new Date(invoice.issue_date) : undefined);
      setDueDate(invoice.due_date ? new Date(invoice.due_date) : undefined);
      setNotes(invoice.notes || "");
    }
  }, [invoice]);

  // Track initial invoice and items for dirty checking
  useEffect(() => {
    if (invoice) initialInvoiceRef.current = invoice;
  }, [invoice]);
  useEffect(() => {
    initialItemsRef.current = items;
  }, [items]);

  // Dirty check for invoice fields
  useEffect(() => {
    if (!invoice) {
      setDirty(false);
      return;
    }
    const changed =
      reference !== (initialInvoiceRef.current?.reference || "") ||
      (invoiceDate && invoiceDate.toISOString().slice(0, 10) !== initialInvoiceRef.current?.issue_date) ||
      (dueDate && dueDate.toISOString().slice(0, 10) !== initialInvoiceRef.current?.due_date) ||
      (selectedMember && selectedMember.id !== initialInvoiceRef.current?.user_id) ||
      notes !== (initialInvoiceRef.current?.notes || "");
    setDirty(!!changed);
  }, [reference, invoiceDate, dueDate, selectedMember, notes, invoice]);

  const handleAddItem = (item: Chargeable, quantity: number) => {
    if (!id) return;
    setAdding(true);
    const rate_inclusive = item.rate * (1 + (invoice?.tax_rate ?? 0.15));
    const amount = item.rate * quantity;
    const tax_amount = amount * (invoice?.tax_rate ?? 0.15);
    const total_amount = rate_inclusive * quantity;
    fetch("/api/invoice_items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_id: id,
        chargeable_id: item.id,
        description: item.name,
        quantity,
        rate: item.rate,
        rate_inclusive,
        amount,
        tax_rate: invoice?.tax_rate ?? 0.15,
        tax_amount,
        total_amount,
      }),
    });
    setAdding(false);
    fetchItems();
  };

  // Save handler for all invoice fields
  const handleSave = async () => {
    if (!invoice) return;
    setSaveLoading(true);
    try {
      // Only send changed fields
      const patch: Record<string, string | number | undefined> = {};
      if (reference !== (invoice.reference || "")) patch.reference = reference;
      if (invoiceDate && invoiceDate.toISOString().slice(0, 10) !== invoice.issue_date) patch.issue_date = invoiceDate.toISOString().slice(0, 10);
      if (dueDate && dueDate.toISOString().slice(0, 10) !== invoice.due_date) patch.due_date = dueDate.toISOString().slice(0, 10);
      if (selectedMember && selectedMember.id !== invoice.user_id) patch.user_id = selectedMember.id;
      if (notes !== (invoice.notes || "")) patch.notes = notes;
      if (Object.keys(patch).length === 0) {
        setSaveLoading(false);
        setDirty(false);
        return;
      }
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to save invoice');
        setSaveLoading(false);
        return;
      }
      // Refetch invoice after save
      const data = await fetch(`/api/invoices`).then(r => r.json());
      if (data.invoices) {
        const found = data.invoices.find((inv: { id: string }) => inv.id === invoice.id);
        setInvoice(found || null);
      }
      toast.success('Invoice saved');
      setDirty(false);
    } catch {
      toast.error('Failed to save invoice');
    } finally {
      setSaveLoading(false);
    }
  };

  const startEditItem = (item: InvoiceItem) => {
    setEditingItemId(item.id);
    setEditRate(item.rate);
    setEditQuantity(item.quantity);
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
  };

  const saveEditItem = async (item: InvoiceItem) => {
    setAdding(true);
    await fetch("/api/invoice_items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        rate: editRate,
        quantity: editQuantity,
      }),
    });
    setEditingItemId(null);
    setAdding(false);
    fetchItems();
  };

  const handleApprove = async () => {
    if (!invoice) return;
    setApproveLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to approve invoice');
        setApproveLoading(false);
        return;
      }
      // Refetch invoice after approve
      const data = await fetch(`/api/invoices`).then(r => r.json());
      if (data.invoices) {
        const found = data.invoices.find((inv: { id: string }) => inv.id === invoice.id);
        setInvoice(found || null);
      }
      toast.success('Invoice approved');
      // Redirect to view page
      router.push(`/dashboard/invoices/view/${invoice.id}`);
    } catch {
      toast.error('Failed to approve invoice');
    } finally {
      setApproveLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    setDeletingItemId(itemId);
    try {
      const res = await fetch('/api/invoice_items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete item');
      } else {
        toast.success('Item deleted');
        fetchItems();
      }
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete invoice");
        setDeleting(false);
        return;
      }
      toast.success("Invoice deleted");
      setDeleteDialogOpen(false);
      router.push("/dashboard/invoices");
    } catch {
      toast.error("Failed to delete invoice");
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading invoice...</div>;
  if (error || !invoice) return <div className="p-10 text-center text-destructive">Invoice not found.</div>;

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
  const total = items.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-4xl mx-auto">
      {/* Top Action/Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
            <a href="/dashboard/invoices" className="text-indigo-600 hover:underline text-base">&larr; Back to Invoices</a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-6 py-2 rounded-md bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition disabled:opacity-50 cursor-pointer"
            onClick={handleSave}
            disabled={!dirty || saveLoading}
          >
            {saveLoading ? 'Saving...' : 'Save'}
          </button>
          {invoice.status === 'draft' && (
            <button
              type="button"
              className="px-6 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              onClick={handleApprove}
              disabled={approveLoading}
            >
              {approveLoading ? 'Approving...' : 'Approve'}
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Options
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                <span className="text-red-600">Delete Invoice</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Card className="p-8 shadow-md">
        {/* Card Header: Invoice Number and Status Badge */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Invoice Number</label>
            <div className="font-bold text-2xl tracking-wider">{invoice.invoice_number}</div>
          </div>
          {invoice?.status && (
            <Badge
              className="large"
              variant={(() => {
                switch (invoice.status) {
                  case 'draft': return 'secondary';
                  case 'pending': return 'secondary';
                  case 'paid': return 'default';
                  case 'overdue': return 'destructive';
                  case 'cancelled': return 'outline';
                  case 'refunded': return 'outline';
                  default: return 'outline';
                }
              })()}
            >
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Bill To</label>
            <MemberSelect value={selectedMember} onSelect={setSelectedMember} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full max-w-xs justify-start text-left font-normal focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={invoiceDate}
                  onSelect={setInvoiceDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Reference</label>
            <Input
              placeholder="Enter reference (optional)"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full max-w-xs justify-start text-left font-normal focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="w-full border rounded-lg overflow-hidden mb-4">
          <div className="grid grid-cols-6 gap-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
            <div className="col-span-2 pl-2">Item</div>
            <div className="col-span-1 text-right">Rate</div>
            <div className="col-span-1 flex justify-center">Qty</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1 flex justify-center">Edit</div>
          </div>
          {itemsLoading ? (
            <div className="h-8 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : itemsError ? (
            <div className="h-8 flex items-center justify-center text-red-500 text-sm">{itemsError}</div>
          ) : items.length === 0 ? (
            <div className="h-8 flex items-center justify-center text-gray-400 text-sm">No items yet</div>
          ) : (
            items.map((item: InvoiceItem, idx: number) => (
              <div key={item.id + idx} className="grid grid-cols-6 gap-0 px-4 py-3 border-t text-sm items-center min-h-[55px]">
                <div className="col-span-2 flex items-center pl-2">
                  <span className="font-medium text-gray-900 truncate">{item.description}</span>
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  {editingItemId === item.id ? (
                    <input
                      type="number"
                      className="border rounded px-2 py-1 text-right w-16 focus:ring-2 focus:ring-blue-500"
                      style={{ appearance: 'textfield', MozAppearance: 'textfield' }}
                      value={editRate}
                      min={0}
                      step={0.01}
                      onChange={e => setEditRate(Number(e.target.value))}
                    />
                  ) : (
                    <span>${item.rate_inclusive.toFixed(2)}</span>
                  )}
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  {editingItemId === item.id ? (
                    <input
                      type="number"
                      className="border rounded px-1 py-1 text-center w-10 focus:ring-2 focus:ring-blue-500 ml-2"
                      style={{ appearance: 'textfield', MozAppearance: 'textfield', width: '2.4rem' }}
                      value={editQuantity}
                      min={1}
                      step={1}
                      onChange={e => setEditQuantity(Number(e.target.value))}
                    />
                  ) : (
                    <span>{item.quantity}</span>
                  )}
                </div>
                <div className="col-span-1 flex items-center justify-end font-semibold">
                  <span>${item.total_amount.toFixed(2)}</span>
                </div>
                <div className="col-span-1 flex items-center justify-center gap-2">
                  {editingItemId === item.id ? (
                    <>
                      <button
                        type="button"
                        className="text-green-600 hover:text-green-800"
                        onClick={() => saveEditItem(item)}
                        disabled={adding}
                        aria-label="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={cancelEditItem}
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => startEditItem(item)}
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        aria-label="Delete"
                        onClick={() => deleteItem(item.id)}
                        disabled={deletingItemId === item.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <ChargeableSearchDropdown
          onAdd={handleAddItem}
          taxRate={invoice.tax_rate ?? 0.15}
        />
        {adding && <div className="text-center text-muted-foreground py-4">Adding item...</div>}
        <div className="mt-10 flex flex-col items-end gap-1">
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Subtotal (excl. Tax):</div>
            <div className="font-medium">${subtotal.toFixed(2)}</div>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Tax ({Math.round((invoice.tax_rate ?? 0.15) * 100)}%):</div>
            <div className="font-medium">${totalTax.toFixed(2)}</div>
          </div>
          <div className="flex gap-8 text-lg mt-2">
            <div className="font-bold">Total:</div>
            <div className="font-bold text-green-600">${total.toFixed(2)}</div>
          </div>
        </div>
        {saveLoading && <div className="text-center text-muted-foreground py-2">Saving...</div>}
      </Card>
      {/* Notes Section */}
      <div className="bg-card rounded-xl border border-border shadow-md w-full">
        <Collapsible defaultOpen={false} className="w-full">
          <CollapsibleTrigger className="flex items-center gap-2 px-4 py-2 font-semibold text-base bg-muted/80 rounded-t-xl hover:bg-muted transition w-full group border-b border-border">
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
            <span>Notes</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-0">
            <div className="p-8">
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-border bg-background/80 px-4 py-3 text-sm text-foreground shadow-inner focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[2px] outline-none align-top resize-vertical transition placeholder:text-muted-foreground"
                placeholder="Add notes for this invoice..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              No
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 transition"
              onClick={handleDeleteInvoice}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 