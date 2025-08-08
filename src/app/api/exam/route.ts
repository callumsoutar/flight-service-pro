import { NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const syllabus_id = searchParams.get('syllabus_id');
  
  const supabase = await createClient();
  let query = supabase
    .from('exam')
    .select('id, name, description, syllabus_id, passing_score, is_active, created_at, updated_at')
    .order('name', { ascending: true });

  // Filter by syllabus_id if provided, otherwise return all exams
  if (syllabus_id) {
    query = query.eq('syllabus_id', syllabus_id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST() {
  // Create exam
  return NextResponse.json({ message: 'Create exam - not implemented' });
}

export async function PUT() {
  // Update exam
  return NextResponse.json({ message: 'Update exam - not implemented' });
}

export async function DELETE() {
  // Delete exam
  return NextResponse.json({ message: 'Delete exam - not implemented' });
} 