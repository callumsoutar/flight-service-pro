export interface Setting {
  id: string;
  category: SettingCategory;
  setting_key: string;
  setting_value: string | number | boolean | object;
  data_type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  is_public: boolean;
  is_required: boolean;
  validation_schema?: object;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export type SettingCategory = 
  | 'general' 
  | 'system' 
  | 'invoicing' 
  | 'notifications' 
  | 'bookings' 
  | 'training' 
  | 'maintenance'
  | 'security'
  | 'memberships';

export interface SettingsUpdateRequest {
  setting_value: string | number | boolean | object;
  updated_by?: string;
}

export interface SettingsFile {
  id: string;
  setting_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface SettingsAuditLog {
  id: string;
  setting_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  old_value?: string | number | boolean | object;
  new_value?: string | number | boolean | object;
  changed_by: string;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Specific setting value types for type safety
export interface GeneralSettings {
  school_name: string;
  registration_number: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  logo_url: string;
  website_url: string;
  timezone: string;
  currency: string;
}

export interface SystemSettings {
  booking_advance_limit_days: number;
  auto_confirm_bookings: boolean;
  require_flight_authorization: boolean;
  maintenance_reminder_days: number;
  default_booking_duration_minutes: number;
  allow_concurrent_bookings: boolean;
}

export interface NotificationSettings {
  booking_confirmation_enabled: boolean;
  booking_reminder_enabled: boolean;
  booking_reminder_hours: number;
  maintenance_alert_enabled: boolean;
  email_from_address: string;
  email_reply_to: string;
  sms_enabled: boolean;
}

export interface InvoicingSettings {
  invoice_prefix: string;
  payment_terms_days: number;
  late_fee_percentage: number;
  auto_generate_invoices: boolean;
  invoice_due_reminder_days: number;
  include_logo_on_invoice: boolean;
}

export interface TimeSlot {
  name: string;
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  days: string[];     // Array of weekday names: ['monday', 'tuesday', etc.]
}

export interface BookingSettings {
  minimum_booking_duration_minutes: number;
  maximum_booking_duration_hours: number;
  booking_buffer_minutes: number;
  allow_past_bookings: boolean;
  require_instructor_for_solo: boolean;
  auto_cancel_unpaid_hours: number;
  custom_time_slots: TimeSlot[];
  default_booking_duration_hours: number;
  require_flight_authorization_for_solo: boolean;
}

export interface TrainingSettings {
  default_lesson_duration_minutes: number;
  require_lesson_plan: boolean;
  track_student_progress: boolean;
  require_instructor_signature: boolean;
}

export interface MaintenanceSettings {
  default_maintenance_buffer_hours: number;
  require_maintenance_approval: boolean;
  auto_ground_aircraft_maintenance: boolean;
}

export interface SecuritySettings {
  session_timeout_minutes: number;
  require_password_change_days: number;
  failed_login_lockout_attempts: number;
  lockout_duration_minutes: number;
}

export interface MembershipYearConfig {
  start_month: number; // 1-12
  start_day: number;   // 1-31
  end_month: number;   // 1-12
  end_day: number;     // 1-31
  description: string;
}

export interface MembershipSettings {
  membership_year: MembershipYearConfig;
}

// Helper type for all settings combined
export interface AllSettings {
  general: GeneralSettings;
  system: SystemSettings;
  notifications: NotificationSettings;
  invoicing: InvoicingSettings;
  bookings: BookingSettings;
  training: TrainingSettings;
  maintenance: MaintenanceSettings;
  security: SecuritySettings;
  memberships: MembershipSettings;
}

export type SettingValue<T extends SettingCategory, K extends keyof AllSettings[T]> = AllSettings[T][K];

// API Response types
export interface SettingsResponse {
  settings: Setting[];
  total: number;
}

export interface SettingResponse {
  setting: Setting;
}

export interface SettingsError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}
