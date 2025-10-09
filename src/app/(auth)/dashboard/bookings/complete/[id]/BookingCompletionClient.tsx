"use client";
import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBookingCompletion } from "@/hooks/use-booking-completion";
import { useOrganizationTaxRate } from "@/hooks/use-tax-rate";
import { InvoiceCalculations } from "@/lib/invoice-calculations";
import MeterReadingCard from "@/components/bookings/MeterReadingCard";
import InvoicePreviewCard from "@/components/bookings/InvoicePreviewCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Booking } from "@/types/bookings";
import type { Aircraft } from "@/types/aircraft";
import type { Chargeable } from "@/types/chargeables";
import type { Invoice } from "@/types/invoices";
import type { InvoiceItem as DatabaseInvoiceItem } from "@/types/invoice_items";
import type { MeterReadings } from "@/hooks/use-booking-completion";

interface BookingCompletionClientProps {
  booking: Booking;
  aircraft: Aircraft;
  flightTypes: Array<{ id: string; name: string; instruction_type?: string }>;
  instructors: Array<{ id: string; name: string }>;
  aircraftRate?: number;
  instructorRate?: number;
  chargingBy: 'hobbs' | 'tacho' | null;
  existingInvoice?: Invoice;
  existingInvoiceItems?: DatabaseInvoiceItem[];
}

export default function BookingCompletionClient({
  booking,
  aircraft,
  flightTypes,
  instructors,
  aircraftRate,
  instructorRate,
  chargingBy,
  existingInvoice,
  existingInvoiceItems = [],
}: BookingCompletionClientProps) {
  const router = useRouter();
  const { taxRate } = useOrganizationTaxRate();
  const [currentMeterReadings, setCurrentMeterReadings] = useState<MeterReadings | null>(null);

  const {
    calculateCharges,
    completeBooking,
    addInvoiceItem,
    updateInvoiceItem,
    deleteInvoiceItem,
    initializeWithExistingData,
    isCalculating,
    isCompleting,
    completeSuccess,
    localData,
    calculateError,
    completeError,
    completeWarning,
    resetComplete,
  } = useBookingCompletion(booking.id);

  const flightLog = booking.flight_logs?.[0];
  const isDualFlight = booking.flight_type?.instruction_type === 'dual';

  // Initialize local state from existing invoice data on mount
  React.useEffect(() => {
    if (existingInvoiceItems && existingInvoiceItems.length > 0 && !localData) {
      const flightLog = booking.flight_logs?.[0];

      // Convert existing items to local format
      const items = existingInvoiceItems.map((item: DatabaseInvoiceItem) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        rate_inclusive: item.rate_inclusive || (item.unit_price * (1 + (item.tax_rate || 0))),
        amount: item.amount,
        tax_rate: item.tax_rate || 0,
        tax_amount: item.tax_amount || 0,
        line_total: item.line_total || 0,
        description: item.description,
        chargeable_id: item.chargeable_id,
      }));

      const totals = InvoiceCalculations.calculateInvoiceTotals(items);

      // Initialize with existing data
      const initialData = {
        flightLog: {
          hobbsStart: flightLog?.hobbs_start || 0,
          hobbsEnd: flightLog?.hobbs_end || 0,
          tachStart: flightLog?.tach_start || 0,
          tachEnd: flightLog?.tach_end || 0,
          soloEndHobbs: flightLog?.solo_end_hobbs || undefined,
          hobbsTime: flightLog?.flight_time_hobbs || 0,
          tachTime: flightLog?.flight_time_tach || 0,
          flightTime: flightLog?.flight_time || 0,
          dualTime: flightLog?.dual_time || 0,
          soloTime: flightLog?.solo_time || 0,
          totalHoursStart: flightLog?.total_hours_start || 0,
          totalHoursEnd: flightLog?.total_hours_end || 0,
        },
        invoiceItems: items,
        totals: {
          subtotal: totals.subtotal,
          tax: totals.tax_total,
          total: totals.total_amount,
        },
        flightTypeId: booking.flight_type_id || '',
        instructorId: flightLog?.checked_out_instructor_id || undefined,
      };

      // Set meter readings for completion
      if (flightLog) {
        setCurrentMeterReadings({
          hobbsStart: flightLog.hobbs_start || 0,
          hobbsEnd: flightLog.hobbs_end || 0,
          tachStart: flightLog.tach_start || 0,
          tachEnd: flightLog.tach_end || 0,
          soloEndHobbs: flightLog.solo_end_hobbs || undefined,
        });
      }

      // Initialize local data with existing invoice
      initializeWithExistingData(initialData);
    }
  }, [existingInvoiceItems, localData, booking, initializeWithExistingData]);

  // Get invoice items and totals from local data
  const invoiceItems = useMemo(
    () => localData?.invoiceItems || [],
    [localData?.invoiceItems]
  );

  const totals = useMemo(
    () => localData?.totals || { subtotal: 0, tax: 0, total: 0 },
    [localData?.totals]
  );

  // Handle calculate charges
  const handleCalculate = useCallback((data: {
    meterReadings: MeterReadings;
    flightTypeId: string;
    instructorId?: string;
    soloFlightTypeId?: string;
  }) => {
    setCurrentMeterReadings(data.meterReadings);
    calculateCharges({
      bookingId: booking.id,
      ...data,
    });
  }, [booking.id, calculateCharges]);

  // Handle complete booking and navigate based on flight type
  const handleComplete = useCallback(() => {
    if (!currentMeterReadings) return;
    completeBooking(currentMeterReadings);
    
    // Navigate based on flight type after completion
    setTimeout(() => {
      if (isDualFlight) {
        // For dual flights: go to debrief page
        router.push(`/dashboard/bookings/debrief/${booking.id}`);
      } else if (existingInvoice?.id) {
        // For solo flights: go to invoice page
        router.push(`/dashboard/invoices/view/${existingInvoice.id}`);
      }
    }, 1000); // Small delay to allow completion to process
  }, [completeBooking, currentMeterReadings, existingInvoice, router, isDualFlight, booking.id]);

  // Handle add chargeable
  const handleAddChargeable = useCallback((item: Chargeable, quantity: number) => {
    if (!localData) return;
    resetComplete();

    const effectiveTaxRate = item.is_taxable ? taxRate : 0;
    const calculated = InvoiceCalculations.calculateItemAmounts({
      quantity,
      unit_price: item.rate,
      tax_rate: effectiveTaxRate,
    });

    addInvoiceItem({
      quantity,
      unit_price: item.rate,
      rate_inclusive: calculated.rate_inclusive,
      amount: calculated.amount,
      tax_rate: effectiveTaxRate,
      tax_amount: calculated.tax_amount,
      line_total: calculated.line_total,
      description: item.name,
      chargeable_id: item.id,
    });
  }, [localData, addInvoiceItem, taxRate, resetComplete]);

  // Handle add landing fee
  const handleAddLandingFee = useCallback((
    item: { chargeable_id: string; description: string; rate: number; is_taxable: boolean },
    quantity: number
  ) => {
    if (!localData) return;
    resetComplete();

    const effectiveTaxRate = item.is_taxable ? taxRate : 0;
    const calculated = InvoiceCalculations.calculateItemAmounts({
      quantity,
      unit_price: item.rate,
      tax_rate: effectiveTaxRate,
    });

    addInvoiceItem({
      quantity,
      unit_price: item.rate,
      rate_inclusive: calculated.rate_inclusive,
      amount: calculated.amount,
      tax_rate: effectiveTaxRate,
      tax_amount: calculated.tax_amount,
      line_total: calculated.line_total,
      description: item.description,
      chargeable_id: item.chargeable_id,
    });
  }, [localData, addInvoiceItem, taxRate, resetComplete]);

  // Handle update invoice item
  const handleUpdateItem = useCallback((itemId: string, updates: { quantity: number; unit_price: number }) => {
    if (!localData) return;
    resetComplete();
    updateInvoiceItem(itemId, updates);
  }, [localData, updateInvoiceItem, resetComplete]);

  // Handle delete invoice item
  const handleDeleteItem = useCallback((itemId: string) => {
    if (!localData) return;
    resetComplete();
    deleteInvoiceItem(itemId);
  }, [localData, deleteInvoiceItem, resetComplete]);

  // Initial meter readings from flight log
  const initialMeterReadings = {
    hobbsStart: flightLog?.hobbs_start || undefined,
    hobbsEnd: flightLog?.hobbs_end || undefined,
    tachStart: flightLog?.tach_start || undefined,
    tachEnd: flightLog?.tach_end || undefined,
    soloEndHobbs: flightLog?.solo_end_hobbs || undefined,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Error Alerts */}
        {calculateError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{calculateError}</AlertDescription>
          </Alert>
        )}

        {completeError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{completeError}</AlertDescription>
          </Alert>
        )}

        {/* Warning Alert */}
        {completeWarning && (
          <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">{completeWarning}</AlertDescription>
          </Alert>
        )}

        {/* Main Content - 40/60 Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Meter Readings (40%) */}
          <div className="lg:col-span-2">
            <MeterReadingCard
              aircraftRegistration={aircraft.registration}
              flightTypeId={booking.flight_type_id || undefined}
              instructorId={flightLog?.checked_out_instructor_id || undefined}
              initialMeterReadings={initialMeterReadings}
              flightTypes={flightTypes}
              instructors={instructors}
              chargingBy={chargingBy}
              onCalculate={handleCalculate}
              isCalculating={isCalculating}
              aircraftRate={aircraftRate}
              instructorRate={instructorRate}
            />
          </div>

          {/* Right Column - Invoice Preview (60%) */}
          <div className="lg:col-span-3">
            <InvoicePreviewCard
              invoiceItems={invoiceItems}
              subtotal={totals.subtotal}
              tax={totals.tax}
              total={totals.total}
              taxRate={taxRate}
              onDeleteItem={handleDeleteItem}
              onUpdateItem={handleUpdateItem}
              onAddChargeable={handleAddChargeable}
              onAddLandingFee={handleAddLandingFee}
              onComplete={handleComplete}
              isCompleting={isCompleting}
              isUpdating={false}
              completeSuccess={completeSuccess}
              isDualFlight={isDualFlight}
              aircraftTypeId={aircraft.aircraft_type_id || undefined}
            />
          </div>
        </div>

        {/* Loading Overlay */}
        {(isCalculating || isCompleting) && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="font-medium">
                {isCalculating && "Calculating charges..."}
                {isCompleting && "Completing flight..."}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
