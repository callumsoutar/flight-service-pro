"use client";
import React, { useState, useEffect } from "react";
import CheckInDetails from "@/components/bookings/CheckInDetails";
import type { Booking } from "@/types/bookings";
import type { Invoice } from "@/types/invoices";
import type { Chargeable } from "@/types/chargeables";
import type { InvoiceItem } from "@/types/invoice_items";
import { Pencil, PlaneLanding, AirVent, Grid, Trash2 } from "lucide-react";
import ChargeableSearchDropdown from "@/components/invoices/ChargeableSearchDropdown";

interface BookingCheckInClientProps {
  booking: Booking;
  instructors: { id: string; name: string }[];
  orgId: string;
}

export default function BookingCheckInClient({ booking, instructors, orgId }: BookingCheckInClientProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [chargeableTab, setChargeableTab] = useState<'landing_fee' | 'airways_fees' | 'other'>('landing_fee');

  // Fetch invoice and items on mount (for refresh)
  useEffect(() => {
    const fetchInvoiceAndItems = async () => {
      setInvoiceLoading(true);
      setInvoiceError(null);
      try {
        // Fetch invoice for this booking only
        const res = await fetch(`/api/invoices?booking_id=${booking.id}`);
        const data = await res.json();
        const found = data.invoices && data.invoices.length > 0 ? data.invoices[0] : null;
        if (found) {
          setInvoice(found);
          // Fetch items
          const itemsRes = await fetch(`/api/invoice_items?invoice_id=${found.id}`);
          const itemsData = await itemsRes.json();
          setInvoiceItems(itemsData.invoice_items || []);
        } else {
          setInvoice(null);
          setInvoiceItems([]);
        }
        setInvoiceLoading(false);
      } catch {
        setInvoiceError("Failed to fetch invoice");
        setInvoiceLoading(false);
      }
    };
    fetchInvoiceAndItems();
  }, [booking.id]);

  const handleCalculateCharges = async (details: {
    chargeTime: number;
    aircraftRate: number;
    instructorRate: number;
    chargingBy: 'hobbs' | 'tacho' | null;
    selectedInstructor: string;
    selectedFlightType: string;
  }) => {
    setInvoiceLoading(true);
    setInvoiceError(null);
    try {
      // 1. Create invoice (if not already created)
      let invoiceId = invoice?.id;
      if (!invoiceId) {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_id: orgId,
            user_id: booking?.user_id,
            booking_id: booking?.id,
            status: "draft",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.id) throw new Error(data.error || "Failed to create invoice");
        invoiceId = data.id;
        // Optionally fetch the invoice object
        const invoiceRes = await fetch(`/api/invoices?booking_id=${booking.id}`);
        const invoiceData = await invoiceRes.json();
        const found = invoiceData.invoices?.[0] || null;
        setInvoice(found);
      }
      // 2. Fetch current invoice items
      const itemsRes = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
      const itemsData = await itemsRes.json();
      const currentItems: InvoiceItem[] = itemsData.invoice_items || [];
      // 3. Prepare line item descriptions
      const aircraftDesc = `Aircraft (${details.chargingBy?.toUpperCase()} time)`;
      const instructorDesc = `Instructor (${details.chargingBy?.toUpperCase()} time)`;
      // 4. Aircraft line item
      const aircraftAmount = details.chargeTime * details.aircraftRate;
      const aircraftRate = details.aircraftRate;
      const aircraftQty = details.chargeTime;
      const existingAircraft = currentItems.find(item => item.description === aircraftDesc);
      if (existingAircraft) {
        // PATCH
        await fetch("/api/invoice_items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingAircraft.id,
            quantity: aircraftQty,
            rate: aircraftRate,
            rate_inclusive: aircraftRate,
            amount: aircraftAmount,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: aircraftAmount,
            description: aircraftDesc,
          }),
        });
      } else {
        // POST
        await fetch("/api/invoice_items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: invoiceId,
            description: aircraftDesc,
            quantity: aircraftQty,
            rate: aircraftRate,
            rate_inclusive: aircraftRate, // For now, assume no tax
            amount: aircraftAmount,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: aircraftAmount,
          }),
        });
      }
      // 5. Instructor line item
      const instructorAmount = details.chargeTime * details.instructorRate;
      const instructorRate = details.instructorRate;
      const instructorQty = details.chargeTime;
      const existingInstructor = currentItems.find(item => item.description === instructorDesc);
      if (existingInstructor) {
        // PATCH
        await fetch("/api/invoice_items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingInstructor.id,
            quantity: instructorQty,
            rate: instructorRate,
            rate_inclusive: instructorRate,
            amount: instructorAmount,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: instructorAmount,
            description: instructorDesc,
          }),
        });
      } else {
        // POST
        await fetch("/api/invoice_items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: invoiceId,
            description: instructorDesc,
            quantity: instructorQty,
            rate: instructorRate,
            rate_inclusive: instructorRate, // For now, assume no tax
            amount: instructorAmount,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: instructorAmount,
          }),
        });
      }
      // 6. Refetch invoice items
      const updatedItemsRes = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
      const updatedItemsData = await updatedItemsRes.json();
      setInvoiceItems(updatedItemsData.invoice_items || []);
      setInvoiceLoading(false);
    } catch (err: unknown) {
      setInvoiceError((err instanceof Error ? err.message : "Failed to calculate charges"));
      setInvoiceLoading(false);
    }
  };

  const handleAddItem = async (item: Chargeable, quantity: number) => {
    if (!invoice) return;
    setInvoiceLoading(true);
    const rate_inclusive = item.rate * (1 + (invoice.tax_rate ?? 0.15));
    const amount = item.rate * quantity;
    const tax_amount = amount * (invoice.tax_rate ?? 0.15);
    const total_amount = rate_inclusive * quantity;
    await fetch("/api/invoice_items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_id: invoice.id,
        chargeable_id: item.id,
        description: item.name,
        quantity,
        rate: item.rate,
        rate_inclusive,
        amount,
        tax_rate: invoice.tax_rate ?? 0.15,
        tax_amount,
        total_amount,
      }),
    });
    // Refetch items
    const updatedItemsRes = await fetch(`/api/invoice_items?invoice_id=${invoice.id}`);
    const updatedItemsData = await updatedItemsRes.json();
    setInvoiceItems(updatedItemsData.invoice_items || []);
    setInvoiceLoading(false);
  };

  // Helper for invoice totals
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = invoiceItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const total = invoiceItems.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <div className="flex flex-row w-full max-w-6xl mx-auto gap-4">
      {/* Left column (Check-In Details) */}
      <div className="flex-[2] flex flex-col gap-6 min-w-0" style={{ flexBasis: '40%' }}>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <CheckInDetails 
            aircraftId={booking?.aircraft_id}
            organizationId={orgId}
            selectedFlightTypeId={booking?.flight_type_id}
            instructorId={booking?.checked_out_instructor_id}
            instructors={instructors}
            onCalculateCharges={handleCalculateCharges}
          />
        </div>
      </div>
      {/* Right column (Invoice) */}
      <div className="flex-[3] flex flex-col gap-6 min-w-0" style={{ flexBasis: '60%' }}>
        <div className="bg-white border rounded-2xl p-6 shadow-lg">
          <h2 className="font-bold text-lg mb-4">Invoice</h2>
          {/* Invoice Table */}
          {invoiceLoading ? (
            <div className="text-muted-foreground">Calculating...</div>
          ) : invoiceError ? (
            <div className="text-destructive">{invoiceError}</div>
          ) : invoice && invoiceItems.length > 0 ? (
            <div className="w-full border rounded-lg overflow-hidden mb-4">
              <div className="grid grid-cols-6 gap-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
                <div className="col-span-2 pl-2">Item</div>
                <div className="col-span-1 flex justify-center">Qty</div>
                <div className="col-span-1 text-right">Rate</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1 flex justify-center">Actions</div>
              </div>
              {invoiceItems.map((item, idx) => (
                <div key={item.id + idx} className="grid grid-cols-6 gap-0 px-4 py-1.5 border-t text-sm items-center min-h-[40px]">
                  <div className="col-span-2 flex items-center pl-2">
                    <span className="font-medium text-gray-900 truncate">{item.description}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center text-xs">
                    <span>{item.quantity}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end text-xs">
                    <span>${item.rate_inclusive.toFixed(2)}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end font-semibold">
                    <span>${item.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-2">
                    <button className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="text-red-500 hover:text-red-700 p-1 rounded transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No invoice yet. Click Calculate Flight Charges.</div>
          )}
          {/* Add Extra Charges directly below the table */}
          {invoice && (
            <div className="pt-2 pb-4">
              <hr className="border-t border-gray-200 mt-6 mb-4" />
              <div className="flex gap-3 mt-4 mb-2">
                <button
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border
                    ${chargeableTab === 'landing_fee'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                      : 'bg-gray-100 text-muted-foreground border-transparent hover:bg-gray-200'}
                  `}
                  onClick={() => setChargeableTab('landing_fee')}
                >
                  <PlaneLanding className="w-4 h-4" />
                  Landing Fees
                </button>
                <button
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border
                    ${chargeableTab === 'airways_fees'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                      : 'bg-gray-100 text-muted-foreground border-transparent hover:bg-gray-200'}
                  `}
                  onClick={() => setChargeableTab('airways_fees')}
                >
                  <AirVent className="w-4 h-4" />
                  Airways Fees
                </button>
                <button
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border
                    ${chargeableTab === 'other'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                      : 'bg-gray-100 text-muted-foreground border-transparent hover:bg-gray-200'}
                  `}
                  onClick={() => setChargeableTab('other')}
                >
                  <Grid className="w-4 h-4" />
                  Other
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-4 ml-1">
                Select a category to quickly find the right chargeable.
              </p>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Add Extra Charges</h3>
              <div className="mt-2">
                <ChargeableSearchDropdown
                  onAdd={handleAddItem}
                  taxRate={invoice.tax_rate ?? 0.15}
                  category={chargeableTab}
                />
              </div>
            </div>
          )}
          {/* Invoice Footer */}
          <div className="border-t pt-4 mt-4 flex flex-col items-end gap-1">
            <div className="flex gap-8 text-sm">
              <div className="text-muted-foreground">Subtotal (excl. Tax):</div>
              <div className="font-medium">${subtotal.toFixed(2)}</div>
            </div>
            <div className="flex gap-8 text-sm">
              <div className="text-muted-foreground">Tax ({Math.round((invoice?.tax_rate ?? 0.15) * 100)}%):</div>
              <div className="font-medium">${totalTax.toFixed(2)}</div>
            </div>
            <div className="flex gap-8 text-lg mt-2">
              <div className="font-bold">Total:</div>
              <div className="font-bold text-green-600">${total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 