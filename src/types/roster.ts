import { Instructor } from './instructors';

export interface RosterRule {
  id: string;
  instructor_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  is_active: boolean;
  effective_from: string; // ISO date
  effective_until: string | null; // ISO date or null
  notes: string | null;
  created_at: string;
  updated_at: string;
  voided_at: string | null; // ISO timestamp or null
  
  // Optional joined data
  instructor?: Instructor;
}

export interface CreateRosterRuleRequest {
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from?: string;
  effective_until?: string | null;
  notes?: string | null;
}

export interface UpdateRosterRuleRequest {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
  effective_from?: string;
  effective_until?: string | null;
  notes?: string | null;
}

export interface RosterRuleFormData {
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_until: string | null;
  notes: string;
}

// Helper type for day of week display
export interface DayOfWeekOption {
  value: number;
  label: string;
  abbreviation: string;
}

export const DAYS_OF_WEEK: DayOfWeekOption[] = [
  { value: 0, label: 'Sunday', abbreviation: 'Sun' },
  { value: 1, label: 'Monday', abbreviation: 'Mon' },
  { value: 2, label: 'Tuesday', abbreviation: 'Tue' },
  { value: 3, label: 'Wednesday', abbreviation: 'Wed' },
  { value: 4, label: 'Thursday', abbreviation: 'Thu' },
  { value: 5, label: 'Friday', abbreviation: 'Fri' },
  { value: 6, label: 'Saturday', abbreviation: 'Sat' },
];
