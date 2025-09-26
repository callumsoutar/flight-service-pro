// AUTO-GENERATED FROM SUPABASE SCHEMA
export type BookingStatus = "unconfirmed" | "confirmed" | "briefing" | "flying" | "complete" | "cancelled";
export type BookingType = "flight" | "groundwork" | "maintenance" | "other";

export interface Booking {
  id: string;
  aircraft_id: string;
  user_id: string | null;
  instructor_id: string | null; // FK to instructors.id (the instructor record, not users table)
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string;
  remarks: string | null;
  lesson_id: string | null;
  flight_type_id: string | null;
  booking_type: BookingType | null;
  created_at: string;
  updated_at: string;
  // Flight authorization override fields
  authorization_override?: boolean;
  authorization_override_by?: string;
  authorization_override_at?: string;
  authorization_override_reason?: string;
  // Cancellation fields (now stored directly in bookings table)
  cancellation_category_id?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_notes?: string | null;
  cancelled_at?: string | null;
  // Optionally joined objects from Supabase
  user?: import("./users").User;
  instructor?: import("./users").User;
  aircraft?: import("./aircraft").Aircraft;
  flight_type?: import("./flight_types").FlightType;
  flight_logs?: import("./flight_logs").FlightLog[];
  cancellation_category?: CancellationCategory;
  cancelled_by_user?: import("./users").User;
}

export interface CancellationCategory {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  voided_at?: string | null;
}
