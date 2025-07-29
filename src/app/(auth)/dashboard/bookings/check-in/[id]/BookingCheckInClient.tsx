"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
}

// Hook to get instructor rate for a booking
function useInstructorRate(instructorId: string | null, flightTypeId: string | null) {
  const [instructorRate, setInstructorRate] = useState<InstructorFlightTypeRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = useCallback(async () => {
    if (!instructorId || !flightTypeId) {
      setInstructorRate(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const rateUrl = `/api/instructor_flight_type_rates?instructor_id=${instructorId}&flight_type_id=${flightTypeId}`;
      const rateRes = await fetch(rateUrl);
      
      if (!rateRes.ok) {
        throw new Error("No instructor rate found for this instructor and flight type");
      }
      
      const rateData = await rateRes.json();
      setInstructorRate(rateData.rate || null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch instructor rate";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [instructorId, flightTypeId]);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  return { instructorRate, loading, error };
}

// Custom hook for data fetching
function useCheckInData(booking: Booking) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [checkedOutAircraftReg, setCheckedOutAircraftReg] = useState<string | null>(null);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized fetch function to avoid unnecessary re-renders
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Parallel API calls for better performance
      const [invoiceRes, flightTypesRes, aircraftRes] = await Promise.allSettled([
        fetch(`/api/invoices?booking_id=${booking.id}`),
        fetch('/api/flight_types'),
        booking.checked_out_aircraft_id 
          ? fetch(`/api/aircraft?id=${booking.checked_out_aircraft_id}`)
          : Promise.resolve(null)
      ]);

      // Handle invoice data
      if (invoiceRes.status === 'fulfilled') {
        const invoiceData = await invoiceRes.value.json();
        const found = invoiceData.invoices?.[0] || null;
        setInvoice(found);
        
        if (found) {
          // Fetch invoice items if invoice exists
          const itemsRes = await fetch(`/api/invoice_items?invoice_id=${found.id}`);
          const itemsData = await itemsRes.json();
          setInvoiceItems(itemsData.invoice_items || []);
        } else {
          setInvoiceItems([]);
        }
      }

      // Handle flight types
      if (flightTypesRes.status === 'fulfilled') {
        const flightTypesData = await flightTypesRes.value.json();
        setFlightTypes(flightTypesData.flight_types || []);
      }

      // Handle aircraft registration
      if (aircraftRes.status === 'fulfilled' && aircraftRes.value) {
        const aircraftData = await aircraftRes.value.json();
        setCheckedOutAircraftReg(aircraftData.aircraft?.registration || null);
      } else {
        setCheckedOutAircraftReg(null);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [booking.id, booking.checked_out_aircraft_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    invoice,
    setInvoice,
    invoiceItems,
    setInvoiceItems,
    checkedOutAircraftReg,
    flightTypes,
    loading,
    error,
    refetch: fetchData
  };
}

export default function BookingCheckInClient({ booking, instructors }: BookingCheckInClientProps) {
  const router = useRouter();
  const { instructorRate, loading: instructorRateLoading, error: instructorRateError } = useInstructorRate(booking.instructor_id, booking.flight_type_id);
  
  const {
    invoice,
    setInvoice,
    invoiceItems,
    setInvoiceItems,
    checkedOutAircraftReg,
    flightTypes,
    loading: dataLoading,
    error: dataError,
    refetch
  } = useCheckInData(booking);

  const [chargeableTab, setChargeableTab] = useState<'landing_fee' | 'airways_fees' | 'other'>('landing_fee');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Track current form values from CheckInDetails
  const [currentFormValues, setCurrentFormValues] = useState<{
    endHobbs: string;
    endTacho: string;
  }>({ endHobbs: "", endTacho: "" });

  const handleCalculateCharges = useCallback(async (details: {
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
      setSaveError("Instructor rate is still loading. Please wait.");
      return;
    }
    if (!instructorRate) {
      setSaveError(instructorRateError || "No instructor rate found for this instructor.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    
    try {
      let chargeTime = details.chargeTime;

      // 1. PATCH booking if there are meter values to update
      const patchBody: Record<string, unknown> = { id: booking.id };
      if (typeof details.hobbsStart === 'number') patchBody.hobbs_start = details.hobbsStart;
      if (typeof details.hobbsEnd === 'number') patchBody.hobbs_end = details.hobbsEnd;
      if (typeof details.tachStart === 'number') patchBody.tach_start = details.tachStart;
      if (typeof details.tachEnd === 'number') patchBody.tach_end = details.tachEnd;

      if (Object.keys(patchBody).length > 1) {
        const patchRes = await fetch('/api/bookings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
        
        if (patchRes.ok) {
          const patchData = await patchRes.json();
          chargeTime = patchData.booking?.flight_time ?? chargeTime;
        } else {
          const patchData = await patchRes.json();
          if (!patchData.error?.includes('no valid fields to update')) {
            throw new Error(patchData.error || 'Failed to update booking');
          }
        }
      }

      // 2. Create invoice (if not already created)
      let invoiceId = invoice?.id;
      if (!invoiceId) {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: booking?.user_id,
            booking_id: booking?.id,
            status: "draft",
          }),
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create invoice");
        }
        
        const data = await res.json();
        invoiceId = data.id;
        
        // Update local state
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
      const selectedFlightTypeName = flightTypes.find(ft => ft.id === details.selectedFlightType)?.name || 'Flight';
      const selectedInstructorName = instructors.find(i => i.id === details.selectedInstructor)?.name || 'Instructor';
      const selectedAircraftReg = checkedOutAircraftReg || booking?.aircraft?.registration || 'Aircraft';
      
      const aircraftDesc = `${selectedFlightTypeName} - ${selectedAircraftReg}`;
      const instructorDesc = `${selectedFlightTypeName} - ${selectedInstructorName}`;

      // 5. Create/update line items in parallel
      const aircraftQty = chargeTime;
      const instructorQty = chargeTime;
      const instructorRateValue = Number(instructorRate.rate);

      const existingAircraft = currentItems.find(item => item.description === aircraftDesc);
      const existingInstructor = currentItems.find(item => item.description === instructorDesc);

      await Promise.all([
        // Aircraft line item
        existingAircraft 
          ? fetch("/api/invoice_items", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: existingAircraft.id,
                quantity: aircraftQty,
                unit_price: details.aircraftRate,
                description: aircraftDesc,
              }),
            })
          : fetch("/api/invoice_items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoice_id: invoiceId,
                description: aircraftDesc,
                quantity: aircraftQty,
                unit_price: details.aircraftRate,
              }),
            }),
        
        // Instructor line item
        existingInstructor
          ? fetch("/api/invoice_items", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: existingInstructor.id,
                quantity: instructorQty,
                unit_price: instructorRateValue,
                description: instructorDesc,
              }),
            })
          : fetch("/api/invoice_items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoice_id: invoiceId,
                description: instructorDesc,
                quantity: instructorQty,
                unit_price: instructorRateValue,
              }),
            })
      ]);

      // 6. Refetch invoice items
      const updatedItemsRes = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
      const updatedItemsData = await updatedItemsRes.json();
      setInvoiceItems(updatedItemsData.invoice_items || []);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to calculate charges";
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [booking, instructorRate, instructorRateLoading, instructorRateError, invoice, flightTypes, instructors, checkedOutAircraftReg, setInvoice, setInvoiceItems]);

  const handleAddItem = useCallback(async (item: Chargeable, quantity: number): Promise<void> => {
    if (!invoice) return;
    
    setSaving(true);
    setSaveError(null);
    
    try {
      await fetch("/api/invoice_items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.id,
          chargeable_id: item.id,
          description: item.name,
          quantity,
          unit_price: item.rate,
        }),
      });
      
      // Refetch items
      const updatedItemsRes = await fetch(`/api/invoice_items?invoice_id=${invoice.id}`);
      const updatedItemsData = await updatedItemsRes.json();
      setInvoiceItems(updatedItemsData.invoice_items || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add item";
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [invoice, setInvoiceItems]);

  // Handler for form values changes from CheckInDetails
  const handleFormValuesChange = useCallback((values: { endHobbs: string; endTacho: string }): void => {
    setCurrentFormValues(values);
  }, []);

  // Helper for invoice totals
  const { subtotal, totalTax, total } = useMemo(() => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = invoiceItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const total = invoiceItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
    return { subtotal, totalTax, total };
  }, [invoiceItems]);

  // Confirm and Save handler
  const handleConfirmAndSave = useCallback(async (): Promise<void> => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      // 1. PATCH all invoice items (persist any edits)
      if (invoice && invoiceItems.length > 0) {
        await Promise.all(
          invoiceItems.map(async (item) => {
            if (item.id) {
              await fetch("/api/invoice_items", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: item.id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  rate_inclusive: item.rate_inclusive,
                  amount: item.amount,
                  tax_rate: item.tax_rate,
                  tax_amount: item.tax_amount,
                  line_total: item.line_total,
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
        
        // Only update if we have valid numeric values
        if (currentFormValues.endHobbs && !isNaN(parseFloat(currentFormValues.endHobbs))) {
          const endHobbsValue = parseFloat(currentFormValues.endHobbs);
          if (endHobbsValue >= 0) {
            patchBody.current_hobbs = endHobbsValue;
          }
        }
        
        if (currentFormValues.endTacho && !isNaN(parseFloat(currentFormValues.endTacho))) {
          const endTachoValue = parseFloat(currentFormValues.endTacho);
          if (endTachoValue >= 0) {
            patchBody.current_tach = endTachoValue;
          }
        }
        
        if (Object.keys(patchBody).length > 0) {
          const aircraftRes = await fetch(`/api/aircraft`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: booking.checked_out_aircraft_id,
              ...patchBody
            }),
          });
          
          if (!aircraftRes.ok) {
            const aircraftError = await aircraftRes.json();
            throw new Error(`Failed to update aircraft meters: ${aircraftError.error || 'Unknown error'}`);
          }
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
      setShowSuccessModal(true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save changes. Please try again.";
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [invoice, invoiceItems, booking, currentFormValues]);

  // Show loading state
  if (dataLoading) {
    return (
      <div className="flex flex-row w-full max-w-6xl mx-auto gap-4">
        <div className="flex-[2] flex flex-col gap-6 min-w-0" style={{ flexBasis: '40%' }}>
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          </div>
        </div>
        <div className="flex-[3] flex flex-col gap-6 min-w-0" style={{ flexBasis: '60%' }}>
          <div className="bg-white border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (dataError) {
    return (
      <div className="flex flex-row w-full max-w-6xl mx-auto gap-4">
        <div className="flex-[2] flex flex-col gap-6 min-w-0" style={{ flexBasis: '40%' }}>
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Failed to load data</div>
              <button 
                onClick={refetch}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {saving ? (
            <div className="text-muted-foreground">Calculating...</div>
          ) : saveError ? (
            <div className="text-destructive">{saveError}</div>
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
                    <span>${(item.rate_inclusive || item.unit_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end font-semibold">
                    <span>${(item.line_total || 0).toFixed(2)}</span>
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
              disabled={saving || invoiceItems.length === 0}
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