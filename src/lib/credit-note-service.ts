/**
 * Credit Note Service
 * 
 * Handles business logic for credit notes including:
 * - Creating credit notes
 * - Calculating credit note totals
 * - Applying credit notes
 * - Soft deleting credit notes
 */

import { createClient } from "@/lib/SupabaseServerClient";
import type {
  CreditNote,
  CreateCreditNoteParams,
  ApplyCreditNoteResult,
  SoftDeleteCreditNoteResult,
  CreditNoteWithItems
} from "@/types/credit_notes";

export class CreditNoteService {
  /**
   * Calculate credit note line item totals
   */
  static calculateLineItem(quantity: number, unitPrice: number, taxRate: number) {
    const amount = quantity * unitPrice;
    const taxAmount = amount * taxRate;
    const lineTotal = amount + taxAmount;
    
    return {
      amount: Number(amount.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      line_total: Number(lineTotal.toFixed(2))
    };
  }

  /**
   * Calculate credit note totals from items
   */
  static calculateTotals(items: Array<{ amount: number; tax_amount: number; line_total: number }>) {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxTotal = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax_total: Number(taxTotal.toFixed(2)),
      total_amount: Number(totalAmount.toFixed(2))
    };
  }

  /**
   * Create a new credit note with items
   */
  static async createCreditNote(params: CreateCreditNoteParams): Promise<{ 
    success: boolean; 
    credit_note?: CreditNoteWithItems; 
    error?: string 
  }> {
    const supabase = await createClient();
    
    try {
      // Validate user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }

      // Verify the invoice exists and is approved
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, user_id')
        .eq('id', params.original_invoice_id)
        .single();

      if (invoiceError || !invoice) {
        return { success: false, error: 'Original invoice not found' };
      }

      if (invoice.status === 'draft') {
        return { 
          success: false, 
          error: 'Cannot create credit note for draft invoice. Edit the invoice directly instead.' 
        };
      }

      // Verify user_id matches invoice
      if (invoice.user_id !== params.user_id) {
        return { 
          success: false, 
          error: 'User ID does not match invoice user' 
        };
      }

      // Calculate totals for each item
      const itemsWithTotals = params.items.map(item => {
        const calculated = this.calculateLineItem(
          item.quantity,
          item.unit_price,
          item.tax_rate
        );
        return {
          ...item,
          ...calculated
        };
      });

      // Calculate credit note totals
      const totals = this.calculateTotals(itemsWithTotals);

      // Generate credit note number
      const { data: creditNoteNumber, error: numberError } = await supabase
        .rpc('generate_credit_note_number');

      if (numberError || !creditNoteNumber) {
        return { success: false, error: 'Failed to generate credit note number' };
      }

      // Create credit note
      const { data: creditNote, error: creditNoteError } = await supabase
        .from('credit_notes')
        .insert({
          credit_note_number: creditNoteNumber,
          original_invoice_id: params.original_invoice_id,
          user_id: params.user_id,
          reason: params.reason,
          notes: params.notes || null,
          status: 'draft',
          subtotal: totals.subtotal,
          tax_total: totals.tax_total,
          total_amount: totals.total_amount,
          created_by: user.id
        })
        .select()
        .single();

      if (creditNoteError || !creditNote) {
        console.error('Error creating credit note:', creditNoteError);
        return { success: false, error: 'Failed to create credit note' };
      }

      // Create credit note items
      const creditNoteItems = itemsWithTotals.map(item => ({
        credit_note_id: creditNote.id,
        original_invoice_item_id: item.original_invoice_item_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        line_total: item.line_total
      }));

      const { data: items, error: itemsError } = await supabase
        .from('credit_note_items')
        .insert(creditNoteItems)
        .select();

      if (itemsError || !items) {
        // Rollback: soft delete the credit note
        await supabase.rpc('soft_delete_credit_note', {
          p_credit_note_id: creditNote.id,
          p_user_id: user.id,
          p_reason: 'Failed to create items - automatic rollback'
        });
        
        return { success: false, error: 'Failed to create credit note items' };
      }

      return {
        success: true,
        credit_note: {
          ...creditNote,
          credit_note_items: items
        }
      };

    } catch (error) {
      console.error('Credit note creation error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create credit note' 
      };
    }
  }

  /**
   * Apply a credit note to user's account
   */
  static async applyCreditNote(creditNoteId: string): Promise<ApplyCreditNoteResult> {
    const supabase = await createClient();
    
    try {
      // Validate user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }

      // Call atomic function to apply credit note
      const { data: result, error } = await supabase.rpc('apply_credit_note_atomic', {
        p_credit_note_id: creditNoteId,
        p_applied_by: user.id
      });

      if (error) {
        console.error('Error applying credit note:', error);
        return { success: false, error: error.message };
      }

      if (!result || !result.success) {
        return { 
          success: false, 
          error: result?.error || 'Failed to apply credit note' 
        };
      }

      return result as ApplyCreditNoteResult;

    } catch (error) {
      console.error('Apply credit note error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to apply credit note' 
      };
    }
  }

  /**
   * Soft delete a draft credit note
   */
  static async softDeleteCreditNote(
    creditNoteId: string, 
    reason: string = 'User initiated deletion'
  ): Promise<SoftDeleteCreditNoteResult> {
    const supabase = await createClient();
    
    try {
      // Validate user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }

      // Call soft delete function
      const { data: result, error } = await supabase.rpc('soft_delete_credit_note', {
        p_credit_note_id: creditNoteId,
        p_user_id: user.id,
        p_reason: reason
      });

      if (error) {
        console.error('Error soft deleting credit note:', error);
        return { success: false, error: error.message };
      }

      if (!result || !result.success) {
        return { 
          success: false, 
          error: result?.error || 'Failed to delete credit note' 
        };
      }

      return result as SoftDeleteCreditNoteResult;

    } catch (error) {
      console.error('Soft delete credit note error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete credit note' 
      };
    }
  }

  /**
   * Get credit note by ID with items
   */
  static async getCreditNoteWithItems(creditNoteId: string): Promise<{
    success: boolean;
    credit_note?: CreditNoteWithItems;
    error?: string;
  }> {
    const supabase = await createClient();
    
    try {
      const { data: creditNote, error: creditNoteError } = await supabase
        .from('credit_notes')
        .select(`
          *,
          credit_note_items (*)
        `)
        .eq('id', creditNoteId)
        .single();

      if (creditNoteError || !creditNote) {
        return { success: false, error: 'Credit note not found' };
      }

      return { success: true, credit_note: creditNote as CreditNoteWithItems };

    } catch (error) {
      console.error('Get credit note error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get credit note' 
      };
    }
  }

  /**
   * Get all credit notes for an invoice
   */
  static async getCreditNotesForInvoice(invoiceId: string): Promise<{
    success: boolean;
    credit_notes?: CreditNote[];
    error?: string;
  }> {
    const supabase = await createClient();
    
    try {
      const { data: creditNotes, error } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('original_invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching credit notes:', error);
        return { success: false, error: error.message };
      }

      return { success: true, credit_notes: creditNotes || [] };

    } catch (error) {
      console.error('Get credit notes for invoice error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get credit notes' 
      };
    }
  }

  /**
   * Update draft credit note
   */
  static async updateDraftCreditNote(
    creditNoteId: string,
    updates: {
      reason?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; credit_note?: CreditNote; error?: string }> {
    const supabase = await createClient();
    
    try {
      // Verify it's a draft
      const { data: existing, error: fetchError } = await supabase
        .from('credit_notes')
        .select('status')
        .eq('id', creditNoteId)
        .single();

      if (fetchError || !existing) {
        return { success: false, error: 'Credit note not found' };
      }

      if (existing.status !== 'draft') {
        return { 
          success: false, 
          error: 'Only draft credit notes can be updated' 
        };
      }

      // Update the credit note
      const { data: creditNote, error: updateError } = await supabase
        .from('credit_notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditNoteId)
        .select()
        .single();

      if (updateError || !creditNote) {
        return { success: false, error: 'Failed to update credit note' };
      }

      return { success: true, credit_note: creditNote };

    } catch (error) {
      console.error('Update credit note error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update credit note' 
      };
    }
  }
}

