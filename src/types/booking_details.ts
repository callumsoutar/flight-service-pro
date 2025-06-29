export interface BookingDetails {
  id: string;
  eta?: string | null; // timestamptz
  passengers?: string | null;
  route?: string | null;
  equipment?: unknown | null; // jsonb
  remarks?: string | null;
  authorization_completed: boolean;
  booking_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  override_conflict: boolean;
  actual_start?: string | null;
  actual_end?: string | null;
  fuel_on_board?: number | null;
} 