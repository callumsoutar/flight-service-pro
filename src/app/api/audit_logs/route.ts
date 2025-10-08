import { NextRequest } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { AuditLog } from '@/types/audit_logs';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const table_name = searchParams.get('table_name');
  const record_id = searchParams.get('row_id') || searchParams.get('record_id'); // Support both params for backwards compat
  const include_users = searchParams.get('include_users') === 'true';

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false }); // Fixed: was changed_at, now created_at

  if (table_name) query = query.eq('table_name', table_name);
  if (record_id) query = query.eq('record_id', record_id); // Fixed: was row_id, now record_id

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // If include_users is requested, fetch user data in a single query
  if (include_users && data) {
    const userIds = Array.from(new Set(data.map((log: AuditLog) => log.user_id).filter(Boolean))); // Fixed: was changed_by, now user_id

    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds);

      if (!usersError && usersData) {
        const userMap: Record<string, { id: string; first_name: string; last_name: string }> = {};
        usersData.forEach((user) => {
          userMap[user.id] = user;
        });

        return new Response(JSON.stringify({ logs: data as AuditLog[], users: userMap }), { status: 200 });
      }
    }

    // If no users to fetch or error, return logs with empty users object
    return new Response(JSON.stringify({ logs: data as AuditLog[], users: {} }), { status: 200 });
  }

  return new Response(JSON.stringify(data as AuditLog[]), { status: 200 });
} 