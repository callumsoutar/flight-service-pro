"use client";
import React, { useState, useCallback, useMemo } from "react";
import CheckInDetails from "@/components/bookings/CheckInDetails";
import type { Booking } from "@/types/bookings";
import type { Chargeable } from "@/types/chargeables";
import type { InvoiceItem } from "@/types/invoice_items";
import { Pencil, PlaneLanding, AirVent, Grid, Trash2, Loader2, CheckCircle2, MessageSquare, X } from "lucide-react";
import ChargeableSearchDropdown from "@/components/invoices/ChargeableSearchDropdown";
import { useRouter } from "next/navigation";
import { 
  useBookingCheckIn, 
  useInvoiceData, 
  useInvoiceItems, 
  useFlightTypes, 
  useAircraftData, 
  useInstructorRate 
} from "@/hooks/use-booking-check-in";
import { useInvoiceItems as useInvoiceItemsManagement } from "@/hooks/use-invoice-items";

interface BookingCheckInClientProps {
  booking: Booking;
  instructors: { id: string; name: string }[];
}

export default function BookingCheckInClient({ booking, instructors }: BookingCheckInClientProps) {
  const router = useRouter();
  
  // Get flight log data (should be the first/only flight log for this booking)
  const flightLog = booking.flight_logs?.[0];
  
  
  // Custom hooks for optimized data management
  const { data: invoice, isLoading: invoiceLoading } = useInvoiceData(booking.id);
  const { data: invoiceItems = [] } = useInvoiceItems(invoice?.id || null);
  const { isLoading: flightTypesLoading } = useFlightTypes();
  // Use checked_out_aircraft_id from flight_log instead of booking
  const { data: aircraft } = useAircraftData(flightLog?.checked_out_aircraft_id || null);
  // Use checked_out_instructor_id from flight_log instead of booking instructor_id
  const { data: instructorRate, isLoading: instructorRateLoading } = useInstructorRate(flightLog?.checked_out_instructor_id || null, booking.flight_type_id);
  
  // Check-in operations
  const {
    calculateCharges,
    completeBooking,
    isCalculating,
    isCompleting,
    calculateError,
    completeError,
    completeSuccess,
    optimisticData,
    lastCalculateResult,
    resetCalculate,
    resetComplete,
  } = useBookingCheckIn(booking.id);
  
  // Invoice item management
  const {
    addItem,
    deleteItem,
    isAdding,
    isUpdating,
    isDeleting,
    addError,
  } = useInvoiceItemsManagement(invoice?.id || null);

  const [chargeableTab, setChargeableTab] = useState<'landing_fee' | 'airways_fees' | 'other'>('landing_fee');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
    flightTimeHobbs: number;
    flightTimeTach: number;
  }): Promise<void> => {
    // Prevent calculation if instructor rate is loading or missing
    if (instructorRateLoading) {
      return;
    }
    if (!instructorRate) {
      return;
    }

    // Reset previous errors
    resetCalculate();
    
    // Use the optimized calculateCharges mutation
    calculateCharges({
      bookingId: booking.id,
      chargeTime: details.chargeTime,
      aircraftRate: details.aircraftRate,
      instructorRate: details.instructorRate,
      chargingBy: details.chargingBy,
      selectedInstructor: details.selectedInstructor,
      selectedFlightType: details.selectedFlightType,
      hobbsStart: details.hobbsStart,
      hobbsEnd: details.hobbsEnd,
      tachStart: details.tachStart,
      tachEnd: details.tachEnd,
      flightTimeHobbs: details.flightTimeHobbs,
      flightTimeTach: details.flightTimeTach,
    });
  }, [booking.id, instructorRate, instructorRateLoading, calculateCharges, resetCalculate]);

  const handleAddItem = useCallback(async (item: Chargeable, quantity: number): Promise<void> => {
    if (!invoice) return;
    
    // Use the optimized addItem mutation
    addItem({
      invoiceId: invoice.id,
      item,
      quantity,
    });
  }, [invoice, addItem]);

  // Helper for invoice totals
  const { subtotal, totalTax, total } = useMemo(() => {
    const subtotal = invoiceItems.reduce((sum: number, item: InvoiceItem) => sum + (item.amount || 0), 0);
    const totalTax = invoiceItems.reduce((sum: number, item: InvoiceItem) => sum + (item.tax_amount || 0), 0);
    const total = invoiceItems.reduce((sum: number, item: InvoiceItem) => sum + (item.line_total || 0), 0);
    return { subtotal, totalTax, total };
  }, [invoiceItems]);

  // Confirm and Save handler
  const handleConfirmAndSave = useCallback(async (): Promise<void> => {
    if (!invoice || invoiceItems.length === 0) return;
    
    resetComplete();
    
    // Use the optimized completeBooking mutation
    completeBooking({
      bookingId: booking.id,
      invoiceItems: invoiceItems.map((item: InvoiceItem) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        rate_inclusive: item.rate_inclusive,
        amount: item.amount,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        description: item.description,
        chargeable_id: item.chargeable_id,
      })),
    });
  }, [invoice, invoiceItems, booking.id, completeBooking, resetComplete]);

  // Show success modal when booking is completed
  React.useEffect(() => {
    if (completeSuccess) {
      setShowSuccessModal(true);
    }
  }, [completeSuccess]);

  // Use optimistic data if available, otherwise use actual data
  // Smart merging: if we have optimistic data from calculate charges, but the actual invoiceItems 
  // has more items (from adding chargeables), merge them
  const mergedInvoiceItems = useMemo(() => {
    if (optimisticData?.invoiceItems && invoiceItems.length > optimisticData.invoiceItems.length) {
      // User has added chargeables after calculating charges
      // Merge the optimistic calculate data with the new chargeable items
      const calculateItemIds = new Set(optimisticData.invoiceItems.map(item => item.id));
      const additionalItems = invoiceItems.filter((item: InvoiceItem) => !calculateItemIds.has(item.id));
      return [...optimisticData.invoiceItems, ...additionalItems];
    }
    return optimisticData?.invoiceItems || lastCalculateResult?.invoiceItems || invoiceItems;
  }, [optimisticData?.invoiceItems, lastCalculateResult?.invoiceItems, invoiceItems]);

  const displayInvoiceItems = mergedInvoiceItems;
  
  // Recalculate totals if we merged additional items
  const displayTotals = useMemo(() => {
    if (mergedInvoiceItems === invoiceItems || (optimisticData?.invoiceItems && mergedInvoiceItems.length === optimisticData.invoiceItems.length)) {
      // No merging happened, use existing totals
      return optimisticData?.totals || lastCalculateResult?.totals || { subtotal, totalTax, total };
    } else {
      // We merged additional items, recalculate totals
      const mergedSubtotal = mergedInvoiceItems.reduce((sum: number, item: InvoiceItem) => sum + (item.amount || 0), 0);
      const mergedTotalTax = mergedInvoiceItems.reduce((sum: number, item: InvoiceItem) => sum + (item.tax_amount || 0), 0);
      const mergedTotal = mergedInvoiceItems.reduce((sum: number, item: InvoiceItem) => sum + (item.line_total || 0), 0);
      return { subtotal: mergedSubtotal, totalTax: mergedTotalTax, total: mergedTotal };
    }
  }, [mergedInvoiceItems, optimisticData?.totals, lastCalculateResult?.totals, subtotal, totalTax, total, invoiceItems, optimisticData?.invoiceItems]);
  
  const displayInvoice = optimisticData?.invoice || lastCalculateResult?.invoice || invoice;

  // Show loading state only for critical data
  const isLoading = invoiceLoading && flightTypesLoading;
  
  if (isLoading) {
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

  return (
    <div className="flex flex-row w-full max-w-6xl mx-auto gap-4">
      {/* Left column (Check-In Details) */}
      <div className="flex-[2] flex flex-col gap-6 min-w-0" style={{ flexBasis: '40%' }}>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          {aircraft?.registration && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Checked-Out Aircraft:</span>
              <span className="text-base font-bold text-blue-700">{aircraft.registration}</span>
            </div>
          )}
          <CheckInDetails 
            aircraftId={flightLog?.checked_out_aircraft_id || undefined}
            selectedFlightTypeId={booking?.flight_type_id}
            instructorId={flightLog?.checked_out_instructor_id || undefined}
            instructors={instructors}
            instructorRate={instructorRate ? { rate: Number(instructorRate.rate), currency: instructorRate.currency } : undefined}
            instructorRateLoading={instructorRateLoading}
            onCalculateCharges={handleCalculateCharges}
            bookingStartHobbs={flightLog?.hobbs_start}
            bookingStartTacho={flightLog?.tach_start}
            initialEndHobbs={flightLog?.hobbs_end}
            initialEndTacho={flightLog?.tach_end}
            checkedOutInstructor={flightLog?.checked_out_instructor}
          />
        </div>
      </div>
      {/* Right column (Invoice) */}
      <div className="flex-[3] flex flex-col gap-6 min-w-0" style={{ flexBasis: '60%' }}>
        <div className="bg-white border rounded-2xl p-6 shadow-lg">
          <h2 className="font-bold text-lg mb-4">Invoice</h2>
          {/* Invoice Table */}
          {isCalculating && (
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating charges...</span>
            </div>
          )}
          {calculateError && (
            <div className="text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
              {calculateError}
            </div>
          )}
          {addError && (
            <div className="text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
              {addError}
            </div>
          )}
          {displayInvoice && displayInvoiceItems.length > 0 ? (
            <div className="w-full border rounded-lg overflow-hidden mb-4">
              <div className="grid grid-cols-6 gap-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
                <div className="col-span-2 pl-2">Item</div>
                <div className="col-span-1 flex justify-center">Qty</div>
                <div className="col-span-1 text-right">Rate</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1 flex justify-center">Actions</div>
              </div>
              {displayInvoiceItems.map((item: InvoiceItem, idx: number) => (
                <div key={item.id + idx} className="grid grid-cols-6 gap-0 px-4 py-1.5 border-t text-sm items-center min-h-[40px]">
                  <div className="col-span-2 flex items-center pl-2">
                    <span className="font-medium text-gray-900 truncate">{item.description}</span>
                    {item.id?.startsWith('optimistic') && (
                      <span className="ml-2 text-xs text-blue-500 opacity-75">●</span>
                    )}
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
                    <button 
                      className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors disabled:opacity-50" 
                      title="Edit"
                      disabled={item.id?.startsWith('optimistic') || isUpdating}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors disabled:opacity-50" 
                      title="Delete"
                      disabled={item.id?.startsWith('optimistic') || isDeleting}
                      onClick={() => item.id && !item.id.startsWith('optimistic') && deleteItem({ itemId: item.id, invoiceId: displayInvoice.id })}
                    >
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
          {flightLog?.flight_time !== undefined && flightLog?.flight_time !== null && (
            <div className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Flight Time (charged):</span> {flightLog.flight_time} hours
            </div>
          )}
          {/* Add Extra Charges directly below the table */}
          {displayInvoice && (
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
                  taxRate={displayInvoice.tax_rate ?? 0.15}
                  category={chargeableTab}
                />
              </div>
              {isAdding && (
                <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Adding item...
                </div>
              )}
            </div>
          )}
          {/* Invoice Footer */}
          <div className="border-t pt-4 mt-4 flex flex-col items-end gap-1">
            <div className="flex gap-8 text-sm">
              <div className="text-muted-foreground">Subtotal (excl. Tax):</div>
              <div className="font-medium">${displayTotals.subtotal.toFixed(2)}</div>
            </div>
            <div className="flex gap-8 text-sm">
              <div className="text-muted-foreground">Tax ({Math.round((displayInvoice?.tax_rate ?? 0.15) * 100)}%):</div>
              <div className="font-medium">${displayTotals.totalTax.toFixed(2)}</div>
            </div>
            <div className="flex gap-8 text-lg mt-2">
              <div className="font-bold">Total:</div>
              <div className="font-bold text-green-600">${displayTotals.total.toFixed(2)}</div>
            </div>
          </div>
          {/* Confirm and Save Button */}
          <div className="mt-6 flex flex-col items-end gap-2">
            {calculateError && <div className="text-red-600 text-sm">{calculateError}</div>}
            {completeError && <div className="text-red-600 text-sm">{completeError}</div>}
            {completeSuccess && (
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Booking completed successfully!
              </div>
            )}
            <button
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold bg-indigo-600 text-white shadow hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed`}
              onClick={handleConfirmAndSave}
              disabled={isCompleting || displayInvoiceItems.length === 0 || !displayInvoice}
              type="button"
            >
              {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save and Confirm
            </button>
          </div>
        </div>
      </div>
      
      {/* Success Modal with Debrief Option */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
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
                  onClick={() => {
                    if (displayInvoice?.id) {
                      router.push(`/dashboard/invoices/view/${displayInvoice.id}`);
                    } else {
                      setShowSuccessModal(false);
                    }
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 