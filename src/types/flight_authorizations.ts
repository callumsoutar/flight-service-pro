// AUTO-GENERATED FROM SUPABASE SCHEMA
export type AuthorizationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PaymentMethod = 'account' | 'credit' | 'debit' | 'cash' | 'eftpos';
export type PurposeOfFlight = 'training' | 'solo' | 'checkride' | 'crosscountry' | 'scenic' | 'maintenance';

export interface FlightAuthorization {
  id: string;
  booking_id: string;
  student_id: string;
  aircraft_id: string;
  flight_type_id: string | null;
  authorizing_instructor_id: string | null;
  approving_instructor_id: string | null;
  status: AuthorizationStatus;
  
  // Flight Details
  purpose_of_flight: PurposeOfFlight;
  passenger_names: string[] | null;
  runway_in_use: string | null;
  flight_date: string;
  
  // Fuel and Oil Levels
  fuel_level_liters: number | null;
  oil_level_quarts: number | null;
  
  // Pre-flight Checks
  notams_reviewed: boolean;
  weather_briefing_complete: boolean;
  
  // Payment Information
  payment_method: PaymentMethod | null;
  
  // Student Signature
  student_signature_data: string | null;
  student_signed_at: string | null;
  
  // Instructor Authorization
  instructor_notes: string | null;
  instructor_limitations: string | null;
  
  // Workflow timestamps
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Optionally joined objects from Supabase
  booking?: import("./bookings").Booking;
  student?: import("./users").User;
  aircraft?: import("./aircraft").Aircraft;
  flight_type?: import("./flight_types").FlightType;
  authorizing_instructor?: import("./instructors").Instructor;
  approving_instructor?: import("./instructors").Instructor;
}

export interface FlightAuthorizationFormData {
  purpose_of_flight: PurposeOfFlight;
  passenger_names: string[];
  runway_in_use: string;
  fuel_level_liters: number;
  oil_level_quarts: number;
  notams_reviewed: boolean;
  weather_briefing_complete: boolean;
  payment_method: PaymentMethod;
  authorizing_instructor_id: string;
  student_signature_data?: string;
  instructor_notes?: string;
  instructor_limitations?: string;
}

export interface FlightAuthorizationCreateRequest {
  booking_id: string;
  purpose_of_flight: PurposeOfFlight;
  passenger_names?: string[];
  runway_in_use?: string;
  fuel_level_liters?: number;
  oil_level_quarts?: number;
  notams_reviewed?: boolean;
  weather_briefing_complete?: boolean;
  payment_method?: PaymentMethod;
  authorizing_instructor_id?: string;
  student_signature_data?: string;
  instructor_notes?: string;
  instructor_limitations?: string;
}

export interface FlightAuthorizationUpdateRequest {
  id: string;
  purpose_of_flight?: PurposeOfFlight;
  passenger_names?: string[];
  runway_in_use?: string;
  fuel_level_liters?: number;
  oil_level_quarts?: number;
  notams_reviewed?: boolean;
  weather_briefing_complete?: boolean;
  payment_method?: PaymentMethod;
  authorizing_instructor_id?: string;
  student_signature_data?: string;
  instructor_notes?: string;
  instructor_limitations?: string;
  status?: AuthorizationStatus;
}

export interface FlightAuthorizationApprovalRequest {
  id: string;
  approval_notes?: string;
  instructor_limitations?: string;
}

export interface FlightAuthorizationRejectionRequest {
  id: string;
  rejection_reason: string;
}

// Response types for API endpoints
export interface FlightAuthorizationResponse {
  authorization: FlightAuthorization;
  success: boolean;
}

export interface FlightAuthorizationsListResponse {
  authorizations: FlightAuthorization[];
  count: number;
  success: boolean;
}

export interface FlightAuthorizationActionResponse {
  authorization: FlightAuthorization;
  success: boolean;
  message: string;
}
