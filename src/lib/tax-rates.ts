import { createClient } from './SupabaseServerClient';
import type { TaxRate } from '@/types/tax_rates';

/**
 * Get the organization's tax rate (single-tenant architecture)
 * In a single-tenant system, there's only one tax rate per organization
 * marked as is_default = true
 */
export async function getOrganizationTaxRate(): Promise<number> {
  return await getDefaultTaxRate();
}

/**
 * @deprecated Use getOrganizationTaxRate() instead
 * For backward compatibility - in single-tenant architecture, 
 * all users use the organization's tax rate
 */
export async function getTaxRateForUser(): Promise<number> {
  console.warn('getTaxRateForUser is deprecated in single-tenant architecture. Use getOrganizationTaxRate() instead.');
  return await getOrganizationTaxRate();
}

/**
 * Get the default tax rate (marked as is_default = true)
 */
export async function getDefaultTaxRate(): Promise<number> {
  const supabase = await createClient();
  
  try {
    const { data: defaultRate, error } = await supabase
      .from('tax_rates')
      .select('rate')
      .eq('is_default', true)
      .eq('is_active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !defaultRate) {
      console.warn('No default tax rate found, using 0.15 (15%)');
      return 0.15; // Fallback to 15%
    }
    
    return defaultRate.rate;
  } catch (error) {
    console.error('Error fetching default tax rate:', error);
    return 0.15; // Fallback to 15%
  }
}

/**
 * Get all active tax rates
 */
export async function getAllTaxRates(): Promise<TaxRate[]> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('is_active', true)
      .order('country_code', { ascending: true })
      .order('region_code', { ascending: true })
      .order('effective_from', { ascending: false });
    
    if (error) {
      console.error('Error fetching tax rates:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return [];
  }
}

/**
 * Create a new tax rate
 */
export async function createTaxRate(taxRate: Omit<TaxRate, 'id' | 'created_at' | 'updated_at'>): Promise<TaxRate | null> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('tax_rates')
      .insert([taxRate])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating tax rate:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating tax rate:', error);
    return null;
  }
} 