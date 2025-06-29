import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  // Required: equipment_id, updated_by, updated_at, notes (optional), next_due_at (optional), organization_id
  const { equipment_id, updated_by, updated_at, notes, next_due_at, organization_id } = body;
  if (!equipment_id || !updated_by || !updated_at || !organization_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const { data, error } = await supabase.from('equipment_updates').insert([{ equipment_id, updated_by, updated_at, notes, next_due_at, organization_id }]).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ update: data });
} 