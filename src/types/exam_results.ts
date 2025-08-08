export type ExamResult = {
  id: string;
  exam_id: string;
  user_id: string;
  score?: number | null;
  result: 'PASS' | 'FAIL';
  exam_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}; 