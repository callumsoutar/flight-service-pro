export interface AircraftChargeRate {
  id: string;
  aircraft_id: string;
  flight_type_id: string;
  rate_per_hour: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  charge_hobbs: boolean;
  charge_tacho: boolean;
  charge_airswitch: boolean;
} 