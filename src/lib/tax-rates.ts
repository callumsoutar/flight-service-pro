import { createClient } from './SupabaseServerClient';

export interface TaxRate {
  id: string;
  country_code: string;
  region_code: string | null;
  tax_name: string;
  rate: number;
  is_default: boolean;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get the appropriate tax rate for a user based on their location
 * Falls back to default rate if no specific rate is found
 */
export async function getTaxRateForUser(userId: string): Promise<number> {
  const supabase = await createClient();
  
  try {
    // 1. Get user's country/region from their profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('country, state')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.warn('Could not fetch user profile for tax rate, using default');
      return await getDefaultTaxRate();
    }
    
    const countryCode = user.country?.toUpperCase();
    const regionCode = user.state?.toUpperCase();
    
    if (!countryCode) {
      console.warn('No country code found for user, using default tax rate');
      return await getDefaultTaxRate();
    }
    
    // 2. Try to find a specific tax rate for the user's location
    const query = supabase
      .from('tax_rates')
      .select('*')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('effective_from', { ascending: false });
    
    if (regionCode) {
      // First try to find a region-specific rate
      const { data: regionRate } = await query
        .eq('region_code', regionCode)
        .limit(1)
        .single();
      
      if (regionRate) {
        console.log(`Found region-specific tax rate: ${regionRate.rate} for ${countryCode}-${regionCode}`);
        return regionRate.rate;
      }
    }
    
    // 3. Try to find a country-specific rate (no region)
    const { data: countryRate } = await query
      .is('region_code', null)
      .limit(1)
      .single();
    
    if (countryRate) {
      console.log(`Found country-specific tax rate: ${countryRate.rate} for ${countryCode}`);
      return countryRate.rate;
    }
    
    // 4. Fall back to default rate
    console.warn(`No tax rate found for ${countryCode}${regionCode ? `-${regionCode}` : ''}, using default`);
    return await getDefaultTaxRate();
    
  } catch (error) {
    console.error('Error fetching tax rate for user:', error);
    return await getDefaultTaxRate();
  }
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