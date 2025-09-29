// Transaction types from database enum
export type TransactionType = 'debit' | 'credit' | 'refund' | 'adjustment';

// Transaction statuses from database enum
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

// Base transaction type
export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  description: string;
  metadata?: TransactionMetadata | null;
  reference_number?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

// Specific metadata types for different transaction types
export interface InvoiceDebitMetadata {
  invoice_id: string;
  invoice_number: string;
  transaction_type: 'invoice_debit';
}

export interface PaymentCreditMetadata {
  invoice_id: string;
  invoice_number: string;
  payment_id: string;
  transaction_type: 'payment_credit';
}

export interface ReversalMetadata {
  reversal_of: string;
  reversal_reason: string;
  transaction_type: 'reversal';
  original_transaction_type?: string;
  invoice_id?: string;
  payment_id?: string;
}

export interface AdjustmentMetadata {
  transaction_type: 'adjustment';
  adjustment_reason: string;
  adjusted_by?: string;
  invoice_id?: string;
}

// Union type for all metadata types
export type TransactionMetadata = 
  | InvoiceDebitMetadata 
  | PaymentCreditMetadata 
  | ReversalMetadata 
  | AdjustmentMetadata 
  | Record<string, unknown>;

// Typed transaction variants
export interface InvoiceDebitTransaction extends Omit<Transaction, 'type' | 'metadata'> {
  type: 'debit';
  metadata: InvoiceDebitMetadata;
}

export interface PaymentCreditTransaction extends Omit<Transaction, 'type' | 'metadata'> {
  type: 'credit';
  metadata: PaymentCreditMetadata;
}

export interface ReversalTransaction extends Omit<Transaction, 'metadata'> {
  metadata: ReversalMetadata;
}

export interface AdjustmentTransaction extends Omit<Transaction, 'type' | 'metadata'> {
  type: 'adjustment';
  metadata: AdjustmentMetadata;
}

// Input types for creating transactions
export interface CreateTransactionInput {
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  metadata?: TransactionMetadata;
  reference_number?: string;
  status?: TransactionStatus;
}

export interface CreateInvoiceDebitInput {
  user_id: string;
  amount: number;
  invoice_id: string;
  invoice_number: string;
}

export interface CreatePaymentCreditInput {
  user_id: string;
  amount: number;
  invoice_id: string;
  invoice_number: string;
  payment_id: string;
}

// Balance-related types
export interface AccountBalance {
  user_id: string;
  current_balance: number;
  total_debits: number;
  total_credits: number;
  pending_amount: number;
  last_transaction_date: string | null;
}

export interface BalanceHistoryItem {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  created_at: string;
  status: TransactionStatus;
  metadata?: TransactionMetadata;
  running_balance?: number;
} 