"use client";
import React, { useState, useEffect, useCallback } from "react";
import CheckInDetails from "@/components/bookings/CheckInDetails";
import type { Booking } from "@/types/bookings";
import type { Invoice } from "@/types/invoices";
import type { Chargeable } from "@/types/chargeables";
import type { InvoiceItem } from "@/types/invoice_items";
import type { InstructorFlightTypeRate } from "@/types/instructor_flight_type_rates";
import type { FlightType } from "@/types/flight_types";
import { Pencil, PlaneLanding, AirVent, Grid, Trash2, Loader2, CheckCircle2, MessageSquare, X } from "lucide-react";
import ChargeableSearchDropdown from "@/components/invoices/ChargeableSearchDropdown";
import { useRouter } from "next/navigation";

interface BookingCheckInClientProps {
  booking: Booking;
  instructors: { id: string; name: string }[];
  orgId: string;
}



// Hook to get instructor rate for a booking
function useInstructorRate(orgId: string, instructorUserId: string | null, flightTypeId: string | null) {
  const [instructorRate, setInstructorRate] = useState<InstructorFlightTypeRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInstructorRate(null);
    if (!orgId || !instructorUserId || !flightTypeId) {
      setLoading(false);
      return;
    }
    try {
      // Step 1: Get instructor record by user_id
      const instructorUrl = `/api/instructors?user_id=${instructorUserId}`;
      const instructorRes = await fetch(instructorUrl);
      const instructorData = await instructorRes.json();
      if (!instructorRes.ok) {
        setError("No instructor record found for this user");
        setLoading(false);
        return;
      }
      const instructor = instructorData.instructor;
      if (!instructor || !instructor.id) {
        setError("No instructor record found for this user");
        setLoading(false);
        return;
      }
      // Step 2: Get instructor rate by instructor_id and flight_type_id
      const rateUrl = `/api/instructor_flight_type_rates?organization_id=${orgId}&instructor_id=${instructor.id}&flight_type_id=${flightTypeId}`;
      const rateRes = await fetch(rateUrl);
      const rateData = await rateRes.json();
      if (!rateRes.ok) {
        setError("No instructor rate found for this instructor and flight type");
        setLoading(false);
        return;
      }
      setInstructorRate(rateData.rate || null);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch instructor rate");
      setLoading(false);
      console.error("Error in useInstructorRate hook:", err);
    }
  }, [orgId, instructorUserId, flightTypeId]);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  return { instructorRate, loading, error };
}

export default function BookingCheckInClient({ booking, instructors, orgId }: BookingCheckInClientProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [chargeableTab, setChargeableTab] = useState<'landing_fee' | 'airways_fees' | 'other'>('landing_fee');
  // Registration state for checked out aircraft (for display only)
  const [checkedOutAircraftReg, setCheckedOutAircraftReg] = useState<string | null>(null);
  const { instructorRate, loading: instructorRateLoading, error: instructorRateError } = useInstructorRate(orgId, booking.instructor_id, booking.flight_type_id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const router = useRouter();
  // Track current form values from CheckInDetails
  const [currentFormValues, setCurrentFormValues] = useState<{
    endHobbs: string;
    endTacho: string;
  }>({ endHobbs: "", endTacho: "" });

  // Fetch all flight types for the org on mount
  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/flight_types?organization_id=${orgId}`)
      .then(res => res.json())
      .then(data => {
        if (data.flight_types) setFlightTypes(data.flight_types);
      });
  }, [orgId]);

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

  useEffect(() => {
    const fetchCheckedOutAircraft = async () => {
      if (booking.checked_out_aircraft_id) {
        try {
          const res = await fetch(`/api/aircraft?id=${booking.checked_out_aircraft_id}`);
          const data = await res.json();
          if (data.aircraft) {
            setCheckedOutAircraftReg(data.aircraft.registration || null);
          } else {
            setCheckedOutAircraftReg(null);
          }
        } catch {
          setCheckedOutAircraftReg(null);
        }
      } else {
        setCheckedOutAircraftReg(null);
      }
    };
    fetchCheckedOutAircraft();
  }, [booking.checked_out_aircraft_id]);

  const handleCalculateCharges = async (details: {
    chargeTime: number;
    aircraftRate: number;
    instructorRate: number;
    chargingBy: 'hobbs' | 'tacho' | null;
    selectedInstructor: string;
    selectedFlightType: string;
    hobbsStart?: number;
    hobbsEnd?: number;
    tachStart?: number;
    tachEnd?: number;
  }): Promise<void> => {
    // Prevent calculation if instructor rate is loading or missing
    if (instructorRateLoading) {
      setInvoiceError("Instructor rate is still loading. Please wait.");
      return;
    }
    if (!instructorRate) {
      setInvoiceError(instructorRateError || "No instructor rate found for this instructor.");
      console.error("No instructor rate found:", { instructorRateError, instructorRate });
      return;
    }
    setInvoiceLoading(true);
    setInvoiceError(null);
    let chargeTime = details.chargeTime;
    console.debug("handleCalculateCharges called with:", details);
    console.debug("Using instructorRate:", instructorRate);

    // 1. PATCH booking if there are meter values to update
    const patchBody: Record<string, unknown> = { id: booking.id };
    if (typeof details.hobbsStart === 'number') patchBody.hobbs_start = details.hobbsStart;
    if (typeof details.hobbsEnd === 'number') patchBody.hobbs_end = details.hobbsEnd;
    if (typeof details.tachStart === 'number') patchBody.tach_start = details.tachStart;
    if (typeof details.tachEnd === 'number') patchBody.tach_end = details.tachEnd;

    if (Object.keys(patchBody).length > 1) { // id + at least one value
      try {
        const patchRes = await fetch('/api/bookings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
        const patchData = await patchRes.json();
        if (patchRes.ok && patchData.booking) {
          chargeTime = patchData.booking.flight_time ?? chargeTime;
        } else if (patchData.error && patchData.error.includes('no valid fields to update')) {
          // Ignore and proceed
        } else {
          setInvoiceError(patchData.error || 'Failed to update booking');
          setInvoiceLoading(false);
          return;
        }
      } catch {
        setInvoiceError('Failed to update booking');
        setInvoiceLoading(false);
        return;
      }
    }

    try {
      // 2. Create invoice (if not already created)
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
      // 3. Fetch current invoice items
      const itemsRes = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
      const itemsData = await itemsRes.json();
      const currentItems: InvoiceItem[] = itemsData.invoice_items || [];
      // 4. Prepare line item descriptions
      // Look up flight type name
      const flightTypeName = flightTypes.find(ft => ft.id === details.selectedFlightType)?.name || 'Flight';
      // Look up instructor name
      const instructorName = instructors.find(i => i.id === details.selectedInstructor)?.name || 'Instructor';
      // Look up aircraft registration
      const aircraftReg = checkedOutAircraftReg || booking?.aircraft?.registration || 'Aircraft';
      // Compose aircraft line item description
      const aircraftDesc = `${flightTypeName} - ${aircraftReg}`;
      // Compose instructor line item description
      const instructorDesc = `${flightTypeName} - ${instructorName}`;
      // 5. Aircraft line item
      const aircraftAmount = chargeTime * details.aircraftRate;
      const aircraftRate = details.aircraftRate;
      const aircraftQty = chargeTime;
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
      // 6. Instructor line item
      const instructorAmount = chargeTime * Number(instructorRate.rate);
      const instructorRateValue = Number(instructorRate.rate);
      const instructorQty = chargeTime;
      const existingInstructor = currentItems.find(item => item.description === instructorDesc);
      if (existingInstructor) {
        // PATCH
        await fetch("/api/invoice_items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingInstructor.id,
            quantity: instructorQty,
            rate: instructorRateValue,
            rate_inclusive: instructorRateValue,
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
            rate: instructorRateValue,
            rate_inclusive: instructorRateValue, // For now, assume no tax
            amount: instructorAmount,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: instructorAmount,
          }),
        });
      }
      // 7. Refetch invoice items
      const updatedItemsRes = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
      const updatedItemsData = await updatedItemsRes.json();
      setInvoiceItems(updatedItemsData.invoice_items || []);
      setInvoiceLoading(false);
    } catch (err: unknown) {
      setInvoiceError((err instanceof Error ? err.message : "Failed to calculate charges"));
      setInvoiceLoading(false);
    }
  };

  const handleAddItem = async (item: Chargeable, quantity: number): Promise<void> => {
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

  // Handler for form values changes from CheckInDetails
  const handleFormValuesChange = useCallback((values: { endHobbs: string; endTacho: string }): void => {
    setCurrentFormValues(values);
  }, []);

  // Helper for invoice totals
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = invoiceItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const total = invoiceItems.reduce((sum, item) => sum + item.total_amount, 0);

  // Confirm and Save handler
  const handleConfirmAndSave = async (): Promise<void> => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      // 1. PATCH all invoice items (persist any edits)
      if (invoice && invoiceItems.length > 0) {
        await Promise.all(
          invoiceItems.map(async (item) => {
            // Only PATCH if item has an id (should always be true)
            if (item.id) {
              await fetch("/api/invoice_items", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: item.id,
                  quantity: item.quantity,
                  rate: item.rate,
                  rate_inclusive: item.rate_inclusive,
                  amount: item.amount,
                  tax_rate: item.tax_rate,
                  tax_amount: item.tax_amount,
                  total_amount: item.total_amount,
                  description: item.description,
                  chargeable_id: item.chargeable_id ?? undefined,
                }),
              });
            }
          })
        );
      }
      // 2. PATCH aircraft current_hobbs and current_tach if end values are present
      if (booking.checked_out_aircraft_id) {
        const patchBody: Record<string, unknown> = {};
        // Use current form values if they are valid numbers
        if (currentFormValues.endHobbs && !isNaN(parseFloat(currentFormValues.endHobbs))) {
          patchBody.current_hobbs = parseFloat(currentFormValues.endHobbs);
        }
        if (currentFormValues.endTacho && !isNaN(parseFloat(currentFormValues.endTacho))) {
          patchBody.current_tach = parseFloat(currentFormValues.endTacho);
        }
        if (Object.keys(patchBody).length > 0) {
          await fetch(`/api/aircraft?id=${booking.checked_out_aircraft_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patchBody),
          });
        }
      }
      // 3. PATCH invoice to ensure booking_id is set and update status to 'pending'
      if (invoice && booking?.id) {
        const invoicePatchBody: Record<string, unknown> = { status: "pending" };
        if (invoice.booking_id !== booking.id) {
          invoicePatchBody.booking_id = booking.id;
        }
        await fetch(`/api/invoices`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: invoice.id, ...invoicePatchBody }),
        });
      }
      // 4. PATCH booking status to 'complete'
      await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, status: "complete" }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      // Show success modal for debrief option
      setShowSuccessModal(true);
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-row w-full max-w-6xl mx-auto gap-4">
      {/* Left column (Check-In Details) */}
      <div className="flex-[2] flex flex-col gap-6 min-w-0" style={{ flexBasis: '40%' }}>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          {checkedOutAircraftReg && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Checked-Out Aircraft:</span>
              <span className="text-base font-bold text-blue-700">{checkedOutAircraftReg}</span>
            </div>
          )}
          <CheckInDetails 
            aircraftId={booking?.aircraft_id}
            organizationId={orgId}
            selectedFlightTypeId={booking?.flight_type_id}
            instructorId={booking?.instructor_id}
            instructors={instructors}
            instructorRate={instructorRate ? { rate: Number(instructorRate.rate), currency: instructorRate.currency } : undefined}
            instructorRateLoading={instructorRateLoading}
            onCalculateCharges={handleCalculateCharges}
            bookingStartHobbs={booking?.hobbs_start}
            bookingStartTacho={booking?.tach_start}
            initialEndHobbs={booking?.hobbs_end}
            initialEndTacho={booking?.tach_end}
            onFormValuesChange={handleFormValuesChange}
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
          {/* Show current flight time */}
          {booking.flight_time !== undefined && booking.flight_time !== null && (
            <div className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Flight Time (charged):</span> {booking.flight_time} hours
            </div>
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
          {/* Confirm and Save Button */}
          <div className="mt-6 flex flex-col items-end gap-2">
            {saveError && <div className="text-destructive text-sm">{saveError}</div>}
            {saveSuccess && (
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Saved successfully
              </div>
            )}
            <button
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold bg-indigo-600 text-white shadow hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed`}
              onClick={handleConfirmAndSave}
              disabled={saving || invoiceLoading || invoiceItems.length === 0}
              type="button"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirm and Save
            </button>
          </div>
        </div>
      </div>
      
      {/* Success Modal with Debrief Option */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Check-In Complete!</h3>
                  <p className="text-sm text-gray-600">Flight charges have been saved successfully.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Ready for Debrief?</h4>
                    <p className="text-sm text-blue-700">
                      Complete the student&apos;s debrief to finalize this flight session.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/dashboard/bookings/debrief/${booking.id}`)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Start Debrief
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 