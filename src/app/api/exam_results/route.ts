import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Org check
  const orgId = req.cookies.get('current_org_id')?.value;
  if (!orgId) {
    return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
  }
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }
  // Join exam_results -> exam -> syllabus
  const { data, error } = await supabase
    .from('exam_results')
    .select(`
      id,
      exam_id,
      user_id,
      score,
      result,
      date_completed,
      kdrs_completed,
      kdrs_signed_by,
      organization_id,
      created_at,
      exam:exam_id(id, name, syllabus_id, syllabus:syllabus_id(id, name))
    `)
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .order('date_completed', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ exam_results: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const {
    exam_id,
    user_id,
    organization_id,
    result,
    score,
    date_completed,
    kdrs_completed,
    kdrs_signed_by,
  } = body;
  if (!exam_id || !user_id || !organization_id || !result || !date_completed) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('exam_results')
    .insert([
      {
        exam_id,
        user_id,
        organization_id,
        result,
        score,
        date_completed,
        kdrs_completed,
        kdrs_signed_by,
      },
    ])
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ exam_result: data });
}

export async function PUT() {
  // Update exam result
  return NextResponse.json({ message: 'Update exam result - not implemented' });
}

export async function DELETE() {
  // Delete exam result
  return NextResponse.json({ message: 'Delete exam result - not implemented' });
} 