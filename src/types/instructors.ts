export interface Instructor {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  rating: string | null; // Foreign key to instructor_categories table
  created_at: string;
  updated_at: string;
  // Status and employment
  status: "active" | "inactive" | "deactivated" | "suspended";
  employment_type: "full_time" | "part_time" | "casual" | "contractor" | null;
  hire_date: string | null;
  termination_date: string | null;
  hourly_rate: number | null;
  // Approval and certification
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  instructor_check_due_date: string | null;
  instrument_check_due_date: string | null;
  is_actively_instructing: boolean;
  class_1_medical_due_date: string | null;
  notes: string | null;
  // Endorsement columns
  night_removal: boolean;
  aerobatics_removal: boolean;
  multi_removal: boolean;
  tawa_removal: boolean;
  ifr_removal: boolean;
  // Optionally joined objects from Supabase
  user?: import("./users").User;
  instructor_category?: import("./instructor_categories").InstructorCategory; // Joined instructor category data
  aircraft_ratings?: import("./instructor_aircraft_ratings").InstructorAircraftRatingWithDetails[]; // Joined aircraft type ratings
} 