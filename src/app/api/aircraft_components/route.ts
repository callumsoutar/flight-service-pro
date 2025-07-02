import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { AircraftComponent } from '@/types/aircraft_components';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const aircraft_id = searchParams.get('aircraft_id');
  const organization_id = searchParams.get('organization_id');

  let query = supabase.from('aircraft_components').select('*');
  if (aircraft_id) query = query.eq('aircraft_id', aircraft_id);
  if (organization_id) query = query.eq('organization_id', organization_id);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as AircraftComponent[]);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from('aircraft_components').insert([body]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data as AircraftComponent, { status: 201 });
} 