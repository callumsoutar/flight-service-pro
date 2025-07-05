// AUTO-GENERATED: Types for lesson_progress table from Supabase

export type LessonProgress = {
  id: string;
  organization_id: string;
  user_id: string;
  syllabus_id: string | null;
  lesson_id: string | null;
  booking_id: string | null;
  attempt: number;
  status: string;
  comments: string | null;
  instructor_id: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  lesson_highlights: string | null;
  areas_for_improvement: string | null;
  airmanship: string | null;
  focus_next_lesson: string | null;
};

export type LessonProgressInsert = {
  id?: string;
  organization_id: string;
  user_id: string;
  syllabus_id?: string | null;
  lesson_id?: string | null;
  booking_id?: string | null;
  attempt?: number;
  status: string;
  comments?: string | null;
  instructor_id?: string | null;
  date?: string;
  created_at?: string;
  updated_at?: string;
  lesson_highlights?: string | null;
  areas_for_improvement?: string | null;
  airmanship?: string | null;
  focus_next_lesson?: string | null;
};

export type LessonProgressUpdate = {
  id?: string;
  organization_id?: string;
  user_id?: string;
  syllabus_id?: string | null;
  lesson_id?: string | null;
  booking_id?: string | null;
  attempt?: number;
  status?: string;
  comments?: string | null;
  instructor_id?: string | null;
  date?: string;
  created_at?: string;
  updated_at?: string;
  lesson_highlights?: string | null;
  areas_for_improvement?: string | null;
  airmanship?: string | null;
  focus_next_lesson?: string | null;
}; 