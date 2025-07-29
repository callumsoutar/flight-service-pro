import { NextRequest } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { AuditLog } from '@/types/audit_logs';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const table_name = searchParams.get('table_name');
  const row_id = searchParams.get('row_id');

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('changed_at', { ascending: false });

  if (table_name) query = query.eq('table_name', table_name);
  if (row_id) query = query.eq('row_id', row_id);

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data as AuditLog[]), { status: 200 });
} 