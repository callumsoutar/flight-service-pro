export interface FlightType {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  // Add other fields as needed
} 