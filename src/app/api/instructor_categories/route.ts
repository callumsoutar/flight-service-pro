import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';

const InstructorCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  description: z.string().nullable().optional(),
  country: z.string().length(2, "Country must be a valid 2-letter ISO code"),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('id');
  const country = searchParams.get('country');
  const searchQuery = searchParams.get('q');

  let query = supabase
    .from('instructor_categories')
    .select('*')
    .order('name', { ascending: true });
  
  if (categoryId) {
    query = query.eq('id', categoryId);
  }
  
  if (country) {
    query = query.eq('country', country);
  }
  
  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  if (categoryId) {
    // Return a single instructor category
    const { data, error } = await query.single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ instructor_category: data }, { status: 200 });
  } else {
    // Return all instructor categories
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ instructor_categories: data }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const parse = InstructorCategorySchema.safeParse(body);
  
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('instructor_categories')
    .insert([parse.data])
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instructor_category: data }, { status: 201 });
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
  
  if (!id) return NextResponse.json({ error: 'Missing instructor category id' }, { status: 400 });
  
  const parse = InstructorCategorySchema.partial().safeParse(update);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('instructor_categories')
    .update(parse.data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Instructor category not found' }, { status: 404 });
  return NextResponse.json({ instructor_category: data }, { status: 200 });
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
  
  if (!id) return NextResponse.json({ error: 'Missing instructor category id' }, { status: 400 });
  
  const { error } = await supabase.from('instructor_categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
}
