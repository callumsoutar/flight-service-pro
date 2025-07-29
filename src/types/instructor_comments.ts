export interface InstructorComment {
  id: string;
  booking_id: string;
  instructor_id: string;
  student_id?: string | null; // Made nullable as requested
  comment: string;
  created_at: string;
  updated_at: string;
} 