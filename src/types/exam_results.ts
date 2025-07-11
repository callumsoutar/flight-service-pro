export type ExamResult = {
  id: string;
  exam_id: string;
  user_id: string;
  score?: number | null;
  result: 'PASS' | 'FAIL';
  date_completed?: string | null;
  kdrs_completed?: boolean | null;
  kdrs_signed_by?: string | null;
  organization_id: string;
  created_at: string;
}; 