export interface Instructor {
  /** Unique identifier for this instructor record */
  id: string;
  /** User ID of the instructor */
  user_id: string;
  /** Organization ID where the instructor is valid */
  organization_id: string;
  /** User ID of the approver (optional) */
  approved_by?: string | null;
  /** Timestamp when instructor status was approved */
  approved_at: string;
  /** Timestamp when instructor status expires (optional) */
  expires_at?: string | null;
  /** Date when next instructor check is due (optional) */
  instructor_check_due_date?: string | null;
  /** Date when next instrument check is due (optional) */
  instrument_check_due_date?: string | null;
  /** Whether the instructor is actively instructing */
  is_actively_instructing: boolean;
  /** Status of the instructor: 'active', 'inactive', 'deactivated', 'suspended' */
  status: 'active' | 'inactive' | 'deactivated' | 'suspended';
  /** Date when class 1 medical is due (optional) */
  class_1_medical_due_date?: string | null;
  /** Freeform notes about the instructor (optional) */
  notes?: string | null;
  /** Employment type (full_time, part_time, casual, contractor) */
  employment_type?: 'full_time' | 'part_time' | 'casual' | 'contractor' | null;
  /** Record creation timestamp */
  created_at: string;
  /** Record last update timestamp */
  updated_at: string;
} 