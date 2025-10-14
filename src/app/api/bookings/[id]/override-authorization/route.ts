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

    // STEP 1: Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Only instructors and above can override authorization
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Overriding authorization requires instructor, admin, or owner role'
      }, { status: 403 });
    }

    // STEP 3: Verify booking exists
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // STEP 4: Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({
        error: 'Override reason is required'
      }, { status: 400 });
    }

    // STEP 5: Update booking with override
    const { data, error } = await supabase
      .from('bookings')
      .update({
        authorization_override: true,
        authorization_override_by: user.id,
        authorization_override_at: new Date().toISOString(),
        authorization_override_reason: reason.trim()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error setting authorization override:', error);
      return NextResponse.json({ error: 'Failed to set authorization override' }, { status: 500 });
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

    // STEP 1: Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Only instructors and above can remove overrides
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Removing authorization override requires instructor, admin, or owner role'
      }, { status: 403 });
    }

    // STEP 3: Verify booking exists
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, authorization_override')
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // STEP 4: Remove override
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
      console.error('Error removing authorization override:', error);
      return NextResponse.json({ error: 'Failed to remove authorization override' }, { status: 500 });
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
