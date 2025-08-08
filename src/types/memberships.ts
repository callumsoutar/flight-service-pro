// Membership Types and Interfaces

export type MembershipStatus = "active" | "expired" | "grace" | "unpaid" | "none";

export interface MembershipType {
  id: string;
  name: string; // "Flying Member", "Social Member"
  code: string; // "flying_member", "social_member"
  description?: string;
  price: number; // Annual fee
  duration_months: number; // 12 for annual, 1 for monthly
  is_active: boolean;
  benefits: string[]; // Array of membership benefits
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  membership_type_id: string; // UUID foreign key to membership_types.id
  membership_types?: MembershipType; // Joined data from Supabase
  start_date: string;
  end_date?: string;
  expiry_date: string;
  purchased_date: string;
  is_active: boolean;
  fee_paid: boolean;
  amount_paid?: number;
  invoice_id?: string; // Link to payment invoice
  renewal_of?: string; // ID of membership this renews
  auto_renew: boolean;
  grace_period_days: number;
  notes?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipRenewal {
  id: string;
  old_membership_id: string;
  new_membership_id: string;
  renewed_by: string;
  renewal_date: string;
  notes?: string;
}

export interface MembershipSummary {
  current_membership?: Membership;
  status: MembershipStatus;
  days_until_expiry?: number;
  grace_period_remaining?: number;
  can_renew: boolean;
  membership_history: Membership[];
}

// For form handling
export interface CreateMembershipRequest {
  user_id: string;
  membership_type_id: string;
  start_date?: string; // Defaults to today
  expiry_date?: string; // Calculated from type duration
  auto_renew?: boolean;
  notes?: string;
}

export interface RenewMembershipRequest {
  membership_id: string;
  membership_type_id?: string; // Can change type during renewal
  auto_renew?: boolean;
  notes?: string;
}

// Constants
export const DEFAULT_GRACE_PERIOD_DAYS = 30; 