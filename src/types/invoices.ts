// Types for invoices table (generated from Supabase)
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export interface Invoice {
  id: string;
  user_id: string;
  booking_id?: string | null;
  invoice_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  status: InvoiceStatus;
  subtotal: number | null;
  tax_rate?: number | null;
  tax_total: number | null; // Changed from 'tax_amount' to match database
  total_amount: number | null;
  total_paid: number | null; // Changed from 'paid' to match database
  balance_due: number | null;
  paid_date?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Optionally joined objects from Supabase
  user?: import("./users").User;
  booking?: import("./bookings").Booking;
}

// InvoiceItem moved to separate file: @/types/invoice_items

export type InvoiceInsert = {
  id?: string;
  user_id: string;
  booking_id?: string | null;
  invoice_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  status?: InvoiceStatus;
  subtotal?: number | null;
  tax_total?: number | null; // Changed from 'tax_amount' to match database
  tax_rate?: number | null;
  total_amount?: number | null;
  total_paid?: number | null; // Changed from 'paid' to match database
  balance_due?: number | null;
  paid_date?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type InvoiceUpdate = {
  id?: string;
  user_id?: string;
  booking_id?: string | null;
  invoice_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  status?: InvoiceStatus;
  subtotal?: number | null;
  tax_total?: number | null; // Changed from 'tax_amount' to match database
  tax_rate?: number | null;
  total_amount?: number | null;
  total_paid?: number | null; // Changed from 'paid' to match database
  balance_due?: number | null;
  paid_date?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}; 