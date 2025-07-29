import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';

const ObservationSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(['low', 'medium', 'high']).default('low'),
  aircraft_id: z.string().uuid(),
  observation_stage: z.enum(['open', 'investigation', 'resolution', 'closed']).default('open'),
  resolution_comments: z.string().nullable().optional(),
  closed_by: z.string().uuid().nullable().optional(),
  resolved_at: z.string().datetime().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const aircraft_id = searchParams.get('aircraft_id');
  
  let query = supabase.from('observations').select('*');
  
  if (id) {
    query = query.eq('id', id);
    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    // Map database fields to frontend expectations
    const mappedData = {
      ...data,
      observation_stage: data.stage,
      user_id: data.reported_by,
      status: data.priority // Map priority to status for frontend
    };
    return NextResponse.json(mappedData);
  }
  
  if (aircraft_id) {
    query = query.eq('aircraft_id', aircraft_id);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Map database fields to frontend expectations
  const mappedData = data?.map(obs => ({
    ...obs,
    observation_stage: obs.stage,
    user_id: obs.reported_by,
    status: obs.priority // Map priority to status for frontend
  })) || [];
  
  return NextResponse.json(mappedData);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const parse = ObservationSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  
  // Map frontend fields to database fields
  const dbData = {
    ...parse.data,
    stage: parse.data.observation_stage,
    reported_by: parse.data.user_id,
    priority: parse.data.status, // Map frontend status to database priority
    status: 'active' // Default observation status
  };
  
  const { data, error } = await supabase
    .from('observations')
    .insert([dbData])
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Map database response to frontend expectations
  const mappedData = {
    ...data,
    observation_stage: data.stage,
    user_id: data.reported_by,
    status: data.priority // Map priority to status for frontend
  };
  
  return NextResponse.json(mappedData, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { id, ...update } = body;
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  
  const parse = ObservationSchema.partial().safeParse(update);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  
  // Map frontend fields to database fields
  const dbUpdate: Record<string, string | number | boolean | null> = {};
  if (parse.data.observation_stage !== undefined) {
    dbUpdate.stage = parse.data.observation_stage;
  }
  if (parse.data.user_id !== undefined) {
    dbUpdate.reported_by = parse.data.user_id;
  }
  if (parse.data.name !== undefined) {
    dbUpdate.name = parse.data.name;
  }
  if (parse.data.description !== undefined) {
    dbUpdate.description = parse.data.description;
  }
  if (parse.data.status !== undefined) {
    dbUpdate.priority = parse.data.status; // Map frontend status to database priority
  }
  if (parse.data.resolution_comments !== undefined) {
    dbUpdate.resolution_comments = parse.data.resolution_comments;
  }
  if (parse.data.closed_by !== undefined) {
    dbUpdate.closed_by = parse.data.closed_by;
  }
  if (parse.data.resolved_at !== undefined) {
    dbUpdate.resolved_at = parse.data.resolved_at;
  }
  
  const { data, error } = await supabase
    .from('observations')
    .update(dbUpdate)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Map database response to frontend expectations
  const mappedData = {
    ...data,
    observation_stage: data.stage,
    user_id: data.reported_by,
    status: data.priority // Map priority to status for frontend
  };
  
  return NextResponse.json(mappedData);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  
  const { error } = await supabase
    .from('observations')
    .delete()
    .eq('id', id);
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
} 