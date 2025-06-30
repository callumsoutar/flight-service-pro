// Types for tax_rates table (generated from Supabase)
export type TaxRate = {
  id: string;
  organization_id: string;
  country_code: string;
  region_code: string | null;
  tax_name: string;
  rate: number;
  is_default: boolean;
  effective_from: string;
  created_at: string;
  updated_at: string;
};

export type TaxRateInsert = {
  id?: string;
  organization_id: string;
  country_code: string;
  region_code?: string | null;
  tax_name: string;
  rate: number;
  is_default?: boolean;
  effective_from?: string;
  created_at?: string;
  updated_at?: string;
};

export type TaxRateUpdate = {
  id?: string;
  organization_id?: string;
  country_code?: string;
  region_code?: string | null;
  tax_name?: string;
  rate?: number;
  is_default?: boolean;
  effective_from?: string;
  created_at?: string;
  updated_at?: string;
}; 