import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { MaintenanceCost } from '@/types/maintenance_costs';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const maintenance_visit_id = searchParams.get('maintenance_visit_id');
  const aircraft_component_id = searchParams.get('aircraft_component_id');

  let query = supabase.from('maintenance_costs').select('*');
  if (maintenance_visit_id) query = query.eq('maintenance_visit_id', maintenance_visit_id);
  if (aircraft_component_id) query = query.eq('aircraft_component_id', aircraft_component_id);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as MaintenanceCost[]);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from('maintenance_costs').insert([body]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data as MaintenanceCost, { status: 201 });
} 