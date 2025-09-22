import { Instructor } from './instructors';
import { RosterRule } from './roster';

export type ShiftOverrideType = 'add' | 'replace' | 'cancel';

export interface ShiftOverride {
  id: string;
  instructor_id: string;
  override_date: string; // ISO date
  override_type: ShiftOverrideType;
  start_time: string | null; // null for 'cancel' type
  end_time: string | null;   // null for 'cancel' type
  replaces_rule_id: string | null; // For 'replace' type
  notes: string | null;
  created_at: string;
  updated_at: string;
  voided_at: string | null; // ISO timestamp or null
  
  // Optional joined data
  instructor?: Instructor;
  replaces_rule?: RosterRule;
}

export interface CreateShiftOverrideRequest {
  instructor_id: string;
  override_date: string;
  override_type: ShiftOverrideType;
  start_time?: string | null;
  end_time?: string | null;
  replaces_rule_id?: string | null;
  notes?: string | null;
}

export interface UpdateShiftOverrideRequest {
  override_date?: string;
  override_type?: ShiftOverrideType;
  start_time?: string | null;
  end_time?: string | null;
  replaces_rule_id?: string | null;
  notes?: string | null;
}

export interface ShiftOverrideFormData {
  instructor_id: string;
  override_date: string;
  override_type: ShiftOverrideType;
  start_time: string;
  end_time: string;
  replaces_rule_id: string | null;
  notes: string;
}

// Helper types for override type display
export interface OverrideTypeOption {
  value: ShiftOverrideType;
  label: string;
  description: string;
}

export const SHIFT_OVERRIDE_TYPES: OverrideTypeOption[] = [
  { 
    value: 'add', 
    label: 'Add Shift', 
    description: 'Add an extra shift for this date' 
  },
  { 
    value: 'replace', 
    label: 'Replace Shift', 
    description: 'Replace a regular shift with different times' 
  },
  { 
    value: 'cancel', 
    label: 'Cancel Shift', 
    description: 'Cancel a regular shift for this date' 
  },
];
