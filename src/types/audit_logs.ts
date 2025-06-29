export interface AuditLog {
  id: string;
  table_name: string;
  row_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by?: string | null;
  changed_at: string; // ISO timestamp
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  column_changes?: Record<string, unknown> | null;
  organization_id?: string | null;
} 