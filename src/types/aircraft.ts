export interface Aircraft {
  id: string;
  organization_id: string;
  registration: string;
  type?: string;
  manufacturer?: string | null;
  year_manufactured?: number | null;
  total_hours: string;
  last_maintenance_date?: string | null; 
  next_maintenance_date?: string | null;
  status?: string;
  capacity?: number | null;
  created_at?: string;
  updated_at: string;
  current_tach: string;
  current_hobbs: string;
  record_tacho: boolean;
  record_hobbs: boolean;
  record_airswitch: boolean;
  on_line: boolean;
  for_ato: boolean;
  fuel_consumption?: number | null;
  engine_count: number;
  prioritise_scheduling: boolean;
  aircraft_image_url?: string | null;
  // Add other fields as needed
} 