// Types generated from Supabase schema

export type EquipmentStatus = "active" | "lost" | "maintenance" | "retired";
export type EquipmentType = "AIP" | "Stationery" | "Headset" | "Technology" | "Maps" | "Radio" | "Transponder" | "ELT" | "Lifejacket" | "FirstAidKit" | "FireExtinguisher" | "Other";

export interface Equipment {
  id: string;
  name: string;
  label?: string | null;
  type: EquipmentType;
  status: EquipmentStatus;
  serial_number?: string | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  notes?: string | null;
  created_at: string | null;
  updated_at: string | null;
  location?: string | null;
  year_purchased?: number | null;
  voided_at?: string | null;
}

export interface EquipmentIssuance {   
  id: string;
  equipment_id: string;
  user_id: string; // Database uses user_id, not issued_to
  issued_at: string;  
  returned_at: string | null;
  expected_return: string | null; // Added expected return date field
  notes: string | null;
  issued_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface EquipmentUpdate {
  id: string;
  equipment_id: string;
  updated_at: string;
  notes: string | null;
  next_due_at: string | null;
  updated_by: string;
  created_at: string | null;
} 