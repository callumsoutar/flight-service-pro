// AUTO-GENERATED: Types for flight_experience table from Supabase

export type FlightExperience = {
  id: string;
  lesson_progress_id: string;
  booking_id: string;
  user_id: string;
  instructor_id: string;
  experience_type_id: string;
  duration_hours: number;
  notes: string | null;
  conditions: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type FlightExperienceInsert = {
  id?: string;
  lesson_progress_id: string;
  booking_id: string;
  user_id: string;
  instructor_id: string;
  experience_type_id: string;
  duration_hours: number;
  notes?: string | null;
  conditions?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
};

export type FlightExperienceUpdate = {
  id?: string;
  lesson_progress_id?: string;
  booking_id?: string;
  user_id?: string;
  instructor_id?: string;
  experience_type_id?: string;
  duration_hours?: number;
  notes?: string | null;
  conditions?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
};

// Extended types with related data for API responses
export type FlightExperienceWithDetails = FlightExperience & {
  experience_type: {
    id: string;
    name: string;
    description: string | null;
  };
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
  instructor: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
  lesson_progress: {
    id: string;
    lesson_id: string | null;
    date: string;
  };
  booking: {
    id: string;
    start_time: string;
    end_time: string;
    flight_time: number | null;
  };
};

// Summary types for reporting
export type FlightExperienceSummary = {
  experience_type: string;
  total_hours: number;
  lesson_count: number;
  first_flight: string;
  last_flight: string;
};

export type UserFlightExperienceSummary = {
  user_id: string;
  user_name: string;
  total_flight_time: number;
  experience_breakdown: FlightExperienceSummary[];
};
