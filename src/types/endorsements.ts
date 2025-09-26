export interface Endorsement {
  id: string;
  name: string;
  description?: string;
  voided_at?: string | null;
  created_at: string;
  updated_at: string;
} 