"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InvoiceCalculations } from "@/lib/invoice-calculations";
import type { Chargeable } from "@/types/chargeables";
import type { InvoiceItem } from "@/types/invoice_items";

// Query keys for invoice items
const invoiceItemsKeys = {
  invoiceItems: (invoiceId: string) => ['invoice-items', invoiceId] as const,
};

interface AddItemParams {
  invoiceId: string;
  item: Chargeable;
  quantity: number;
  taxRate: number; // Added: Must be provided for proper calculations
}

interface UpdateItemParams {
  itemId: string;
  updates: {
    quantity?: number;
    unit_price?: number;
    description?: string;
    tax_rate?: number;
  };
  taxRate?: number; // Added: For recalculations
}

interface DeleteItemParams {
  itemId: string;
  invoiceId: string;
}

export function useInvoiceItems(invoiceId: string | null) {
  const queryClient = useQueryClient();

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ invoiceId, item, quantity, taxRate }: AddItemParams) => {
      const response = await fetch("/api/invoice_items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          chargeable_id: item.id,
          description: item.name,
          quantity,
          unit_price: item.rate,
          tax_rate: taxRate, // Include tax rate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item');
      }

      return response.json();
    },
    onMutate: async ({ invoiceId, item, quantity, taxRate }) => {
      if (!invoiceId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceItemsKeys.invoiceItems(invoiceId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(invoiceItemsKeys.invoiceItems(invoiceId)) as InvoiceItem[] || [];

      // Use InvoiceCalculations for optimistic update (currency-safe)
      const calculatedAmounts = InvoiceCalculations.calculateItemAmounts({
        quantity,
        unit_price: item.rate,
        tax_rate: taxRate
      });

      // Optimistically add the new item
      const optimisticItem: InvoiceItem = {
        id: `optimistic-${Date.now()}`,
        invoice_id: invoiceId,
        chargeable_id: item.id,
        description: item.name,
        quantity,
        unit_price: item.rate,
        rate_inclusive: calculatedAmounts.rate_inclusive,
        amount: calculatedAmounts.amount,
        tax_rate: taxRate,
        tax_amount: calculatedAmounts.tax_amount,
        line_total: calculatedAmounts.line_total,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        invoiceItemsKeys.invoiceItems(invoiceId),
        [...previousItems, optimisticItem]
      );

      return { previousItems };
    },
    onError: (err, { invoiceId }, context) => {
      if (context?.previousItems && invoiceId) {
        queryClient.setQueryData(invoiceItemsKeys.invoiceItems(invoiceId), context.previousItems);
      }
    },
    onSuccess: async (data, { invoiceId }) => {
      // Refetch to get the actual calculated values (background refetch, no loading state)
      await queryClient.refetchQueries({ 
        queryKey: invoiceItemsKeys.invoiceItems(invoiceId),
        type: 'active' 
      });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: UpdateItemParams) => {
      const response = await fetch("/api/invoice_items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          ...updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      return response.json();
    },
    onMutate: async ({ itemId, updates, taxRate }) => {
      if (!invoiceId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceItemsKeys.invoiceItems(invoiceId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(invoiceItemsKeys.invoiceItems(invoiceId)) as InvoiceItem[] || [];

      // Optimistically update the item using InvoiceCalculations
      const updatedItems = previousItems.map(item => {
        if (item.id !== itemId) return item;

        const newQuantity = updates.quantity ?? item.quantity;
        const newUnitPrice = updates.unit_price ?? item.unit_price;
        const newTaxRate = updates.tax_rate ?? taxRate ?? item.tax_rate ?? 0;

        // Use InvoiceCalculations for currency-safe recalculation
        const calculatedAmounts = InvoiceCalculations.calculateItemAmounts({
          quantity: newQuantity,
          unit_price: newUnitPrice,
          tax_rate: newTaxRate
        });

        return {
          ...item,
          ...updates,
          quantity: newQuantity,
          unit_price: newUnitPrice,
          tax_rate: newTaxRate,
          amount: calculatedAmounts.amount,
          tax_amount: calculatedAmounts.tax_amount,
          line_total: calculatedAmounts.line_total,
          rate_inclusive: calculatedAmounts.rate_inclusive,
        };
      });

      queryClient.setQueryData(invoiceItemsKeys.invoiceItems(invoiceId), updatedItems);

      return { previousItems };
    },
    onError: (err, variables, context) => {
      if (context?.previousItems && invoiceId) {
        queryClient.setQueryData(invoiceItemsKeys.invoiceItems(invoiceId), context.previousItems);
      }
    },
    onSuccess: async () => {
      if (invoiceId) {
        // Refetch to get the actual calculated values (background refetch, no loading state)
        await queryClient.refetchQueries({ 
          queryKey: invoiceItemsKeys.invoiceItems(invoiceId),
          type: 'active' 
        });
      }
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async ({ itemId }: DeleteItemParams) => {
      const response = await fetch("/api/invoice_items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      return response.json();
    },
    onMutate: async ({ itemId, invoiceId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceItemsKeys.invoiceItems(invoiceId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(invoiceItemsKeys.invoiceItems(invoiceId)) as InvoiceItem[] || [];

      // Optimistically remove the item
      const updatedItems = previousItems.filter(item => item.id !== itemId);
      queryClient.setQueryData(invoiceItemsKeys.invoiceItems(invoiceId), updatedItems);

      return { previousItems };
    },
    onError: (err, { invoiceId }, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(invoiceItemsKeys.invoiceItems(invoiceId), context.previousItems);
      }
    },
    onSuccess: async (data, { invoiceId }) => {
      // Refetch to ensure consistency (background refetch, no loading state)
      await queryClient.refetchQueries({ 
        queryKey: invoiceItemsKeys.invoiceItems(invoiceId),
        type: 'active' 
      });
    },
  });

  return {
    // Mutations
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    
    // Loading states
    isAdding: addItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    
    // Error states
    addError: addItemMutation.error?.message,
    updateError: updateItemMutation.error?.message,
    deleteError: deleteItemMutation.error?.message,
    
    // Success states
    addSuccess: addItemMutation.isSuccess,
    updateSuccess: updateItemMutation.isSuccess,
    deleteSuccess: deleteItemMutation.isSuccess,
    
    // Reset functions
    resetAdd: addItemMutation.reset,
    resetUpdate: updateItemMutation.reset,
    resetDelete: deleteItemMutation.reset,
  };
}