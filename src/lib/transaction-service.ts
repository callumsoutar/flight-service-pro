import { createClient } from '@/lib/SupabaseServerClient';
import { Decimal } from 'decimal.js';

// Configure Decimal.js for currency calculations
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

export interface TransactionInput {
  user_id: string;
  type: 'debit' | 'credit' | 'refund' | 'adjustment';
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
  reference_number?: string;
}

export interface InvoiceTransactionData {
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  user_id: string;
}

export interface PaymentTransactionData {
  user_id: string;
  amount: number;
  invoice_id: string;
  invoice_number: string;
  payment_id: string;
}

export class TransactionService {
  /**
   * Create a debit transaction for an invoice
   * This represents money owed by the user (increases their debt)
   */
  static async createInvoiceDebit(data: InvoiceTransactionData): Promise<string> {
    const supabase = await createClient();
    
    // Check if transaction already exists for this invoice
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('metadata->>invoice_id', data.invoice_id)
      .eq('type', 'debit')
      .eq('metadata->>transaction_type', 'invoice_debit')
      .single();
    
    if (existing) {
      console.log(`Debit transaction already exists for invoice ${data.invoice_id}`);
      return existing.id;
    }
    
    const transaction: TransactionInput = {
      user_id: data.user_id,
      type: 'debit',
      amount: data.total_amount,
      description: `Invoice: ${data.invoice_number}`,
      metadata: {
        invoice_id: data.invoice_id,
        invoice_number: data.invoice_number,
        transaction_type: 'invoice_debit'
      },
      reference_number: data.invoice_number
    };
    
    const { data: result, error } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        status: 'completed', // Invoice debits are immediately completed
        completed_at: new Date().toISOString()
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to create invoice debit transaction:', error);
      throw new Error(`Failed to create invoice debit transaction: ${error.message}`);
    }
    
    console.log(`Created debit transaction ${result.id} for invoice ${data.invoice_number}`);
    return result.id;
  }
  
  /**
   * Create a credit transaction for a payment
   * This represents money paid by the user (reduces their debt)
   */
  static async createPaymentCredit(data: PaymentTransactionData): Promise<string> {
    const supabase = await createClient();
    
    const transaction: TransactionInput = {
      user_id: data.user_id,
      type: 'credit',
      amount: data.amount,
      description: `Payment for invoice: ${data.invoice_number}`,
      metadata: {
        invoice_id: data.invoice_id,
        payment_id: data.payment_id,
        invoice_number: data.invoice_number,
        transaction_type: 'payment_credit'
      }
    };
    
    const { data: result, error } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        status: 'completed', // Payment credits are immediately completed
        completed_at: new Date().toISOString()
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to create payment credit transaction:', error);
      throw new Error(`Failed to create payment credit transaction: ${error.message}`);
    }
    
    console.log(`Created credit transaction ${result.id} for payment ${data.payment_id}`);
    return result.id;
  }
  
  /**
   * Reverse a transaction (for invoice cancellations or refunds)
   */
  static async reverseTransaction(transactionId: string, reason: string): Promise<string> {
    const supabase = await createClient();
    
    // Get the original transaction
    const { data: original, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to fetch transaction: ${fetchError.message}`);
    }
    
    if (!original) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    // Check if already reversed
    const { data: existingReversal } = await supabase
      .from('transactions')
      .select('id')
      .eq('metadata->>reversal_of', transactionId)
      .single();
    
    if (existingReversal) {
      console.log(`Transaction ${transactionId} already reversed`);
      return existingReversal.id;
    }
    
    // Create a reversal transaction (opposite type, same amount)
    const reversalType = original.type === 'debit' ? 'credit' : 'debit';
    const reversalAmount = original.amount;
    
    const reversal: TransactionInput = {
      user_id: original.user_id,
      type: reversalType as 'debit' | 'credit' | 'refund' | 'adjustment',
      amount: reversalAmount,
      description: `Reversal: ${original.description} (${reason})`,
      metadata: {
        ...original.metadata,
        reversal_of: transactionId,
        reversal_reason: reason,
        transaction_type: 'reversal',
        original_transaction_type: original.metadata?.transaction_type
      },
      reference_number: `REV-${original.reference_number || original.id.slice(0, 8)}`
    };
    
    const { data: result, error: insertError } = await supabase
      .from('transactions')
      .insert([{
        ...reversal,
        status: 'completed',
        completed_at: new Date().toISOString()
      }])
      .select('id')
      .single();
    
    if (insertError) {
      throw new Error(`Failed to create reversal transaction: ${insertError.message}`);
    }
    
    console.log(`Created reversal transaction ${result.id} for ${transactionId}`);
    return result.id;
  }
  
  /**
   * Update transaction amount (for invoice modifications)
   */
  static async updateTransactionAmount(transactionId: string, newAmount: number): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('transactions')
      .update({ 
        amount: newAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);
    
    if (error) {
      throw new Error(`Failed to update transaction amount: ${error.message}`);
    }
    
    console.log(`Updated transaction ${transactionId} amount to ${newAmount}`);
  }
  
  /**
   * Get user's current account balance using the database function
   */
  static async getUserAccountBalance(userId: string): Promise<number> {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('get_account_balance', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Failed to get account balance:', error);
      throw new Error(`Failed to get account balance: ${error.message}`);
    }
    
    return data || 0;
  }
  
  /**
   * Get all transactions for a user
   */
  static async getUserTransactions(userId: string, limit = 50): Promise<import('@/types/transactions').Transaction[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Get transactions for a specific invoice
   */
  static async getInvoiceTransactions(invoiceId: string): Promise<import('@/types/transactions').Transaction[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('metadata->>invoice_id', invoiceId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch invoice transactions: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Find the debit transaction for an invoice
   */
  static async findInvoiceDebitTransaction(invoiceId: string): Promise<string | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('metadata->>invoice_id', invoiceId)
      .eq('type', 'debit')
      .eq('metadata->>transaction_type', 'invoice_debit')
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.id;
  }
}
