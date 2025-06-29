import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  // Required: equipment_id, issued_to, issued_by, issued_at, notes (optional)
  const { equipment_id, issued_to, issued_by, issued_at, notes } = body;
  if (!equipment_id || !issued_to || !issued_by || !issued_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const { data, error } = await supabase.from('equipment_issuance').insert([{ equipment_id, issued_to, issued_by, issued_at, notes }]).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ issuance: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  // Required: id, returned_at
  const { id, returned_at } = body;
  if (!id || !returned_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const { data, error } = await supabase.from('equipment_issuance').update({ returned_at }).eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ issuance: data });
} 