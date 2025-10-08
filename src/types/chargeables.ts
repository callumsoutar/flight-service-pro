// Types for chargeables table (generated from Supabase)

// ============================================
// CHARGEABLE TYPES (NEW TABLE)
// ============================================

export interface ChargeableType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChargeableTypeInsert {
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  // is_system defaults to false in database
}

export interface ChargeableTypeUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  // Cannot update code or is_system after creation
}

// ============================================
// CHARGEABLES
// ============================================

export interface Chargeable {
  id: string;
  name: string;
  description: string | null;
  chargeable_type_id: string; // FK to chargeable_types
  chargeable_types?: ChargeableType; // Joined data from Supabase
  rate: number;
  is_taxable: boolean;
  is_active: boolean | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ChargeableInsert = {
  id?: string;
  name: string;
  description?: string | null;
  chargeable_type_id: string; // Changed from type
  rate: number;
  is_taxable?: boolean;
  is_active?: boolean | null;
  voided_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ChargeableUpdate = {
  id?: string;
  name?: string;
  description?: string | null;
  chargeable_type_id?: string; // Changed from type
  rate?: number;
  is_taxable?: boolean;
  is_active?: boolean | null;
  voided_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ============================================
// LANDING FEE RATES
// ============================================

// Landing fee rates - aircraft-type-specific pricing
export type LandingFeeRate = {
  id: string;
  chargeable_id: string;
  aircraft_type_id: string;
  rate: number;
  created_at: string;
  updated_at: string;
};

export type LandingFeeRateInsert = {
  chargeable_id: string;
  aircraft_type_id: string;
  rate: number;
};

export type LandingFeeRateUpdate = {
  rate: number;
};

// Extended chargeable with aircraft-specific rates
export interface ChargeableWithAircraftRates extends Chargeable {
  landing_fee_rates?: LandingFeeRate[];
}

// ============================================
// HELPER TYPES & CONSTANTS
// ============================================

// Common chargeable type codes (for convenience)
export const CHARGEABLE_TYPE_CODES = {
  AIRCRAFT_RENTAL: 'aircraft_rental',
  INSTRUCTOR_FEE: 'instructor_fee',
  MEMBERSHIP_FEE: 'membership_fee',
  LANDING_FEE: 'landing_fee',
  FACILITY_RENTAL: 'facility_rental',
  PRODUCT_SALE: 'product_sale',
  SERVICE_FEE: 'service_fee',
  OTHER: 'other',
  DEFAULT_BRIEFING: 'default_briefing',
  AIRWAYS_FEES: 'airways_fees',
} as const;

export type ChargeableTypeCode = typeof CHARGEABLE_TYPE_CODES[keyof typeof CHARGEABLE_TYPE_CODES];
