export interface MaintenanceVisit {
  id: string;
  aircraft_id: string;
  component_id?: string | null;
  visit_date: string; // ISO date string
  date_out_of_maintenance?: string | null;
  visit_type: string; // 'Scheduled', 'Unscheduled', 'Emergency'
  description: string;
  technician_name?: string | null;
  hours_at_visit?: number | null;
  total_cost?: number | null;
  status: string; // 'Scheduled', 'In Progress', 'Completed'
  notes?: string | null;
  created_at: string;
  updated_at: string;
  booking_id?: string | null;
  scheduled_for?: string | null;
  scheduled_end?: string | null;
  scheduled_by?: string | null;
} 