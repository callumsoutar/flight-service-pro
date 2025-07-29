"use client";
import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import Link from "next/link";
import ChargeableSearchDropdown from "@/components/invoices/ChargeableSearchDropdown";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { User } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { InvoiceItem } from '@/types/invoice_items';
import { useRouter } from 'next/navigation';

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
        <CommandInput
          placeholder="Click to select member"
          value={value ? `${value.first_name} ${value.last_name}` : search}
          onValueChange={val => {
            setSearch(val);
            onSelect(null);
          }}
          className="text-base bg-white border-0 shadow-none px-3 py-2 rounded-t-lg rounded-b-none focus:ring-0 focus:outline-none cursor-pointer"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
          readOnly={!!value}
        />
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

export default function NewInvoiceForm() {
  // State for editable fields
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date("2025-06-30"));
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date("2025-07-30"));
  const [reference, setReference] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const addItemBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedMember, setSelectedMember] = useState<UserResult | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const taxRate = 0.15;
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  // Click outside handler
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        addItemBtnRef.current &&
        !addItemBtnRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  // Click outside handler for popover
  useEffect(() => {
    if (!showAddItem) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        addItemBtnRef.current &&
        !addItemBtnRef.current.contains(e.target as Node)
      ) {
        setShowAddItem(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAddItem]);

  useEffect(() => {
    if (selectedMember && !creating) {
      setCreating(true);
      
      fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedMember.id,
          status: 'draft',
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            router.replace(`/dashboard/invoices/edit/${data.id}`);
          } else {
            alert('Failed to create invoice.');
            setCreating(false);
          }
        })
        .catch(() => {
          alert('Failed to create invoice.');
          setCreating(false);
        });
    }
  }, [selectedMember, creating, router]);

  // Calculate totals
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = invoiceItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
  const total = invoiceItems.reduce((sum, item) => sum + (item.line_total || 0), 0);

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
            className="px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            Save Draft
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Send Invoice
          </button>
        </div>
      </div>
      <Card className="p-8 shadow-md">
        {/* Invoice Number full width */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-1 block">Invoice Number</label>
          <div className="font-bold text-2xl tracking-wider">New Invoice</div>
        </div>
        {/* 2x2 grid for Member | Invoice Date and Reference | Due Date */}
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
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}</Button>
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
        {/* Invoice Items Table Headers */}
        <div className="w-full border rounded-lg overflow-hidden mb-4">
          <div className="grid grid-cols-6 gap-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
            <div className="col-span-3">Item</div>
            <div className="col-span-1 text-right">Rate</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-1 text-right">Total</div>
          </div>
          {invoiceItems.length === 0 ? (
            <div className="h-8 flex items-center justify-center text-gray-400 text-sm">No items yet</div>
          ) : (
            invoiceItems.map((item, idx) => (
              <div key={item.id + idx} className="grid grid-cols-6 gap-0 px-4 py-2 border-t text-sm items-center">
                <div className="col-span-3">
                  <div className="font-medium text-gray-900">{item.description}</div>
                </div>
                <div className="col-span-1 text-right">${(item.rate_inclusive || item.unit_price || 0).toFixed(2)}</div>
                <div className="col-span-1 text-right">{item.quantity}</div>
                <div className="col-span-1 text-right font-semibold">${(item.line_total || 0).toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
        <ChargeableSearchDropdown
          onAdd={(item, quantity) => {
            // Add item to invoiceItems state
            const rate_inclusive = item.rate * (1 + taxRate);
            const amount = item.rate * quantity;
            const tax_amount = amount * taxRate;
            const total_amount = rate_inclusive * quantity;
            setInvoiceItems((prev) => [
              ...prev,
              {
                id: item.id + '-' + Date.now(), // temp unique id
                invoice_id: '', // not set yet
                chargeable_id: item.id,
                description: item.name,
                quantity,
                unit_price: item.rate,
                rate_inclusive,
                amount,
                tax_rate: taxRate,
                tax_amount,
                line_total: total_amount,
                notes: null,
                created_at: '',
                updated_at: '',
              },
            ]);
          }}
          taxRate={taxRate}
        />
        {/* Totals Section */}
        <div className="mt-10 flex flex-col items-end gap-1">
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Subtotal (excl. Tax):</div>
            <div className="font-medium">${subtotal.toFixed(2)}</div>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="text-muted-foreground">Tax (15%):</div>
            <div className="font-medium">${totalTax.toFixed(2)}</div>
          </div>
          <div className="flex gap-8 text-lg mt-2">
            <div className="font-bold">Total:</div>
            <div className="font-bold text-green-600">${total.toFixed(2)}</div>
          </div>
        </div>
        {creating && <div className="text-center text-muted-foreground py-8">Creating draft invoice...</div>}
      </Card>
    </div>
  );
} 