"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { InvoiceCalculations } from "@/lib/invoice-calculations";

export interface MeterReadings {
  hobbsStart: number;
  hobbsEnd: number;
  tachStart: number;
  tachEnd: number;
  soloEndHobbs?: number;
}

export interface CalculateParams {
  bookingId: string;
  meterReadings: MeterReadings;
  flightTypeId: string;
  instructorId?: string;
  soloFlightTypeId?: string;
}

export interface InvoiceItem {
  id: string;
  quantity: number;
  unit_price: number;
  rate_inclusive: number;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  description: string;
  chargeable_id: string | null;
}

export interface CompleteParams {
  bookingId: string;
  meterReadings: MeterReadings;
  flightTypeId: string;
  instructorId?: string;
  soloFlightTypeId?: string;
  invoiceItems: InvoiceItem[];
}

export interface LocalCalculatedData {
  // Flight log data (calculated locally)
  flightLog: {
    hobbsStart: number;
    hobbsEnd: number;
    tachStart: number;
    tachEnd: number;
    soloEndHobbs?: number;
    hobbsTime: number;
    tachTime: number;
    flightTime: number;
    dualTime: number;
    soloTime: number;
    totalHoursStart: number;
    totalHoursEnd: number;
  };

  // Invoice items (managed locally)
  invoiceItems: InvoiceItem[];

  // Totals (calculated from items)
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };

  // Metadata
  flightTypeId: string;
  instructorId?: string;
  soloFlightTypeId?: string;
}

/**
 * Hook for managing booking completion workflow with local state
 */
export function useBookingCompletion(bookingId: string) {
  const queryClient = useQueryClient();
  const [localData, setLocalData] = useState<LocalCalculatedData | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [completionWarning, setCompletionWarning] = useState<string | null>(null);

  // Complete booking mutation - now creates everything atomically
  const completeMutation = useMutation({
    mutationFn: async (params: CompleteParams) => {
      const response = await fetch(`/api/bookings/${params.bookingId}/complete-flight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          meterReadings: params.meterReadings,
          flightTypeId: params.flightTypeId,
          instructorId: params.instructorId,
          soloFlightTypeId: params.soloFlightTypeId,
          invoiceItems: params.invoiceItems,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete booking');
      }

      return response.json();
    },
    onSuccess: async (data) => {
      setHasCompleted(true);
      
      // Capture warning if present
      if (data.warning) {
        setCompletionWarning(data.warning);
      }
      
      // Fetch fresh invoice items from server to update local state
      if (data.invoice?.id) {
        try {
          const itemsResponse = await fetch(`/api/invoice_items?invoice_id=${data.invoice.id}`);
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            const freshItems = (itemsData.invoice_items || []).map((item: import("@/types/invoice_items").InvoiceItem) => ({
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
            }));

            const totals = InvoiceCalculations.calculateInvoiceTotals(freshItems);

            // Update local data with fresh server data (use functional update to avoid stale closure)
            setLocalData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                invoiceItems: freshItems,
                totals: {
                  subtotal: totals.subtotal,
                  tax: totals.tax_total,
                  total: totals.total_amount,
                },
              };
            });
          }
        } catch {
          // Failed to fetch updated invoice items
        }
      }
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-items'] });
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
    },
  });

  // Calculate charges locally (no server call for preview)
  const calculateMutation = useMutation({
    mutationFn: async (params: CalculateParams) => {
      const response = await fetch(`/api/bookings/${params.bookingId}/calculate-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meterReadings: params.meterReadings,
          flightTypeId: params.flightTypeId,
          instructorId: params.instructorId,
          soloFlightTypeId: params.soloFlightTypeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate charges');
      }

      return response.json();
    },
    onMutate: () => {
      setHasCompleted(false);
      setCompletionWarning(null);
      completeMutation.reset();
    },
    onSuccess: (data) => {
      setLocalData(data);
      setHasCompleted(false);
    },
  });

  // Add invoice item locally
  const addInvoiceItem = useCallback((item: Omit<InvoiceItem, 'id'>) => {
    if (!localData) return;

    const newItem: InvoiceItem = {
      ...item,
      id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
    };

    const updatedItems = [...localData.invoiceItems, newItem];
    const totals = InvoiceCalculations.calculateInvoiceTotals(updatedItems);

    setLocalData({
      ...localData,
      invoiceItems: updatedItems,
      totals: {
        subtotal: totals.subtotal,
        tax: totals.tax_total,
        total: totals.total_amount,
      },
    });
    setHasCompleted(false);
  }, [localData]);

  // Update invoice item locally
  const updateInvoiceItem = useCallback((itemId: string, updates: { quantity: number; unit_price: number }) => {
    if (!localData) return;

    const updatedItems = localData.invoiceItems.map(item => {
      if (item.id !== itemId) return item;

      const calculated = InvoiceCalculations.calculateItemAmounts({
        quantity: updates.quantity,
        unit_price: updates.unit_price,
        tax_rate: item.tax_rate,
      });

      return {
        ...item,
        quantity: updates.quantity,
        unit_price: updates.unit_price,
        amount: calculated.amount,
        tax_amount: calculated.tax_amount,
        line_total: calculated.line_total,
        rate_inclusive: calculated.rate_inclusive,
      };
    });

    const totals = InvoiceCalculations.calculateInvoiceTotals(updatedItems);

    setLocalData({
      ...localData,
      invoiceItems: updatedItems,
      totals: {
        subtotal: totals.subtotal,
        tax: totals.tax_total,
        total: totals.total_amount,
      },
    });
    setHasCompleted(false);
  }, [localData]);

  // Delete invoice item locally
  const deleteInvoiceItem = useCallback((itemId: string) => {
    if (!localData) return;

    const updatedItems = localData.invoiceItems.filter(item => item.id !== itemId);
    const totals = InvoiceCalculations.calculateInvoiceTotals(updatedItems);

    setLocalData({
      ...localData,
      invoiceItems: updatedItems,
      totals: {
        subtotal: totals.subtotal,
        tax: totals.tax_total,
        total: totals.total_amount,
      },
    });
    setHasCompleted(false);
  }, [localData]);

  // Initialize with existing data
  const initializeWithExistingData = useCallback((data: LocalCalculatedData) => {
    setLocalData(data);
    setHasCompleted(false);
  }, []);

  return {
    // Actions
    calculateCharges: calculateMutation.mutate,
    completeBooking: (meterReadings: MeterReadings) => {
      if (!localData) return;
      completeMutation.mutate({
        bookingId,
        meterReadings,
        flightTypeId: localData.flightTypeId,
        instructorId: localData.instructorId,
        soloFlightTypeId: localData.soloFlightTypeId,
        invoiceItems: localData.invoiceItems,
      });
    },

    // Local item management
    addInvoiceItem,
    updateInvoiceItem,
    deleteInvoiceItem,

    // Initialize
    initializeWithExistingData,

    // Status
    isCalculating: calculateMutation.isPending,
    isCompleting: completeMutation.isPending,
    calculateSuccess: calculateMutation.isSuccess,
    completeSuccess: hasCompleted && completeMutation.isSuccess,

    // Data
    localData,

    // Errors
    calculateError: calculateMutation.error?.message,
    completeError: completeMutation.error?.message,
    completeWarning: completionWarning,

    // Reset
    resetCalculate: calculateMutation.reset,
    resetComplete: () => {
      setHasCompleted(false);
      setCompletionWarning(null);
      completeMutation.reset();
    },
    clearLocalData: () => setLocalData(null),
  };
}

// Query hook for fetching booking data
export function useBookingData(bookingId: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings?id=${bookingId}`);
      if (!response.ok) throw new Error('Failed to fetch booking');
      const data = await response.json();
      return data.bookings?.[0] || null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Query hook for fetching invoice items
export function useInvoiceItems(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const response = await fetch(`/api/invoice_items?invoice_id=${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice items');
      const data = await response.json();
      return data.invoice_items || [];
    },
    enabled: !!invoiceId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

