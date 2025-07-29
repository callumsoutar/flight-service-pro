export interface InstructorEndorsement {
  id: string;
  instructor_id: string;
  endorsement_id: string;
  issued_date: string;
  expiry_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
} 