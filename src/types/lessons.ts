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
  syllabus_id: string;
  created_at: string;
  updated_at: string;
  order: number;
  is_required?: boolean | null;
  syllabus_stage?: SyllabusStage | null;
  is_active: boolean;
}

export interface LessonInsert {
  name: string;
  description?: string | null;
  syllabus_id: string;
  order?: number;
  is_required?: boolean;
  syllabus_stage?: SyllabusStage | null;
}

export interface LessonUpdate {
  name?: string;
  description?: string | null;
  order?: number;
  is_required?: boolean;
  syllabus_stage?: SyllabusStage | null;
} 