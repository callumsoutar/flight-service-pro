import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { z } from 'zod';


const EquipmentSchema = z.object({
  name: z.string().min(1),
  serial_number: z.string().nullable().optional(),
  status: z.enum(['active', 'lost', 'maintenance', 'retired']),
  type: z.enum([
    'AIP','Stationery','Headset','Technology','Maps','Radio','Transponder','ELT','Lifejacket','FirstAidKit','FireExtinguisher','Other',
  ]).nullable(),
  location: z.string().nullable().optional(),
  year_purchased: z.number().int().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const orgId = req.nextUrl.searchParams.get('organization_id');
  if (!orgId) return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 });
  const { data, error } = await supabase.from('equipment').select('*').eq('organization_id', orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipment: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = EquipmentSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  const orgId = body.organization_id;
  if (!orgId) return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 });
  const { data, error } = await supabase.from('equipment').insert([{ ...parse.data, organization_id: orgId }]).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipment: data?.[0] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...update } = body;
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });
  const parse = EquipmentSchema.partial().safeParse(update);
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