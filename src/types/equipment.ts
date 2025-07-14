// Types generated from Supabase schema

export type EquipmentStatus = 'active' | 'lost' | 'maintenance' | 'retired';
export type EquipmentType =
  | 'AIP'
  | 'Stationery'
  | 'Headset'
  | 'Technology'
  | 'Maps'
  | 'Radio'
  | 'Transponder'
  | 'ELT'
  | 'Lifejacket'
  | 'FirstAidKit'
  | 'FireExtinguisher'
  | 'Other';

export interface Equipment {
  id: string;
  organization_id: string;
  name: string;
  serial_number: string | null;
  status: EquipmentStatus;
  type: EquipmentType | null;
  created_at: string | null;
  updated_at: string | null;
  location: string | null;
  year_purchased: number | null;
}

export interface EquipmentIssuance {
  id: string;
  equipment_id: string;
  issued_to: string;
  issued_by: string;
  issued_at: string;
  returned_at: string | null;
  notes: string | null;
  expected_return_date: string | null;
}

export interface EquipmentUpdate {
  id: string;
  equipment_id: string;
  updated_by: string;
  updated_at: string;
  notes: string | null;
  next_due_at: string | null;
  created_at: string | null;
  organization_id: string;
} 