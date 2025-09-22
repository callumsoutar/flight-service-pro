export interface AircraftType {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type AircraftTypeInsert = {
  name: string;
  category?: string | null;
  description?: string | null;
};

export type AircraftTypeUpdate = {
  name?: string;
  category?: string | null;
  description?: string | null;
};

// For API responses that include related data
export interface AircraftTypeWithStats extends AircraftType {
  aircraft_count?: number;
  instructor_count?: number;
}
