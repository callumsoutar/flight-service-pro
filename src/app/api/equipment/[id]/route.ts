import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, context: { params: any }) {
  const supabase = await createClient();
  const params = await context?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', id)
    .is('voided_at', null) // Only return non-voided equipment
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ equipment: data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PATCH(req: NextRequest, context: { params: any }) {
  const supabase = await createClient();
  const params = await context?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });
  const body = await req.json();
  const { data, error } = await supabase
    .from('equipment')
    .update(body)
    .eq('id', id)
    .is('voided_at', null) // Only update non-voided equipment
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    // Check if the row exists (no-op update)
    const { data: existing, error: fetchError } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .is('voided_at', null)
      .single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'No equipment found' }, { status: 404 });
    }
    return NextResponse.json({ equipment: existing });
  }
  return NextResponse.json({ equipment: data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(req: NextRequest, context: { params: any }) {
  const supabase = await createClient();
  const params = await context?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });
  
  // Soft delete by setting voided_at timestamp
  const { data, error } = await supabase
    .from('equipment')
    .update({ voided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('voided_at', null) // Only update if not already voided
    .select()
    .single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Equipment not found or already deleted' }, { status: 404 });
  
  return NextResponse.json({ success: true, equipment: data });
} 