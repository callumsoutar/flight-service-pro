export type Transaction = {
  id: string;
  organization_id: string;
  user_id: string;
  type: string; // USER-DEFINED
  status: string; // USER-DEFINED
  amount: number;
  updated_at: string;
  completed_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  description: string;
  reference_number?: string | null;
}; 