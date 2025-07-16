import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';

const InstructorSchema = z.object({
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  approved_by: z.string().uuid().nullable().optional(),
  approved_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  instructor_check_due_date: z.string().date().nullable().optional(),
  instrument_check_due_date: z.string().date().nullable().optional(),
  is_actively_instructing: z.boolean().default(false),
  class_1_medical_due_date: z.string().date().nullable().optional(),
  notes: z.string().nullable().optional(),
  employment_type: z.enum(["full_time", "part_time", "casual", "contractor"]).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('organization_id');
  let query = supabase.from('instructors').select('*');
  if (orgId) query = query.eq('organization_id', orgId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instructors: data }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = InstructorSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase.from('instructors').insert([parse.data]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instructor: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...update } = body;
  if (!id) return NextResponse.json({ error: 'Missing instructor id' }, { status: 400 });
  const parse = InstructorSchema.partial().safeParse(update);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase.from('instructors').update(parse.data).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
  return NextResponse.json({ instructor: data }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing instructor id' }, { status: 400 });
  const { error } = await supabase.from('instructors').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
} 