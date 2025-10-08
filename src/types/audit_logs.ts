export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string; // Fixed: was row_id, now matches DB column
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id?: string | null; // Fixed: was changed_by, now matches DB column
  created_at: string; // Fixed: was changed_at, now matches DB column - ISO timestamp
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  column_changes?: Record<string, unknown> | null;
} 