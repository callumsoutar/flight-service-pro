import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { AircraftComponent } from '@/types/aircraft_components';

export async function PATCH(req: NextRequest, { params }: { params: { componentId: string } }) {
  const { componentId } = await params;
  const supabase = await createClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('aircraft_components')
    .update(body)
    .eq('id', componentId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data as AircraftComponent, { status: 200 });
} 