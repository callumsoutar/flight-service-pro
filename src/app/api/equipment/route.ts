import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { z } from 'zod';

const equipmentSchema = z.object({
  name: z.string().min(1),
  label: z.string().nullable().optional(),
  type: z.enum(['AIP', 'Stationery', 'Headset', 'Technology', 'Maps', 'Radio', 'Transponder', 'ELT', 'Lifejacket', 'FirstAidKit', 'FireExtinguisher', 'Other']),
  status: z.enum(['active', 'lost', 'maintenance', 'retired']),
  serial_number: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  warranty_expiry: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  year_purchased: z.number().nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data, error } = await supabase.from('equipment').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipment: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await req.json();
  const parse = equipmentSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid equipment data' }, { status: 400 });
  }
  
  const { data, error } = await supabase.from('equipment').insert([parse.data]).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipment: data?.[0] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...update } = body;
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });
  const parse = equipmentSchema.partial().safeParse(update);
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  const { data, error } = await supabase.from('equipment').update(parse.data).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipment: data?.[0] });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 