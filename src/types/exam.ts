export type Exam = {
  id: string;
  name: string;
  description?: string | null;
  syllabus_id: string;
  passing_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}; 