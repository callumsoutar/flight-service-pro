export interface Lesson {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  syllabus_id?: string | null;
  created_at: string;
  updated_at: string;
  order?: number | null;
  is_required?: boolean;
  syllabus_stage?: string | null;
} 