// AUTO-GENERATED: Types for experience_types table from Supabase

export type ExperienceType = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  voided_at: string | null;
};

export type ExperienceTypeInsert = {
  id?: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  voided_at?: string | null;
};

export type ExperienceTypeUpdate = {
  id?: string;
  name?: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  voided_at?: string | null;
};
