export interface BusinessHours {
  open_time: string; // HH:MM:SS format
  close_time: string; // HH:MM:SS format
  is_24_hours: boolean;
  is_closed: boolean; // if true, business is closed all week
}

export interface UpdateBusinessHoursRequest {
  open_time?: string;
  close_time?: string;
  is_24_hours?: boolean;
  is_closed?: boolean;
}

// Legacy response type - can be removed after migration
export interface BusinessHoursResponse {
  business_hours: BusinessHours;
}

// Helper function to format time for display
export function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}