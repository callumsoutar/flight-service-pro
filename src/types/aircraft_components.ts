export type ComponentType =
  | 'battery'
  | 'inspection'
  | 'service'
  | 'engine'
  | 'fuselage'
  | 'avionics'
  | 'elt'
  | 'propeller'
  | 'landing_gear'
  | 'other';

export type ComponentStatus = 'active' | 'inactive' | 'removed';

export type IntervalType = 'HOURS' | 'CALENDAR' | 'BOTH';

export interface AircraftComponent {
  id: string;
  aircraft_id: string;
  name: string;
  description?: string | null;
  component_type: ComponentType;
  interval_type: IntervalType;
  interval_hours?: number | null;
  interval_days?: number | null;
  current_due_date?: string | null; // ISO date string
  current_due_hours?: number | null;
  last_completed_date?: string | null; // ISO date string
  last_completed_hours?: number | null;
  status: ComponentStatus;
  priority?: string | null; // 'LOW', 'MEDIUM', 'HIGH'
  notes?: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  scheduled_due_hours?: number | null;
  extension_limit_hours?: number | null;
} 