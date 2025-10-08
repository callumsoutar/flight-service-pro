export type PaymentMethod = 
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'check'
  | 'online_payment'
  | 'other';

export interface Payment {
  id: string;
  invoice_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference: string | null; // User-provided reference (check #, transaction ID, etc.)
  payment_number: string | null; // Auto-generated payment reference (PAY-2025-10-0001)
  notes: string | null;
  transaction_id: string;
  created_at: string;
  updated_at: string;
  metadata?: PaymentMetadata;
}

export interface PaymentMetadata {
  // Reversal fields
  reverses_payment_id?: string;
  reversed_by_payment_id?: string;
  reversal_reason?: string;
  reversed_at?: string;
  reversed_by_user_id?: string;
  reversal_type?: 'payment_reversal';
  
  // Correction fields
  corrects_payment_id?: string;
  correction_reason?: string;
  corrected_by_user_id?: string;
  original_amount?: number;
  
  // Replacement tracking
  replaced_by_payment_id?: string;
}

export type PaymentType = 'normal' | 'reversal' | 'correction' | 'reversed';

export interface PaymentWithHistory extends Payment {
  payment_type: PaymentType;
  reverses_payment_id?: string | null;
  reversed_by_payment_id?: string | null;
  corrects_payment_id?: string | null;
  replaced_by_payment_id?: string | null;
  reversal_reason?: string | null;
  correction_reason?: string | null;
  reversed_at?: string | null;
  user_id?: string;
  user_name?: string;
  user_email?: string;
}

export interface ReversePaymentRequest {
  reason: string;
  correct_amount?: number;
  notes?: string;
}

export interface ReversePaymentResponse {
  success: boolean;
  reversal_payment_id?: string;
  reversal_transaction_id?: string;
  original_payment_id?: string;
  reversed_amount?: number;
  invoice_id?: string;
  user_id?: string;
  new_total_paid?: number;
  new_balance_due?: number;
  new_status?: string;
  message?: string;
  error?: string; // For error responses
  // For reverse_and_replace
  correct_payment_id?: string;
  correct_transaction_id?: string;
  correct_amount?: number;
  amount_difference?: number;
  reversed_by?: string;
}
