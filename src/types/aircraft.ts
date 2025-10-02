export type TotalTimeMethod = "hobbs" | "tacho" | "airswitch" | "hobbs less 5%" | "hobbs less 10%" | "tacho less 5%" | "tacho less 10%";

export interface Aircraft {
  id: string;
  registration: string;
  type?: string; // Keep for backward compatibility during migration
  aircraft_type_id?: string | null; // New foreign key
  model?: string | null;
  manufacturer?: string | null;
  year_manufactured?: number | null;
  total_hours?: number | null;
  status?: string;
  capacity?: number | null;
  created_at?: string;
  updated_at: string;
  current_tach?: number | null;
  current_hobbs?: number | null;
  record_tacho?: boolean;
  record_hobbs?: boolean;
  record_airswitch?: boolean;
  on_line?: boolean;
  for_ato?: boolean;
  fuel_consumption?: number | null;
  prioritise_scheduling?: boolean;
  aircraft_image_url?: string | null;
  total_time_method?: TotalTimeMethod | null;
  // Optional joined aircraft type data
  aircraft_type?: import("./aircraft_types").AircraftType;
} 