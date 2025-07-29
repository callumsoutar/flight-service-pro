export type SyllabusStage = 
  | 'basic syllabus'
  | 'advances syllabus'
  | 'circuit training'
  | 'terrain and weather awareness'
  | 'instrument flying and flight test revision';

export interface Lesson {
  id: string;
  name: string;
  description?: string | null;
  syllabus_id?: string | null;
  created_at: string;
  updated_at: string;
  order?: number | null;
  is_required?: boolean;
  syllabus_stage?: SyllabusStage | null;
} 