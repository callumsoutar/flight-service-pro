"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkInKeys } from "./use-booking-check-in";
import type { Chargeable } from "@/types/chargeables";
import type { InvoiceItem } from "@/types/invoice_items";

interface AddItemParams {
  invoiceId: string;
  item: Chargeable;
  quantity: number;
}

interface UpdateItemParams {
  itemId: string;
  updates: {
    quantity?: number;
    unit_price?: number;
    description?: string;
    tax_rate?: number;
  };
}

interface DeleteItemParams {
  itemId: string;
  invoiceId: string;
}

export function useInvoiceItems(invoiceId: string | null) {
  const queryClient = useQueryClient();

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ invoiceId, item, quantity }: AddItemParams) => {
      const response = await fetch("/api/invoice_items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          chargeable_id: item.id,
          description: item.name,
          quantity,
          unit_price: item.rate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item');
      }

      return response.json();
    },
    onMutate: async ({ invoiceId, item, quantity }) => {
      if (!invoiceId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: checkInKeys.invoiceItems(invoiceId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(checkInKeys.invoiceItems(invoiceId)) as InvoiceItem[] || [];

      // Optimistically add the new item
      const optimisticItem: InvoiceItem = {
        id: `optimistic-${Date.now()}`,
        invoice_id: invoiceId,
        chargeable_id: item.id,
        description: item.name,
        quantity,
        unit_price: item.rate,
        rate_inclusive: null,
        amount: quantity * item.rate,
        tax_rate: 0.15,
        tax_amount: quantity * item.rate * 0.15, // Approximate
        line_total: quantity * item.rate * 1.15,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        checkInKeys.invoiceItems(invoiceId),
        [...previousItems, optimisticItem]
      );

      return { previousItems };
    },
    onError: (err, { invoiceId }, context) => {
      if (context?.previousItems && invoiceId) {
        queryClient.setQueryData(checkInKeys.invoiceItems(invoiceId), context.previousItems);
      }
    },
    onSuccess: (data, { invoiceId }) => {
      // Refetch to get the actual calculated values
      queryClient.invalidateQueries({ queryKey: checkInKeys.invoiceItems(invoiceId) });
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
    onMutate: async ({ itemId, updates }) => {
      if (!invoiceId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: checkInKeys.invoiceItems(invoiceId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(checkInKeys.invoiceItems(invoiceId)) as InvoiceItem[] || [];

      // Optimistically update the item
      const updatedItems = previousItems.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              ...updates,
              amount: (updates.quantity ?? item.quantity) * (updates.unit_price ?? item.unit_price),
              line_total: (updates.quantity ?? item.quantity) * (updates.unit_price ?? item.unit_price) * 1.15,
            }
          : item
      );

      queryClient.setQueryData(checkInKeys.invoiceItems(invoiceId), updatedItems);

      return { previousItems };
    },
    onError: (err, variables, context) => {
      if (context?.previousItems && invoiceId) {
        queryClient.setQueryData(checkInKeys.invoiceItems(invoiceId), context.previousItems);
      }
    },
    onSuccess: () => {
      if (invoiceId) {
        queryClient.invalidateQueries({ queryKey: checkInKeys.invoiceItems(invoiceId) });
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
      await queryClient.cancelQueries({ queryKey: checkInKeys.invoiceItems(invoiceId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(checkInKeys.invoiceItems(invoiceId)) as InvoiceItem[] || [];

      // Optimistically remove the item
      const updatedItems = previousItems.filter(item => item.id !== itemId);
      queryClient.setQueryData(checkInKeys.invoiceItems(invoiceId), updatedItems);

      return { previousItems };
    },
    onError: (err, { invoiceId }, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(checkInKeys.invoiceItems(invoiceId), context.previousItems);
      }
    },
    onSuccess: (data, { invoiceId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: checkInKeys.invoiceItems(invoiceId) });
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