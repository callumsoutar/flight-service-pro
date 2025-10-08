import { createClient } from '@/lib/SupabaseServerClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Decimal } from 'decimal.js';
import { getOrganizationTaxRate } from '@/lib/tax-rates';
import { TransactionService } from '@/lib/transaction-service';
import { roundToTwoDecimals } from '@/lib/utils';
import { INVOICE_CONFIG, formatFallbackInvoiceNumber } from '@/constants/invoice';

// Configure Decimal.js for currency calculations
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

export interface InvoiceItemInput {
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface InvoiceItemCalculated {
  amount: number;
  tax_amount: number;
  line_total: number;
  rate_inclusive: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax_total: number;
  total_amount: number;
}

export interface InvoiceItem {
  id: string;
  amount: number;
  tax_amount: number;
  line_total: number;
  rate_inclusive: number;
}

export class InvoiceService {
  /**
   * Calculate all amounts for an invoice item using currency-safe arithmetic
   */
  static calculateItemAmounts(item: InvoiceItemInput): InvoiceItemCalculated {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unit_price);
    const taxRate = new Decimal(item.tax_rate || 0);
    
    // Calculate amount (before tax) - quantity * unit_price
    const amount = quantity.mul(unitPrice);
    
    // Calculate tax amount
    const taxAmount = amount.mul(taxRate);
    
    // Calculate line total (amount + tax_amount)
    const lineTotal = amount.add(taxAmount);
    
    // Calculate rate_inclusive (unit_price including tax)
    const rateInclusive = unitPrice.mul(taxRate.add(1));
    
    return {
      amount: amount.toNumber(),
      tax_amount: taxAmount.toNumber(),
      line_total: lineTotal.toNumber(),
      rate_inclusive: rateInclusive.toNumber()
    };
  }

  /**
   * Calculate invoice totals from items with proper rounding
   */
  static calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
    let subtotal = new Decimal(0);
    let taxTotal = new Decimal(0);
    
    for (const item of items) {
      subtotal = subtotal.add(item.amount);
      taxTotal = taxTotal.add(item.tax_amount);
    }
    
    const totalAmount = subtotal.add(taxTotal);
    
    return {
      subtotal: roundToTwoDecimals(subtotal.toNumber()),
      tax_total: roundToTwoDecimals(taxTotal.toNumber()),
      total_amount: roundToTwoDecimals(totalAmount.toNumber())
    };
  }

  /**
   * Get invoice prefix from settings or use default
   */
  static async getInvoicePrefix(): Promise<string> {
    try {
      const supabase = await createClient();
      
      // Get invoice prefix from settings
      const { data: setting, error } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('category', 'invoicing')
        .eq('setting_key', 'invoice_prefix')
        .single();
      
      if (error || !setting) {
        // Fallback to default if setting not found
        return INVOICE_CONFIG.DEFAULT_PREFIX;
      }
      
      // Parse the setting value
      const prefix = typeof setting.setting_value === 'string' 
        ? setting.setting_value 
        : JSON.parse(setting.setting_value as string);
      
      // Validate prefix (alphanumeric, uppercase)
      if (typeof prefix === 'string' && /^[A-Z0-9]+$/.test(prefix)) {
        return prefix;
      }
      
      return INVOICE_CONFIG.DEFAULT_PREFIX;
    } catch (error) {
      console.error('Error getting invoice prefix from settings:', error);
      return INVOICE_CONFIG.DEFAULT_PREFIX;
    }
  }

  /**
   * Generate sequential invoice number with proper locking
   */
  static async generateInvoiceNumber(): Promise<string> {
    const supabase = await createClient();
    
    // Get the prefix from settings
    const prefix = await this.getInvoicePrefix();
    
    // Use the configurable function with the prefix
    const { data, error } = await supabase.rpc('generate_invoice_number_with_prefix', {
      p_prefix: prefix
    });
    
    if (error) throw new Error(`Failed to generate invoice number: ${error.message}`);
    return data;
  }

  /**
   * Get organization tax rate for invoice creation
   * Single-tenant architecture: All invoices use the organization's tax rate
   */
  static async getTaxRateForInvoice(): Promise<number> {
    try {
      return await getOrganizationTaxRate();
    } catch (error) {
      console.error('Error getting organization tax rate for invoice:', error);
      return 0.15; // Final fallback
    }
  }

  /**
   * Update invoice totals based on all its items
   */
  static async updateInvoiceTotals(supabase: SupabaseClient, invoiceId: string): Promise<void> {
    // Get all items for this invoice
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('amount, tax_amount')
      .eq('invoice_id', invoiceId);
      
    if (itemsError) {
      throw new Error(`Failed to fetch invoice items: ${itemsError.message}`);
    }
    
    if (!items || items.length === 0) {
        // No items, set totals to zero
        await supabase
          .from('invoices')
          .update({
            subtotal: 0,
            tax_total: 0,
            total_amount: 0,
            balance_due: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId);
      return;
    }
    
    // Calculate totals
    const totals = this.calculateInvoiceTotals(items as InvoiceItem[]);
    
    // Get current total_paid to calculate balance_due
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('total_paid')
      .eq('id', invoiceId)
      .single();
      
    if (invoiceError) {
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }
    
    const totalPaid = invoice?.total_paid || 0;
    const balanceDue = roundToTwoDecimals(totals.total_amount - totalPaid);
    
    // Update invoice with calculated totals
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        subtotal: totals.subtotal,
        tax_total: totals.tax_total,
        total_amount: totals.total_amount,
        balance_due: balanceDue,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);
      
    if (updateError) {
      throw new Error(`Failed to update invoice totals: ${updateError.message}`);
    }
  }

  /**
   * Update invoice status based on payment state
   */
  static calculateInvoiceStatus(totalAmount: number, totalPaid: number, dueDate: Date | null, paidDate: Date | null): string {
    if (paidDate || totalPaid >= totalAmount) {
      return 'paid';
    }
    
    if (totalPaid > 0) {
      // Partially paid - check if overdue
      if (dueDate && new Date() > dueDate) {
        return 'overdue';
      }
      return 'pending';
    }
    
    // No payments made
    if (dueDate && new Date() > dueDate) {
      return 'overdue';
    }
    
    if (totalAmount > 0) {
      return 'pending';
    }
    
    return 'draft';
  }

  /**
   * Process payment and update invoice status
   */
  static async processPayment(supabase: SupabaseClient, invoiceId: string, paymentAmount: number): Promise<void> {
    // Get current invoice state
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('total_amount, total_paid, due_date, paid_date')
      .eq('id', invoiceId)
      .single();
      
    if (invoiceError) {
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }
    
    const newTotalPaid = (invoice.total_paid || 0) + paymentAmount;
    const balanceDue = invoice.total_amount - newTotalPaid;
    
    // Determine new status
    const newStatus = this.calculateInvoiceStatus(
      invoice.total_amount,
      newTotalPaid,
      invoice.due_date ? new Date(invoice.due_date) : null,
      invoice.paid_date ? new Date(invoice.paid_date) : null
    );
    
    // Set paid_date if fully paid
    const paidDate = newTotalPaid >= invoice.total_amount && !invoice.paid_date 
      ? new Date().toISOString() 
      : invoice.paid_date;
    
    // Update invoice
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        total_paid: newTotalPaid,
        balance_due: balanceDue,
        status: newStatus,
        paid_date: paidDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);
      
    if (updateError) {
      throw new Error(`Failed to update invoice after payment: ${updateError.message}`);
    }
  }

  /**
   * Create debit transaction when invoice is approved/paid
   */
  static async createInvoiceTransaction(invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    user_id: string;
    status: string;
  }): Promise<string | null> {
    // Only create debit transaction for approved/paid invoices
    if (!['pending', 'paid'].includes(invoice.status)) {
      return null;
    }
    
    try {
      return await TransactionService.createInvoiceDebit({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: Number(invoice.total_amount), // Convert string to number
        user_id: invoice.user_id
      });
    } catch (error) {
      console.error(`Failed to create transaction for invoice ${invoice.invoice_number}:`, error);
      throw error;
    }
  }

  /**
   * Update invoice status and handle transactions atomically
   */
  static async updateInvoiceStatus(invoiceId: string, newStatus: string): Promise<void> {
    const supabase = await createClient();
    
    // Use atomic database function
    const { data: result, error } = await supabase.rpc('update_invoice_status_atomic', {
      p_invoice_id: invoiceId,
      p_new_status: newStatus,
      p_updated_at: new Date().toISOString()
    });
    
    if (error) {
      throw new Error(`Failed to update invoice status atomically: ${error.message}`);
    }
    
    if (!result.success) {
      throw new Error(`Invoice status update failed: ${result.error}`);
    }
    
  }

  /**
   * Handle transaction creation/reversal based on status changes
   */
  private static async handleStatusChangeTransactions(
    invoice: { id: string; user_id: string; total_amount: number | null; invoice_number: string | null },
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    // Get the current invoice prefix for fallback
    const prefix = await this.getInvoicePrefix();
    
    // Status change: draft → pending/paid (create debit)
    if (oldStatus === 'draft' && ['pending', 'paid'].includes(newStatus)) {
      await TransactionService.createInvoiceDebit({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number || formatFallbackInvoiceNumber(prefix, invoice.id),
        total_amount: Number(invoice.total_amount), // Convert string to number
        user_id: invoice.user_id
      });
    }
    
    // Status change: pending/paid → cancelled (reverse debit)
    if (['pending', 'paid'].includes(oldStatus) && newStatus === 'cancelled') {
      
      // Find the original debit transaction
      const debitTransactionId = await TransactionService.findInvoiceDebitTransaction(invoice.id);
      
      if (debitTransactionId) {
        await TransactionService.reverseTransaction(
          debitTransactionId, 
          'Invoice cancelled'
        );
      } else {
        console.warn(`No debit transaction found for cancelled invoice ${invoice.invoice_number}`);
      }
    }
    
    // Status change: cancelled → pending/paid (recreate debit if needed)
    if (oldStatus === 'cancelled' && ['pending', 'paid'].includes(newStatus)) {
      await TransactionService.createInvoiceDebit({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number || formatFallbackInvoiceNumber(prefix, invoice.id),
        total_amount: Number(invoice.total_amount), // Convert string to number
        user_id: invoice.user_id
      });
    }
  }

  /**
   * Get all transactions related to an invoice
   */
  static async getInvoiceTransactions(invoiceId: string): Promise<import('@/types/transactions').Transaction[]> {
    return await TransactionService.getInvoiceTransactions(invoiceId);
  }

  /**
   * Update invoice totals and sync transaction amounts atomically
   * This uses the atomic database function to ensure invoice totals and transactions stay in sync
   */
  static async updateInvoiceTotalsWithTransactionSync(invoiceId: string): Promise<void> {
    const supabase = await createClient();
    
    // Use atomic database function to update totals AND create/sync transaction
    const { data: result, error } = await supabase.rpc('update_invoice_totals_atomic', {
      p_invoice_id: invoiceId
    });
    
    if (error) {
      throw new Error(`Failed to update invoice totals atomically: ${error.message}`);
    }
    
    if (!result.success) {
      throw new Error(`Invoice totals update failed: ${result.error}`);
    }
    
    console.log(`Invoice ${invoiceId} totals updated atomically:`, {
      subtotal: result.subtotal,
      tax_total: result.tax_total,
      total_amount: result.total_amount,
      transaction_created: result.transaction_created,
      transaction_id: result.transaction_id
    });
  }
}
