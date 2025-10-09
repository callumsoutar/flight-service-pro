import { createClient } from "@/lib/SupabaseServerClient";

/**
 * Server-side utility to fetch settings from the database
 * Use this in API routes and server components
 */

/**
 * Get the default number of days until invoice payment is due
 * @returns number of days (defaults to 7 if setting not found)
 */
export async function getDefaultInvoiceDueDays(): Promise<number> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('settings')
      .select('setting_value')
      .eq('category', 'invoicing')
      .eq('setting_key', 'default_invoice_due_days')
      .single();
    
    if (error || !data) {
      console.warn('Failed to fetch default_invoice_due_days setting, using default: 7');
      return 7; // Fallback default
    }
    
    // setting_value is stored as JSONB, could be a number or string
    const value = typeof data.setting_value === 'number' 
      ? data.setting_value 
      : parseInt(String(data.setting_value), 10);
    
    // Validate the value is a reasonable number
    if (isNaN(value) || value < 1 || value > 365) {
      console.warn(`Invalid default_invoice_due_days value: ${value}, using default: 7`);
      return 7;
    }
    
    return value;
  } catch (error) {
    console.error('Error fetching default_invoice_due_days:', error);
    return 7; // Fallback default
  }
}

/**
 * Calculate a due date from today based on the number of days
 * @param days - number of days from now
 * @returns ISO date string
 */
export function calculateDueDate(days: number): string {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate.toISOString();
}

/**
 * Get the default due date for a new invoice
 * Uses the default_invoice_due_days setting
 * @returns ISO date string
 */
export async function getDefaultInvoiceDueDate(): Promise<string> {
  const days = await getDefaultInvoiceDueDays();
  return calculateDueDate(days);
}

