// Equipment table
export interface Equipment {
  id: string;
  organization_id: string;
  name: string;
  serial_number?: string | null;
  status: 'active' | 'lost' | 'maintenance' | 'retired';
  type?: 'AIP' | 'Stationery' | 'Headset' | 'Technology' | 'Maps' | 'Radio' | 'Transponder' | 'ELT' | 'Lifejacket' | 'FirstAidKit' | 'FireExtinguisher' | 'Other' | null;
  created_at?: string;
  updated_at?: string;
}

// Equipment Issuance table
export interface EquipmentIssuance {
  id: string;
  equipment_id: string;
  issued_to: string;
  issued_by: string;
  issued_at: string;
  returned_at?: string | null;
  notes?: string | null;
}

// Equipment Updates table
export interface EquipmentUpdate {
  id: string;
  equipment_id: string;
  updated_by: string;
  updated_at: string;
  notes?: string | null;
  next_due_at?: string | null;
  organization_id: string;
} 