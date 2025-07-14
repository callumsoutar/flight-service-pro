import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { z } from 'zod';


const UpdateSchema = z.object({
  equipment_id: z.string().uuid(),
  updated_by: z.string().uuid(),
  updated_at: z.string(),
  notes: z.string().nullable().optional(),
  next_due_at: z.string().nullable().optional(),
  organization_id: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const orgId = req.nextUrl.searchParams.get('organization_id');
  const equipmentId = req.nextUrl.searchParams.get('equipment_id');
  let query = supabase.from('equipment_updates').select('*');
  if (orgId) query = query.eq('organization_id', orgId);
  if (equipmentId) query = query.eq('equipment_id', equipmentId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updates: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = UpdateSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  const { data, error } = await supabase.from('equipment_updates').insert([parse.data]).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ update: data?.[0] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...update } = body;
  if (!id) return NextResponse.json({ error: 'Missing update id' }, { status: 400 });
  const parse = UpdateSchema.partial().safeParse(update);
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  const { data, error } = await supabase.from('equipment_updates').update(parse.data).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ update: data?.[0] });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing update id' }, { status: 400 });
  const { error } = await supabase.from('equipment_updates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 