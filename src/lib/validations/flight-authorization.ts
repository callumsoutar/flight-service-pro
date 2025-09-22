import { z } from 'zod';

// Purpose of flight options
export const purposeOfFlightOptions = [
  'training',
  'solo', 
  'checkride',
  'crosscountry',
  'scenic',
  'maintenance'
] as const;

// Payment method options
export const paymentMethodOptions = [
  'account',
  'credit',
  'debit',
  'cash',
  'eftpos'
] as const;

// Authorization status options
export const authorizationStatusOptions = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'cancelled'
] as const;

// Main form validation schema
export const flightAuthorizationFormSchema = z.object({
  purpose_of_flight: z.enum(purposeOfFlightOptions, {
    required_error: "Purpose of flight is required",
    invalid_type_error: "Please select a valid purpose of flight"
  }),
  
  passenger_names: z.array(z.string().min(1, "Passenger name cannot be empty")).max(3, "Maximum 3 passengers allowed"),
  
  runway_in_use: z.string({
    required_error: "Runway information is required"
  }).min(1, "Runway information cannot be empty").max(10, "Runway information too long"),
  
  fuel_level_liters: z.number({
    required_error: "Fuel level is required",
    invalid_type_error: "Fuel level must be a number"
  }).min(0, "Fuel level cannot be negative"),
  
  oil_level_quarts: z.number({
    required_error: "Oil level is required", 
    invalid_type_error: "Oil level must be a number"
  }).min(0, "Oil level cannot be negative"),
  
  notams_reviewed: z.boolean({
    required_error: "NOTAMs review confirmation is required"
  }).refine(val => val === true, {
    message: "NOTAMs must be reviewed before flight authorization"
  }),
  
  weather_briefing_complete: z.boolean({
    required_error: "Weather briefing confirmation is required"
  }).refine(val => val === true, {
    message: "Weather briefing must be completed before flight authorization"
  }),
  
  payment_method: z.enum(paymentMethodOptions, {
    required_error: "Payment method is required",
    invalid_type_error: "Please select a valid payment method"
  }),
  
  authorizing_instructor_id: z.string({
    required_error: "Authorizing instructor must be selected"
  }).min(1, "Authorizing instructor must be selected"),
  
  student_signature_data: z.string({
    required_error: "Student signature is required"
  }).min(1, "Student signature is required"),
  
  instructor_notes: z.string().optional(),
  instructor_limitations: z.string().optional(),
});

// Schema for creating a new authorization
export const createFlightAuthorizationSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID"),
  purpose_of_flight: z.enum(purposeOfFlightOptions),
  passenger_names: z.array(z.string()).optional().default([]),
  runway_in_use: z.string().optional(),
  fuel_level_liters: z.number().min(0).optional(),
  oil_level_quarts: z.number().min(0).optional(),
  notams_reviewed: z.boolean().default(false),
  weather_briefing_complete: z.boolean().default(false),
  payment_method: z.enum(paymentMethodOptions).optional(),
  authorizing_instructor_id: z.string().uuid().optional(),
  student_signature_data: z.string().optional(),
  instructor_notes: z.string().optional(),
  instructor_limitations: z.string().optional(),
});

// Schema for updating an authorization
export const updateFlightAuthorizationSchema = z.object({
  id: z.string().uuid("Invalid authorization ID"),
  purpose_of_flight: z.enum(purposeOfFlightOptions).optional(),
  passenger_names: z.array(z.string()).optional(),
  runway_in_use: z.string().optional(),
  fuel_level_liters: z.number().min(0).optional(),
  oil_level_quarts: z.number().min(0).optional(),
  notams_reviewed: z.boolean().optional(),
  weather_briefing_complete: z.boolean().optional(),
  payment_method: z.enum(paymentMethodOptions).optional(),
  authorizing_instructor_id: z.string().uuid().optional(),
  student_signature_data: z.string().optional(),
  instructor_notes: z.string().optional(),
  instructor_limitations: z.string().optional(),
  status: z.enum(authorizationStatusOptions).optional(),
});

// Schema for submitting an authorization for approval
export const submitFlightAuthorizationSchema = z.object({
  id: z.string().uuid("Invalid authorization ID")
});

// Schema for instructor approval
export const approveFlightAuthorizationSchema = z.object({
  id: z.string().uuid("Invalid authorization ID"),
  approval_notes: z.string().optional(),
  instructor_limitations: z.string().optional(),
});

// Schema for instructor rejection
export const rejectFlightAuthorizationSchema = z.object({
  id: z.string().uuid("Invalid authorization ID"),
  rejection_reason: z.string().min(1, "Rejection reason is required"),
});

// Draft save schema (less strict validation)
export const draftFlightAuthorizationSchema = z.object({
  purpose_of_flight: z.enum(purposeOfFlightOptions).optional(),
  passenger_names: z.array(z.string()).optional(),
  runway_in_use: z.string().optional(),
  fuel_level_liters: z.number().min(0).optional(),
  oil_level_quarts: z.number().min(0).optional(),
  notams_reviewed: z.boolean().optional(),
  weather_briefing_complete: z.boolean().optional(),
  payment_method: z.enum(paymentMethodOptions).optional(),
  authorizing_instructor_id: z.string().uuid().optional(),
  student_signature_data: z.string().optional(),
  instructor_notes: z.string().optional(),
  instructor_limitations: z.string().optional(),
});

// Export types derived from schemas
export type FlightAuthorizationFormData = z.infer<typeof flightAuthorizationFormSchema>;
export type CreateFlightAuthorizationData = z.infer<typeof createFlightAuthorizationSchema>;
export type UpdateFlightAuthorizationData = z.infer<typeof updateFlightAuthorizationSchema>;
export type SubmitFlightAuthorizationData = z.infer<typeof submitFlightAuthorizationSchema>;
export type ApproveFlightAuthorizationData = z.infer<typeof approveFlightAuthorizationSchema>;
export type RejectFlightAuthorizationData = z.infer<typeof rejectFlightAuthorizationSchema>;
export type DraftFlightAuthorizationData = z.infer<typeof draftFlightAuthorizationSchema>;
