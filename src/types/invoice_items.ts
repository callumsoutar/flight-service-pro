// Types for invoice_items table (generated from Supabase)
export type InvoiceItem = {
  id: string;
  invoice_id: string;
  chargeable_id: string | null;
  description: string;
  quantity: number;
  rate: number;
  rate_inclusive: number; // tax-inclusive rate
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceItemInsert = {
  id?: string;
  invoice_id: string;
  chargeable_id?: string | null;
  description: string;
  quantity?: number;
  rate: number;
  rate_inclusive?: number;
  amount: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
};

export type InvoiceItemUpdate = {
  id?: string;
  invoice_id?: string;
  chargeable_id?: string | null;
  description?: string;
  quantity?: number;
  rate?: number;
  rate_inclusive?: number;
  amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  created_at?: string;
  updated_at?: string;
}; 