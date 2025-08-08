export interface Instructor {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Optionally joined objects from Supabase
  user?: import("./users").User;
} 