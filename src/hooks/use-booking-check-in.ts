"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Booking } from "@/types/bookings";
import { FlightLog } from "@/types/flight_logs";
import { Invoice } from "@/types/invoices";
import { InvoiceItem } from "@/types/invoice_items";

// Types
interface CalculateChargesParams {
  bookingId: string;
  chargeTime: number;
  aircraftRate: number;
  instructorRate: number;
  chargingBy: 'hobbs' | 'tacho' | null;
  selectedInstructor: string;
  selectedFlightType: string;
  instructionType?: 'dual' | 'solo' | 'trial' | null;
  hobbsStart?: number;
  hobbsEnd?: number;
  tachStart?: number;
  tachEnd?: number;
  flightTimeHobbs: number;
  flightTimeTach: number;
  soloEndHobbs?: number;
  dualTime: number;
  soloTime: number;
  soloFlightType?: string;
  soloAircraftRate?: number;
}

interface CompleteBookingParams {
  bookingId: string;
  invoiceItems?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    rate_inclusive?: number;
    amount: number;
    tax_rate?: number;
    tax_amount?: number;
    line_total?: number;
    description: string;
    chargeable_id?: string;
  }>;
}

interface CheckInData {
  booking: Booking;
  flight_log?: FlightLog;
  invoice: Invoice;
  invoiceItems: InvoiceItem[];
  totals: {
    subtotal: number;
    totalTax: number;
    total: number;
  };
}

// Query keys
export const checkInKeys = {
  all: ['booking-check-in'] as const,
  booking: (id: string) => [...checkInKeys.all, 'booking', id] as const,
  invoice: (bookingId: string) => [...checkInKeys.all, 'invoice', bookingId] as const,
  invoiceItems: (invoiceId: string) => [...checkInKeys.all, 'invoice-items', invoiceId] as const,
  instructors: () => [...checkInKeys.all, 'instructors'] as const,
  flightTypes: () => [...checkInKeys.all, 'flight-types'] as const,
  aircraft: (id: string) => [...checkInKeys.all, 'aircraft', id] as const,
  instructorRate: (instructorId: string, flightTypeId: string) => 
    [...checkInKeys.all, 'instructor-rate', instructorId, flightTypeId] as const,
};

// Helper function to round to 1 decimal place and avoid floating-point errors
const roundToOneDecimal = (value: number): number => {
  return Math.round(value * 10) / 10;
};

// Main hook for booking check-in
export function useBookingCheckIn(bookingId: string) {
  const queryClient = useQueryClient();
  const [optimisticData, setOptimisticData] = useState<CheckInData | null>(null);

  // Calculate charges mutation
  const calculateChargesMutation = useMutation({
    mutationFn: async (params: CalculateChargesParams): Promise<CheckInData> => {
      const response = await fetch(`/api/bookings/${params.bookingId}/calculate-charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate charges');
      }

      return response.json();
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: checkInKeys.booking(bookingId) });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(checkInKeys.booking(bookingId));

      // Optimistically update the booking data
      if (previousData) {
        const bookingData = previousData as Booking;
        const optimisticBooking = {
          ...bookingData,
        };

        queryClient.setQueryData(checkInKeys.booking(bookingId), optimisticBooking);

        // Get the organization tax rate for optimistic calculations
        let currentTaxRate = 0.15; // Fallback
        try {
          const response = await fetch('/api/organization/tax-rate');
          if (response.ok) {
            const data = await response.json();
            currentTaxRate = data.taxRate || 0.15;
          }
        } catch (error) {
          console.warn('Failed to get organization tax rate for optimistic calculations:', error);
          // Use fallback if fetch fails
        }

        // Create optimistic invoice items based on dual/solo time
        const optimisticItems: InvoiceItem[] = [];

        // Check if instructor is required based on instruction type
        const requiresInstructor = params.instructionType === 'dual' || params.instructionType === 'trial';

        // Handle different flight types with clear separation
        if (params.instructionType === 'solo') {
          // SOLO FLIGHTS: Only create aircraft charge, no instructor charge
          const roundedChargeTime = roundToOneDecimal(params.chargeTime);
          const soloAircraftItem: InvoiceItem = {
            id: 'optimistic-solo-aircraft',
            invoice_id: 'optimistic-invoice',
            chargeable_id: null,
            description: `Solo Flight - Aircraft`,
            quantity: roundedChargeTime,
            unit_price: params.aircraftRate,
            rate_inclusive: null,
            amount: roundedChargeTime * params.aircraftRate,
            tax_rate: currentTaxRate,
            tax_amount: (roundedChargeTime * params.aircraftRate) * currentTaxRate,
            line_total: roundedChargeTime * params.aircraftRate * (1 + currentTaxRate),
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          optimisticItems.push(soloAircraftItem);
        } else if (params.instructionType === 'dual') {
          // DUAL FLIGHTS: Handle dual and solo segments separately

          // Dual time items (aircraft + instructor)
          if (params.dualTime > 0) {
            const roundedDualTime = roundToOneDecimal(params.dualTime);
            const dualAircraftItem: InvoiceItem = {
              id: 'optimistic-dual-aircraft',
              invoice_id: 'optimistic-invoice',
              chargeable_id: null,
              description: `Dual Flight - Aircraft`,
              quantity: roundedDualTime,
              unit_price: params.aircraftRate,
              rate_inclusive: null,
              amount: roundedDualTime * params.aircraftRate,
              tax_rate: currentTaxRate,
              tax_amount: (roundedDualTime * params.aircraftRate) * currentTaxRate,
              line_total: roundedDualTime * params.aircraftRate * (1 + currentTaxRate),
              notes: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const dualInstructorItem: InvoiceItem = {
              id: 'optimistic-dual-instructor',
              invoice_id: 'optimistic-invoice',
              chargeable_id: null,
              description: `Dual Flight - Instructor`,
              quantity: roundedDualTime,
              unit_price: params.instructorRate,
              rate_inclusive: null,
              amount: roundedDualTime * params.instructorRate,
              tax_rate: currentTaxRate,
              tax_amount: (roundedDualTime * params.instructorRate) * currentTaxRate,
              line_total: roundedDualTime * params.instructorRate * (1 + currentTaxRate),
              notes: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            optimisticItems.push(dualAircraftItem, dualInstructorItem);
          }

          // Solo time continuation (aircraft only) - use solo aircraft rate if available
          if (params.soloTime > 0) {
            const roundedSoloTime = roundToOneDecimal(params.soloTime);
            const soloRate = params.soloAircraftRate || params.aircraftRate;
            const soloAircraftItem: InvoiceItem = {
              id: 'optimistic-solo-aircraft',
              invoice_id: 'optimistic-invoice',
              chargeable_id: null,
              description: `Solo Flight - Aircraft`,
              quantity: roundedSoloTime,
              unit_price: soloRate,
              rate_inclusive: null,
              amount: roundedSoloTime * soloRate,
              tax_rate: currentTaxRate,
              tax_amount: (roundedSoloTime * soloRate) * currentTaxRate,
              line_total: roundedSoloTime * soloRate * (1 + currentTaxRate),
              notes: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            optimisticItems.push(soloAircraftItem);
          }
        } else {
          // TRIAL FLIGHTS and FALLBACK: Create standard items
          const roundedChargeTime = roundToOneDecimal(params.chargeTime);
          const aircraftItem: InvoiceItem = {
            id: 'optimistic-aircraft',
            invoice_id: 'optimistic-invoice',
            chargeable_id: null,
            description: `Flight - Aircraft`,
            quantity: roundedChargeTime,
            unit_price: params.aircraftRate,
            rate_inclusive: null,
            amount: roundedChargeTime * params.aircraftRate,
            tax_rate: currentTaxRate,
            tax_amount: (roundedChargeTime * params.aircraftRate) * currentTaxRate,
            line_total: roundedChargeTime * params.aircraftRate * (1 + currentTaxRate),
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          optimisticItems.push(aircraftItem);

          // Only add instructor item for trial flights or when required
          if (requiresInstructor) {
            const instructorItem: InvoiceItem = {
              id: 'optimistic-instructor',
              invoice_id: 'optimistic-invoice',
              chargeable_id: null,
              description: `Flight - Instructor`,
              quantity: roundedChargeTime,
              unit_price: params.instructorRate,
              rate_inclusive: null,
              amount: roundedChargeTime * params.instructorRate,
              tax_rate: currentTaxRate,
              tax_amount: (roundedChargeTime * params.instructorRate) * currentTaxRate,
              line_total: roundedChargeTime * params.instructorRate * (1 + currentTaxRate),
              notes: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            optimisticItems.push(instructorItem);
          }
        }

        const subtotal = optimisticItems.reduce((sum, item) => sum + item.amount, 0);
        const totalTax = subtotal * currentTaxRate;
        const total = subtotal + totalTax;

        const optimisticInvoice: Invoice = {
          id: 'optimistic-invoice',
          user_id: bookingData.user_id || '',
          booking_id: bookingId,
          invoice_number: null,
          issue_date: null,
          due_date: null,
          status: 'draft',
          subtotal,
          tax_rate: currentTaxRate,
          tax_total: totalTax,
          total_amount: total,
          total_paid: null,
          balance_due: total,
          paid_date: null,
          payment_method: null,
          payment_reference: null,
          reference: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Fetch aircraft data to calculate optimistic total_hours
        let totalHoursStart = null;
        let totalHoursEnd = null;
        try {
          const aircraftResponse = await fetch(`/api/aircraft?id=${bookingData.aircraft_id}`);
          if (aircraftResponse.ok) {
            const aircraftData = await aircraftResponse.json();
            const aircraft = aircraftData.aircraft;

            if (aircraft && params.hobbsStart !== undefined && params.hobbsEnd !== undefined &&
                params.tachStart !== undefined && params.tachEnd !== undefined) {
              const hobbsTime = params.hobbsEnd - params.hobbsStart;
              const tachoTime = params.tachEnd - params.tachStart;

              // Calculate credited time based on aircraft's total_time_method
              let creditedTime = 0;
              switch (aircraft.total_time_method) {
                case 'hobbs':
                  creditedTime = hobbsTime;
                  break;
                case 'tacho':
                  creditedTime = tachoTime;
                  break;
                case 'airswitch':
                  creditedTime = hobbsTime; // Fallback
                  break;
                case 'hobbs less 5%':
                  creditedTime = hobbsTime * 0.95;
                  break;
                case 'hobbs less 10%':
                  creditedTime = hobbsTime * 0.90;
                  break;
                case 'tacho less 5%':
                  creditedTime = tachoTime * 0.95;
                  break;
                case 'tacho less 10%':
                  creditedTime = tachoTime * 0.90;
                  break;
                default:
                  creditedTime = hobbsTime;
              }

              totalHoursStart = roundToOneDecimal(aircraft.total_hours || 0);
              totalHoursEnd = roundToOneDecimal((aircraft.total_hours || 0) + creditedTime);
            }
          }
        } catch (error) {
          console.warn('Failed to fetch aircraft for optimistic total_hours calculation:', error);
        }

        // Create optimistic flight log
        const optimisticFlightLog: FlightLog = {
          id: 'optimistic-flight-log',
          booking_id: bookingId,
          hobbs_start: params.hobbsStart ?? null,
          hobbs_end: params.hobbsEnd ?? null,
          tach_start: params.tachStart ?? null,
          tach_end: params.tachEnd ?? null,
          flight_time: params.chargeTime,
          flight_time_hobbs: params.flightTimeHobbs,
          flight_time_tach: params.flightTimeTach,
          solo_end_hobbs: params.soloEndHobbs ?? null,
          dual_time: params.dualTime > 0 ? params.dualTime : null,
          solo_time: params.soloTime > 0 ? params.soloTime : null,
          total_hours_start: totalHoursStart,
          total_hours_end: totalHoursEnd,
          briefing_completed: false,
          authorization_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setOptimisticData({
          booking: optimisticBooking,
          flight_log: optimisticFlightLog,
          invoice: optimisticInvoice,
          invoiceItems: optimisticItems,
          totals: { subtotal, totalTax, total },
        });
      }

      return { previousData };
    },
    onError: (_err, _params, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(checkInKeys.booking(bookingId), context.previousData);
      }
      setOptimisticData(null);
    },
    onSuccess: (data) => {
      // Update all related queries
      queryClient.setQueryData(checkInKeys.booking(bookingId), data.booking);
      if (data.invoice) {
        queryClient.setQueryData(checkInKeys.invoice(bookingId), data.invoice);
        queryClient.setQueryData(checkInKeys.invoiceItems(data.invoice.id), data.invoiceItems);
      }
      setOptimisticData(null);
    },
  });

  // Complete booking mutation
  const completeBookingMutation = useMutation({
    mutationFn: async (params: CompleteBookingParams) => {
      const response = await fetch(`/api/bookings/${params.bookingId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete booking');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update booking status optimistically
      queryClient.setQueryData(checkInKeys.booking(bookingId), data.booking);
      queryClient.setQueryData(checkInKeys.invoice(bookingId), data.invoice);
      
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: checkInKeys.booking(bookingId) });
    },
  });

  return {
    // Mutations
    calculateCharges: calculateChargesMutation.mutate,
    completeBooking: completeBookingMutation.mutate,
    
    // States
    isCalculating: calculateChargesMutation.isPending,
    isCompleting: completeBookingMutation.isPending,
    
    // Errors
    calculateError: calculateChargesMutation.error?.message,
    completeError: completeBookingMutation.error?.message,
    
    // Success states
    calculateSuccess: calculateChargesMutation.isSuccess,
    completeSuccess: completeBookingMutation.isSuccess,
    
    // Data
    optimisticData,
    lastCalculateResult: calculateChargesMutation.data,
    lastCompleteResult: completeBookingMutation.data,
    
    // Reset functions
    resetCalculate: calculateChargesMutation.reset,
    resetComplete: completeBookingMutation.reset,
  };
}

// Hook for fetching booking data
export function useBookingData(bookingId: string) {
  return useQuery({
    queryKey: checkInKeys.booking(bookingId),
    queryFn: async () => {
      const response = await fetch(`/api/bookings?id=${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }
      const data = await response.json();
      return data.bookings?.[0] || null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for fetching invoice data
export function useInvoiceData(bookingId: string) {
  return useQuery({
    queryKey: checkInKeys.invoice(bookingId),
    queryFn: async () => {
      const response = await fetch(`/api/invoices?booking_id=${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      const data = await response.json();
      return data.invoices?.[0] || null;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for fetching invoice items
export function useInvoiceItems(invoiceId: string | null) {
  return useQuery({
    queryKey: checkInKeys.invoiceItems(invoiceId || ''),
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const response = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice items');
      }
      const data = await response.json();
      return data.invoice_items || [];
    },
    enabled: !!invoiceId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for fetching instructors
export function useInstructors() {
  return useQuery({
    queryKey: checkInKeys.instructors(),
    queryFn: async () => {
      const response = await fetch('/api/instructors');
      if (!response.ok) {
        throw new Error('Failed to fetch instructors');
      }
      const data = await response.json();
      return data.instructors || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook for fetching flight types
export function useFlightTypes() {
  return useQuery({
    queryKey: checkInKeys.flightTypes(),
    queryFn: async () => {
      const response = await fetch('/api/flight_types');
      if (!response.ok) {
        throw new Error('Failed to fetch flight types');
      }
      const data = await response.json();
      return data.flight_types || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook for fetching aircraft data
export function useAircraftData(aircraftId: string | null) {
  return useQuery({
    queryKey: checkInKeys.aircraft(aircraftId || ''),
    queryFn: async () => {
      if (!aircraftId) return null;
      
      const response = await fetch(`/api/aircraft?id=${aircraftId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch aircraft');
      }
      const data = await response.json();
      return data.aircraft || null;
    },
    enabled: !!aircraftId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for fetching instructor rate
export function useInstructorRate(instructorId: string | null, flightTypeId: string | null) {
  return useQuery({
    queryKey: checkInKeys.instructorRate(instructorId || '', flightTypeId || ''),
    queryFn: async () => {
      if (!instructorId || !flightTypeId) return null;
      
      const response = await fetch(`/api/instructor_flight_type_rates?instructor_id=${instructorId}&flight_type_id=${flightTypeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch instructor rate');
      }
      const data = await response.json();
      return data.rate || null;
    },
    enabled: !!instructorId && !!flightTypeId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}