export type GenderEnum = "male" | "female";
export type UserRole = "admin" | "instructor" | "member" | "student";

export interface User {
  id: string; // uuid
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string; // date (YYYY-MM-DD)
  gender?: GenderEnum;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  emergency_contact_relationship?: string;
  medical_certificate_expiry?: string; // date (YYYY-MM-DD)
  class_1_medical_due?: string; // date (YYYY-MM-DD) - for reference/reminder purposes only
  class_2_medical_due?: string; // date (YYYY-MM-DD) - for reference/reminder purposes only
  DL9_due?: string; // date (YYYY-MM-DD) - for reference/reminder purposes only
  BFR_due?: string; // date (YYYY-MM-DD) - for reference/reminder purposes only
  pilot_license_number?: string;
  pilot_license_type?: string; // Keep for backward compatibility
  pilot_license_id?: string; // Foreign key to licenses table
  pilot_license_expiry?: string; // date (YYYY-MM-DD)
  date_of_last_flight?: string; // timestamptz (ISO string)
  company_name?: string;
  occupation?: string;
  employer?: string;
  notes?: string;
  account_balance: number; // numeric, not nullable, default 0.00
  is_active: boolean; // boolean, not nullable, default true
  public_directory_opt_in: boolean; // boolean, not nullable, default false
  has_auth_account?: boolean; // computed field indicating if user has auth.users record
  created_at: string; // timestamptz (ISO string)
  updated_at: string; // timestamptz (ISO string)
  // Role is now handled via user_roles junction table
} 