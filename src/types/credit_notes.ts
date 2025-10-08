/**
 * Credit Note Types
 * 
 * Credit notes are used to correct approved invoices.
 * Once an invoice is approved, it cannot be modified directly.
 * Instead, a credit note must be created to adjust the amount.
 */

export type CreditNoteStatus = 'draft' | 'applied' | 'cancelled';

export interface CreditNote {
  id: string;
  credit_note_number: string;
  original_invoice_id: string;
  user_id: string;
  reason: string;
  status: CreditNoteStatus;
  issue_date: string;
  applied_date: string | null;
  subtotal: number;
  tax_total: number;
  total_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  original_invoice_item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CreditNoteWithInvoice extends CreditNote {
  invoices?: {
    invoice_number: string;
    status: string;
    total_amount: number;
  };
}

export interface CreditNoteWithItems extends CreditNote {
  credit_note_items: CreditNoteItem[];
}

export interface CreateCreditNoteParams {
  original_invoice_id: string;
  user_id: string;
  reason: string;
  notes?: string;
  items: CreateCreditNoteItemParams[];
}

export interface CreateCreditNoteItemParams {
  original_invoice_item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface ApplyCreditNoteResult {
  success: boolean;
  credit_note_id?: string;
  credit_note_number?: string;
  transaction_id?: string;
  amount_credited?: number;
  new_balance?: number;
  applied_date?: string;
  message?: string;
  error?: string;
}

export interface SoftDeleteCreditNoteResult {
  success: boolean;
  credit_note_id?: string;
  credit_note_number?: string;
  items_deleted?: number;
  deleted_at?: string;
  error?: string;
}

