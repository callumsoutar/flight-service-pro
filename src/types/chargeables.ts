// Types for chargeables table (generated from Supabase)
export type ChargeableType =
  | 'aircraft_rental'
  | 'instructor_fee'
  | 'membership_fee'
  | 'landing_fee'
  | 'facility_rental'
  | 'product_sale'
  | 'service_fee'
  | 'other'
  | 'default_briefing'
  | 'airways_fees';

export const CHARGEABLE_TYPE_LABELS: Record<ChargeableType, string> = {
  aircraft_rental: 'Aircraft Rental',
  instructor_fee: 'Instructor Fee',
  membership_fee: 'Membership Fee',
  landing_fee: 'Landing Fee',
  facility_rental: 'Facility Rental',
  product_sale: 'Product Sale',
  service_fee: 'Service Fee',
  other: 'Other',
  default_briefing: 'Briefing Fee',
  airways_fees: 'Airways Fees',
};

export type Chargeable = {
  id: string;
  name: string;
  description: string | null;
  type: ChargeableType;
  rate: number;
  is_active: boolean | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChargeableInsert = {
  id?: string;
  name: string;
  description?: string | null;
  type: string;
  rate: number;
  is_active?: boolean | null;
  voided_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ChargeableUpdate = {
  id?: string;
  name?: string;
  description?: string | null;
  type?: string;
  rate?: number;
  is_active?: boolean | null;
  voided_at?: string | null;
  created_at?: string;
  updated_at?: string;
}; 