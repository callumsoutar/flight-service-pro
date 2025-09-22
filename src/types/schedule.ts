import { ShiftOverrideType } from './shift-overrides';

export interface ScheduleShift {
  id: string;
  start_time: string;
  end_time: string;
  type: 'regular' | ShiftOverrideType;
  notes: string | null;
  replaces_rule_id?: string | null;
}

export interface DaySchedule {
  date: string; // ISO date
  day_of_week: number;
  shifts: ScheduleShift[];
}

export interface WeekSchedule {
  week_start: string; // ISO date
  instructor_id: string;
  days: DaySchedule[];
}

export interface ScheduleConflict {
  has_conflict: boolean;
  conflicting_shifts?: ScheduleShift[];
}

export interface ConflictCheckRequest {
  instructor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  exclude_rule_id?: string | null;
  exclude_override_id?: string | null;
}

export interface WeekScheduleRequest {
  instructor_id: string;
  week_start_date: string; // ISO date (should be a Monday)
}

// Helper functions for date calculations
export const getWeekStart = (date: Date): Date => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(date.setDate(diff));
};

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatTimeForAPI = (time: string): string => {
  // Ensure time is in HH:MM format
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

export const parseTimeForDisplay = (time: string): string => {
  // Convert database time to display format (e.g., 09:00 to 9:00 AM)
  const [hours, minutes] = time.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
};

export const sortShiftsByTime = (shifts: ScheduleShift[]): ScheduleShift[] => {
  return shifts.sort((a, b) => a.start_time.localeCompare(b.start_time));
};
