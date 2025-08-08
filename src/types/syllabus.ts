// AUTO-GENERATED: Types for syllabus table from Supabase

export type Syllabus = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  number_of_exams: number;
  is_active: boolean;
};

export type SyllabusInsert = {
  id?: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  number_of_exams?: number;
  is_active?: boolean;
};

export type SyllabusUpdate = {
  id?: string;
  name?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  number_of_exams?: number;
  is_active?: boolean;
}; 