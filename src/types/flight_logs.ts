export interface FlightLog {
  id: string;
  booking_id: string;
  checked_out_aircraft_id?: string | null;
  checked_out_instructor_id?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  eta?: string | null;
  hobbs_start?: number | null;
  hobbs_end?: number | null;
  tach_start?: number | null;
  tach_end?: number | null;
  flight_time_hobbs?: number | null;
  flight_time_tach?: number | null;
  flight_time?: number | null;
  fuel_on_board?: number | null;
  passengers?: string | null;
  route?: string | null;
  equipment?: unknown | null;
  briefing_completed: boolean;
  authorization_completed: boolean;
  flight_remarks?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  checked_out_aircraft?: import("./aircraft").Aircraft;
  checked_out_instructor?: import("./instructors").Instructor;
}

export type FlightLogInsert = Omit<FlightLog, 'id' | 'created_at' | 'updated_at'>;
export type FlightLogUpdate = Partial<FlightLogInsert>;
