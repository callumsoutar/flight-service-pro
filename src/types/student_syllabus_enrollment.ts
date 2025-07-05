// AUTO-GENERATED: Types for student_syllabus_enrollment table from Supabase

export type StudentSyllabusEnrollment = {
  id: string;
  organization_id: string;
  user_id: string;
  syllabus_id: string;
  enrolled_at: string;
  completed_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  primary_instructor_id: string | null;
};

export type StudentSyllabusEnrollmentInsert = {
  id?: string;
  organization_id: string;
  user_id: string;
  syllabus_id: string;
  enrolled_at?: string;
  completed_at?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  primary_instructor_id?: string | null;
};

export type StudentSyllabusEnrollmentUpdate = {
  id?: string;
  organization_id?: string;
  user_id?: string;
  syllabus_id?: string;
  enrolled_at?: string;
  completed_at?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  primary_instructor_id?: string | null;
}; 