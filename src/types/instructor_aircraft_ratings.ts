export interface InstructorAircraftRating {
  id: string;
  instructor_id: string;
  aircraft_type_id: string;
  certified_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InstructorAircraftRatingInsert = {
  instructor_id: string;
  aircraft_type_id: string;
  certified_date?: string | null;
  notes?: string | null;
};

export type InstructorAircraftRatingUpdate = {
  certified_date?: string | null;
  notes?: string | null;
};

// For API responses that include related data
export interface InstructorAircraftRatingWithDetails extends InstructorAircraftRating {
  instructor?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    user?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  };
  aircraft_type?: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
  };
}

// For validation responses
export interface TypeRatingValidation {
  valid: boolean;
  message?: string;
  rating?: InstructorAircraftRatingWithDetails;
}
