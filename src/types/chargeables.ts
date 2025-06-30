// Types for chargeables table (generated from Supabase)
export type Chargeable = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  type: string;
  rate: number;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

export type ChargeableInsert = {
  id?: string;
  organization_id: string;
  name: string;
  description?: string | null;
  type: string;
  rate: number;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type ChargeableUpdate = {
  id?: string;
  organization_id?: string;
  name?: string;
  description?: string | null;
  type?: string;
  rate?: number;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
}; 