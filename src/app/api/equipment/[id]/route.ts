import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, context: { params: any }) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Role check
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Equipment access requires instructor, admin, or owner role'
    }, { status: 403 });
  }

  const params = await context?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', id)
    .is('voided_at', null) // Only return non-voided equipment
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ equipment: data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PATCH(req: NextRequest, context: { params: any }) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Role check
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Equipment updates require instructor, admin, or owner role'
    }, { status: 403 });
  }

  const params = await context?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });
  const body = await req.json();
  const { data, error } = await supabase
    .from('equipment')
    .update(body)
    .eq('id', id)
    .is('voided_at', null) // Only update non-voided equipment
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    // Check if the row exists (no-op update)
    const { data: existing, error: fetchError } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .is('voided_at', null)
      .single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'No equipment found' }, { status: 404 });
    }
    return NextResponse.json({ equipment: existing });
  }
  return NextResponse.json({ equipment: data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(req: NextRequest, context: { params: any }) {
  const supabase = await createClient();

  // STEP 1: Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // STEP 2: Authorization - Role check (admin/owner only for deletion)
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({
      error: 'Forbidden: Equipment deletion requires admin or owner role'
    }, { status: 403 });
  }

  const params = await context?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing equipment id' }, { status: 400 });

  // Soft delete by setting voided_at timestamp
  const { data, error } = await supabase
    .from('equipment')
    .update({ voided_at: new Date().toISOString() })
    .eq('id', id)
    .eq('voided_at', null) // Only update if not already voided
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Equipment not found or already deleted' }, { status: 404 });

  return NextResponse.json({ success: true, equipment: data });
} 