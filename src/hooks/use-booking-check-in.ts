"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Booking } from "@/types/bookings";
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
  hobbsStart?: number;
  hobbsEnd?: number;
  tachStart?: number;
  tachEnd?: number;
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

      // Optimistically update the booking with new meter readings
      if (previousData) {
        const bookingData = previousData as Booking;
        const optimisticBooking = {
          ...bookingData,
          hobbs_start: params.hobbsStart ?? bookingData.hobbs_start,
          hobbs_end: params.hobbsEnd ?? bookingData.hobbs_end,
          tach_start: params.tachStart ?? bookingData.tach_start,
          tach_end: params.tachEnd ?? bookingData.tach_end,
          flight_time: params.chargeTime,
        };

        queryClient.setQueryData(checkInKeys.booking(bookingId), optimisticBooking);

        // Create optimistic invoice items
        const aircraftItem: InvoiceItem = {
          id: 'optimistic-aircraft',
          invoice_id: 'optimistic-invoice',
          chargeable_id: null,
          description: `Flight - Aircraft`,
          quantity: params.chargeTime,
          unit_price: params.aircraftRate,
          rate_inclusive: null,
          amount: params.chargeTime * params.aircraftRate,
          tax_rate: 0.15,
          tax_amount: (params.chargeTime * params.aircraftRate) * 0.15,
          line_total: params.chargeTime * params.aircraftRate * 1.15, // Rough estimate with tax
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const instructorItem: InvoiceItem = {
          id: 'optimistic-instructor',
          invoice_id: 'optimistic-invoice',
          chargeable_id: null,
          description: `Flight - Instructor`,
          quantity: params.chargeTime,
          unit_price: params.instructorRate,
          rate_inclusive: null,
          amount: params.chargeTime * params.instructorRate,
          tax_rate: 0.15,
          tax_amount: (params.chargeTime * params.instructorRate) * 0.15,
          line_total: params.chargeTime * params.instructorRate * 1.15,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const optimisticItems = [aircraftItem, instructorItem];
        const subtotal = optimisticItems.reduce((sum, item) => sum + item.amount, 0);
        const totalTax = subtotal * 0.15;
        const total = subtotal + totalTax;

        const optimisticInvoice: Invoice = {
          id: 'optimistic-invoice',
          user_id: bookingData.user_id,
          booking_id: bookingId,
          invoice_number: null,
          issue_date: null,
          due_date: null,
          status: 'draft',
          subtotal,
          tax_rate: 0.15,
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

        setOptimisticData({
          booking: optimisticBooking,
          invoice: optimisticInvoice,
          invoiceItems: optimisticItems,
          totals: { subtotal, totalTax, total },
        });
      }

      return { previousData };
    },
    onError: (err, params, context) => {
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