import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { z } from 'zod';

const cancelBookingSchema = z.object({
  cancellation_category_id: z.string().uuid().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

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

    // Validate request body
    const body = await request.json();
    const validatedData = cancelBookingSchema.parse(body);

    // Check if booking exists and user has permission to cancel it
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

    // Check permissions - user can cancel their own booking, instructor can cancel their assigned bookings, admin can cancel any
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        roles!user_roles_role_id_fkey(name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    const isAdmin = userRoles?.some(ur => (ur.roles as unknown as { name: string })?.name === 'admin' || (ur.roles as unknown as { name: string })?.name === 'owner');
    const isInstructor = userRoles?.some(ur => (ur.roles as unknown as { name: string })?.name === 'instructor');
    const isOwner = booking.user_id === user.id;
    const isAssignedInstructor = booking.instructor?.user?.id === user.id;

    if (!isAdmin && !isOwner && !(isInstructor && isAssignedInstructor)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if booking is already cancelled or completed
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    if (booking.status === 'complete') {
      return NextResponse.json({ error: 'Cannot cancel completed booking' }, { status: 400 });
    }

    // Use the cancel_booking function
    const { error: cancelError } = await supabase
      .rpc('cancel_booking', {
        p_booking_id: id,
        p_cancellation_category_id: validatedData.cancellation_category_id || null,
        p_reason: validatedData.reason || null,
        p_notes: validatedData.notes || null,
      });

    if (cancelError) {
      console.error('Error cancelling booking:', cancelError);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    // Get the updated booking with cancellation details
    const { data: updatedBooking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        user:users!bookings_user_id_fkey(id, first_name, last_name, email),
        instructor:instructors!bookings_instructor_id_fkey(
          id,
          user:users!instructors_user_id_fkey(id, first_name, last_name, email)
        ),
        cancellation_category:cancellation_categories!bookings_cancellation_category_id_fkey(*),
        cancelled_by_user:users!bookings_cancelled_by_fkey(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated booking:', fetchError);
      return NextResponse.json({ error: 'Booking cancelled but failed to fetch updated data' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error in cancel booking route:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
