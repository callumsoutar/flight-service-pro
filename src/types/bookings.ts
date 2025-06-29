// AUTO-GENERATED FROM SUPABASE SCHEMA
export type BookingStatus = "unconfirmed" | "confirmed" | "briefing" | "flying" | "complete";
export type BookingType = "flight" | "groundwork" | "maintenance" | "other";

export interface Booking {
  id: string;
  organization_id: string;
  aircraft_id: string;
  user_id: string;
  instructor_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string;
  remarks: string | null;
  lesson_id: string | null;
  flight_type_id: string | null;
  booking_type: BookingType | null;
  briefing_completed: boolean;
  checked_out_aircraft_id: string | null;
  checked_out_instructor_id: string | null;
  hobbs_start: number | null;
  hobbs_end: number | null;
  tach_start: number | null;
  tach_end: number | null;
  flight_time: number | null;
  created_at: string;
  updated_at: string;
  // Optionally joined objects from Supabase
  user?: import("./users").User;
  instructor?: import("./users").User;
  aircraft?: import("./aircraft").Aircraft;
} 