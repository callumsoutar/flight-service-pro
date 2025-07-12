import { NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const syllabus_id = searchParams.get('syllabus_id');
  if (!syllabus_id) {
    return NextResponse.json({ error: 'Missing syllabus_id' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exam')
    .select('id, name, description, syllabus_id, organization_id, created_at')
    .eq('syllabus_id', syllabus_id)
    .order('name', { ascending: true });
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