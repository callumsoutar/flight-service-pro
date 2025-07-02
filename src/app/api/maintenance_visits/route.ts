import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { MaintenanceVisit } from '@/types/maintenance_visits';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const aircraft_id = searchParams.get('aircraft_id');
  const component_id = searchParams.get('component_id');

  let query = supabase.from('maintenance_visits').select('*');
  if (aircraft_id) query = query.eq('aircraft_id', aircraft_id);
  if (component_id) query = query.eq('component_id', component_id);

  const { data, error } = await query.order('visit_date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as MaintenanceVisit[]);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from('maintenance_visits').insert([body]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data as MaintenanceVisit, { status: 201 });
} 