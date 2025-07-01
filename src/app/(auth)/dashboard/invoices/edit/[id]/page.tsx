"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChargeableSearchDropdown from "@/components/invoices/ChargeableSearchDropdown";
import type { Invoice } from "@/types/invoices";
import type { InvoiceItem } from "@/types/invoice_items";
import { format } from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Chargeable } from '@/types/chargeables';

type UserResult = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
};

type MemberSelectProps = {
  onSelect: (user: UserResult | null) => void;
  value: UserResult | null;
};

function MemberSelect({ onSelect, value }: MemberSelectProps) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focused || value) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    fetch(`/api/users?q=${encodeURIComponent(search)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data.users || []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("Failed to load users");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, focused, value]);

  return (
    <div className="relative w-full">
      <Command className="w-full border border-gray-200 bg-white rounded-lg">
        {value ? (
          <div className="flex items-center px-3 py-2">
            <User className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="font-medium text-gray-900">{value.first_name} {value.last_name}</span>
            <span className="ml-2 text-xs text-gray-500">{value.email}</span>
            {value.role && <span className="ml-2 text-xs text-gray-400">({value.role})</span>}
          </div>
        ) : (
          <CommandInput
            placeholder="Click to select member"
            value={search}
            onValueChange={val => {
              setSearch(val);
              onSelect(null);
            }}
            className="text-base bg-white border-0 shadow-none px-3 py-2 rounded-t-lg rounded-b-none focus:ring-0 focus:outline-none cursor-pointer"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 100)}
            readOnly={!!value}
          />
        )}
        {focused && !value && (
          <div className="absolute left-0 right-0 z-10" style={{ top: '100%' }}>
            <CommandList className="bg-white border-x border-b border-gray-200 rounded-b-lg shadow-md rounded-t-none">
              {loading ? (
                <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
              ) : error ? (
                <div className="px-4 py-3 text-sm text-red-500">{error}</div>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={`${u.first_name} ${u.last_name}`}
                    onSelect={() => {
                      onSelect(u);
                      setFocused(false);
                    }}
                    className="flex items-center px-2 py-2 rounded-md hover:bg-indigo-50 transition text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2 text-indigo-500" />
                    <span className="font-medium text-gray-900">{u.first_name} {u.last_name}</span>
                    <span className="ml-2 text-xs text-gray-500">{u.email}</span>
                    {u.role && <span className="ml-2 text-xs text-gray-400">({u.role})</span>}
                  </CommandItem>
                ))
              ) : (
                <CommandEmpty>No members found</CommandEmpty>
              )}
            </CommandList>
          </div>
        )}
      </Command>
      {value && (
        <button
          type="button"
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
          onClick={() => onSelect(null)}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
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
      (selectedMember && selectedMember.id !== initialInvoiceRef.current?.user_id);
    setDirty(!!changed);
  }, [reference, invoiceDate, dueDate, selectedMember, invoice]);

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
    await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference,
        issue_date: invoiceDate ? invoiceDate.toISOString().slice(0, 10) : undefined,
        due_date: dueDate ? dueDate.toISOString().slice(0, 10) : undefined,
        user_id: selectedMember?.id,
      }),
    });
    // TODO: Save invoice items if changed
    // Refetch invoice after save
    fetch(`/api/invoices`)
      .then((res) => res.json())
      .then((data) => {
        if (data.invoices) {
          const found = data.invoices.find((inv: { id: string }) => inv.id === invoice.id);
          setInvoice(found || null);
        }
      });
    setSaveLoading(false);
    setDirty(false);
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
        <div className="flex items-center gap-2">
          <Link href="/dashboard/invoices" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
            &larr; Back to Invoices
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Options
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Duplicate Invoice</DropdownMenuItem>
              <DropdownMenuItem>Delete Invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className="px-6 py-2 rounded-md bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition disabled:opacity-50"
            onClick={handleSave}
            disabled={!dirty || saveLoading}
          >
            {saveLoading ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="px-6 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Send Invoice
          </button>
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
            <div className="col-span-3">Item</div>
            <div className="col-span-1 text-right">Rate</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-1 text-right">Total</div>
          </div>
          {itemsLoading ? (
            <div className="h-8 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : itemsError ? (
            <div className="h-8 flex items-center justify-center text-red-500 text-sm">{itemsError}</div>
          ) : items.length === 0 ? (
            <div className="h-8 flex items-center justify-center text-gray-400 text-sm">No items yet</div>
          ) : (
            items.map((item: InvoiceItem, idx: number) => (
              <div key={item.id + idx} className="grid grid-cols-6 gap-0 px-4 py-2 border-t text-sm items-center">
                <div className="col-span-3">
                  <div className="font-medium text-gray-900">{item.description}</div>
                </div>
                <div className="col-span-1 text-right">${item.rate_inclusive.toFixed(2)}</div>
                <div className="col-span-1 text-right">{item.quantity}</div>
                <div className="col-span-1 text-right font-semibold">${item.total_amount.toFixed(2)}</div>
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
    </div>
  );
} 