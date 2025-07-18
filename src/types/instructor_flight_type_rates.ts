export interface InstructorFlightTypeRate {
  id: string;
  instructor_id: string;
  flight_type_id: string;
  organization_id: string;
  rate: number;
  currency: string;
  effective_from: string; // ISO date string
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
} 