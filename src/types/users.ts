export type GenderEnum = "male" | "female" | "other" | "prefer_not_to_say";
export type UserRole = "admin" | "instructor" | "member" | "student";

export interface User {
  id: string; // uuid
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string; // date (YYYY-MM-DD)
  license_number?: string;
  license_expiry?: string; // date (YYYY-MM-DD)
  medical_expiry?: string; // date (YYYY-MM-DD)
  date_of_last_flight?: string; // timestamptz (ISO string)
  profile_image_url?: string;
  created_at: string; // timestamptz (ISO string)
  updated_at: string; // timestamptz (ISO string)
  street_address?: string;
  gender?: GenderEnum;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  company_name?: string;
  occupation?: string;
  employer?: string;
  notes?: string;
  account_balance?: number;
  // Role is now handled via user_roles junction table
} 