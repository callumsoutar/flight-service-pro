import { createClient } from '@/lib/SupabaseServerClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { reason } = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - admin, owner, instructor role, or user with instructor record
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        roles!user_roles_role_id_fkey(name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    const isAdmin = userRoles?.some(ur => (ur.roles as unknown as { name: string })?.name === 'admin' || (ur.roles as unknown as { name: string })?.name === 'owner');
    const isInstructorRole = userRoles?.some(ur => (ur.roles as unknown as { name: string })?.name === 'instructor');
    
    // Also check if user has an instructor record (users can be instructors without explicit role)
    const { data: instructorRecord } = await supabase
      .from('instructors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const hasInstructorRecord = !!instructorRecord;

    if (!isAdmin && !isInstructorRole && !hasInstructorRecord) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update booking with override
    const { data, error } = await supabase
      .from('bookings')
      .update({
        authorization_override: true,
        authorization_override_by: user.id,
        authorization_override_at: new Date().toISOString(),
        authorization_override_reason: reason
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  } catch (err) {
    console.error('Error in override authorization:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove override
    const { data, error } = await supabase
      .from('bookings')
      .update({
        authorization_override: false,
        authorization_override_by: null,
        authorization_override_at: null,
        authorization_override_reason: null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  } catch (err) {
    console.error('Error removing override authorization:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
