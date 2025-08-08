import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { z } from 'zod';

const UpdateSchema = z.object({
  equipment_id: z.string().uuid(),
  updated_at: z.string(),
  notes: z.string().nullable().optional(),
  next_due_at: z.string().nullable().optional(),
  updated_by: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const equipmentId = req.nextUrl.searchParams.get('equipment_id');
  let query = supabase.from('equipment_updates').select('*');
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
  
  // Get current user to verify they match the updated_by field
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Verify the user is updating on their own behalf
  if (parse.data.updated_by !== user.id) {
    return NextResponse.json({ error: 'You can only create updates for yourself' }, { status: 403 });
  }
  
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