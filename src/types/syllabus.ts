// AUTO-GENERATED: Types for syllabus table from Supabase

export type Syllabus = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  number_of_exams: number;
};

export type SyllabusInsert = {
  id?: string;
  organization_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  number_of_exams?: number;
};

export type SyllabusUpdate = {
  id?: string;
  organization_id?: string;
  name?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  number_of_exams?: number;
}; 