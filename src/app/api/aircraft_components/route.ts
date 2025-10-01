import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { AircraftComponent } from '@/types/aircraft_components';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { searchParams } = new URL(req.url);
  const aircraft_id = searchParams.get('aircraft_id');
  const component_id = searchParams.get('component_id');

  let query = supabase.from('aircraft_components').select('*').is('voided_at', null);
  
  // If fetching a single component by ID, return single object
  if (component_id) {
    query = query.eq('id', component_id);
    const { data, error } = await query.single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data as AircraftComponent);
  }
  
  // Otherwise return array
  if (aircraft_id) query = query.eq('aircraft_id', aircraft_id);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as AircraftComponent[]);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { data, error } = await supabase.from('aircraft_components').insert([body]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as AircraftComponent, { status: 201 });
} 

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...fieldsToUpdate } = body;
  if (!id) return NextResponse.json({ error: "Missing component id" }, { status: 400 });

  const { data, error } = await supabase
    .from('aircraft_components')
    .update(fieldsToUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as AircraftComponent, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing component id" }, { status: 400 });

  // Soft delete by setting voided_at timestamp
  const { error } = await supabase
    .from('aircraft_components')
    .update({ voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Component deleted successfully" }, { status: 200 });
} 