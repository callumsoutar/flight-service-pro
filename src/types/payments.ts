// TypeScript types for the payments table in Supabase

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
  invoice_id: string;
  transaction_id: string;
  amount: string; // numeric as string for precision
  payment_method: PaymentMethod;
  payment_reference?: string | null;
  notes?: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
} 