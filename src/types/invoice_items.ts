// Types for invoice_items table (generated from Supabase)
export type InvoiceItem = {
  id: string;
  invoice_id: string;
  chargeable_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  rate_inclusive: number | null; // Calculated by application: unit_price * (1 + tax_rate)
  amount: number; // Calculated by application: quantity * unit_price
  tax_rate: number | null;
  tax_amount: number | null; // Calculated by application: amount * tax_rate
  line_total: number | null; // Calculated by application: amount + tax_amount
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItemInsert = {
  id?: string;
  invoice_id: string;
  chargeable_id?: string | null;
  description: string;
  quantity?: number;
  unit_price: number;
  tax_rate?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type InvoiceItemUpdate = {
  id?: string;
  invoice_id?: string;
  chargeable_id?: string | null;
  description?: string;
  quantity?: number;
  unit_price?: number;
  tax_rate?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}; 