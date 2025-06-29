import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  let organization_id = searchParams.get('organization_id');
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  // Fallback to cookie if not provided in query
  if (!organization_id) {
    organization_id = req.cookies.get('current_org_id')?.value || null;
  }

  if (!organization_id) {
    return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 });
  }

  let query = supabase.from('equipment').select('*').eq('organization_id', organization_id);
  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ equipment: data });
} 