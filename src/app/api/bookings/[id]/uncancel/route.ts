import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';

export async function POST(
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

    // Check if booking exists and user has permission to uncancel it
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        user:users!bookings_user_id_fkey(id, first_name, last_name, email),
        instructor:instructors!bookings_instructor_id_fkey(
          id,
          user:users!instructors_user_id_fkey(id, first_name, last_name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check permissions - user can uncancel their own booking, instructor can uncancel their assigned bookings, admin can uncancel any
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        roles!user_roles_role_id_fkey(name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    const isAdmin = userRoles?.some(ur => (ur.roles as unknown as { name: string })?.name === 'admin');
    const isOwner = userRoles?.some(ur => (ur.roles as unknown as { name: string })?.name === 'owner');
    const isInstructor = userRoles?.some(ur => (ur.roles as unknown as { name: string })?.name === 'instructor');
    const isBookingOwner = booking.user_id === user.id;
    const isAssignedInstructor = booking.instructor?.user?.id === user.id;
    
    if (!isAdmin && !isOwner && !isBookingOwner && !(isInstructor && isAssignedInstructor)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if booking is currently cancelled
    if (booking.status !== 'cancelled') {
      return NextResponse.json({ error: 'Booking is not cancelled' }, { status: 400 });
    }

    // Use the uncancel_booking function
    const { error: uncancelError } = await supabase
      .rpc('uncancel_booking', {
        p_booking_id: id,
      });

    if (uncancelError) {
      console.error('Error uncancelling booking:', uncancelError);
      return NextResponse.json({ error: uncancelError.message || 'Failed to uncancel booking' }, { status: 500 });
    }

    // Get the updated booking
    const { data: updatedBooking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        user:users!bookings_user_id_fkey(id, first_name, last_name, email),
        instructor:instructors!bookings_instructor_id_fkey(
          id,
          user:users!instructors_user_id_fkey(id, first_name, last_name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated booking:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated booking' }, { status: 500 });
    }

    return NextResponse.json({ 
      booking: updatedBooking,
      message: 'Booking uncancelled successfully'
    });

  } catch (error) {
    console.error('Error in uncancel booking route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
