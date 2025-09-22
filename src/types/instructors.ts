export interface Instructor {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  rating: string | null; // Foreign key to instructor_categories table
  created_at: string;
  updated_at: string;
  // Optionally joined objects from Supabase
  user?: import("./users").User;
  instructor_category?: import("./instructor_categories").InstructorCategory; // Joined instructor category data
  aircraft_ratings?: import("./instructor_aircraft_ratings").InstructorAircraftRatingWithDetails[]; // Joined aircraft type ratings
} 