import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, { params }: { params: any }) {
  const supabase = await createClient();
  const { id } = params;
  const { data, error } = await supabase.from('equipment').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ equipment: data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PATCH(req: NextRequest, { params }: { params: any }) {
  const supabase = await createClient();
  const { id } = params;
  const body = await req.json();
  const { data, error } = await supabase.from('equipment').update(body).eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ equipment: data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(req: NextRequest, { params }: { params: any }) {
  const supabase = await createClient();
  const { id } = params;
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
} 