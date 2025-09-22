// Types for the flight_history_view database view

export interface FlightHistoryEntry {
  // Flight log data
  flight_log_id: string;
  booking_id: string;
  actual_start: string | null;
  actual_end: string | null;
  flight_time_hobbs: number | string | null;
  flight_time_tach: number | string | null;
  flight_time: number | string | null;
  route: string | null;
  passengers: string | null;
  flight_remarks: string | null;

  // Aircraft data
  aircraft_id: string | null;
  aircraft_registration: string | null;
  aircraft_type: string | null;

  // Instructor data
  instructor_id: string | null;
  instructor_first_name: string | null;
  instructor_last_name: string | null;
  instructor_email: string | null;

  // Lesson data
  lesson_progress_id: string | null;
  lesson_id: string | null;
  lesson_name: string | null;
  lesson_description: string | null;
  lesson_status: string | null;
  lesson_attempt: number | null;
  lesson_comments: string | null;
  lesson_highlights: string | null;
  areas_for_improvement: string | null;
  airmanship: string | null;
  focus_next_lesson: string | null;
  weather_conditions: string | null;
  safety_concerns: string | null;
  lesson_date: string | null;

  // Booking data
  user_id: string;
  booking_status: string;
  booking_purpose: string | null;
  booking_remarks: string | null;
  booking_start_time: string | null;
  booking_end_time: string | null;

  // Student data
  student_first_name: string | null;
  student_last_name: string | null;
  student_email: string | null;

  // Timestamps
  flight_log_created_at: string;
  flight_log_updated_at: string;
  booking_created_at: string;
  booking_updated_at: string;
}

export type FlightHistoryResponse = {
  flight_history: FlightHistoryEntry[];
};
