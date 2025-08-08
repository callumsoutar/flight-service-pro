import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { z } from 'zod';
import type { EquipmentIssuance } from '@/types/equipment';

const IssuanceSchema = z.object({
  equipment_id: z.string().uuid(),
  user_id: z.string().uuid(),
  issued_by: z.string().uuid().optional(),
  issued_at: z.string(),
  expected_return: z.string().nullable().optional(), // Added expected return field
  notes: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const equipmentId = req.nextUrl.searchParams.get('equipment_id');
  const openOnly = req.nextUrl.searchParams.get('open_only');
  let query = supabase.from('equipment_issuance').select('*');
  if (equipmentId) query = query.eq('equipment_id', equipmentId);
  if (openOnly === 'true') query = query.is('returned_at', null);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ issuances: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = IssuanceSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  
  // Get current user for issued_by
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const issuanceData = {
    ...parse.data,
    issued_by: parse.data.issued_by || user.id,
  };
  
  const { data, error } = await supabase.from('equipment_issuance').insert([issuanceData]).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ issuance: data?.[0] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, returned_at, expected_return } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const updateFields: Partial<EquipmentIssuance> = {};
  if (returned_at) updateFields.returned_at = returned_at;
  if (expected_return !== undefined) updateFields.expected_return = expected_return; // Allow updating expected return
  const { data, error } = await supabase.from('equipment_issuance').update(updateFields).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ issuance: data?.[0] });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing issuance id' }, { status: 400 });
  const { error } = await supabase.from('equipment_issuance').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 