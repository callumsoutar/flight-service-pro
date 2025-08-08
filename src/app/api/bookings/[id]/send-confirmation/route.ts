import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { sendBookingConfirmation } from '@/lib/email/booking-emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    // Fetch booking with all related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        user:user_id(*),
        instructor:instructor_id(
          *,
          users:users!instructors_user_id_fkey(*)
        ),
        aircraft:aircraft_id(*),
        lesson:lessons(name),
        flight_type:flight_types(name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (!booking.user) {
      return NextResponse.json(
        { error: 'No user associated with this booking' },
        { status: 400 }
      );
    }

    if (!booking.user.email) {
      return NextResponse.json(
        { error: 'User has no email address' },
        { status: 400 }
      );
    }

    // Prepare instructor data
    let instructor = null;
    if (booking.instructor && booking.instructor.users) {
      const instructorUser = Array.isArray(booking.instructor.users) 
        ? booking.instructor.users[0] 
        : booking.instructor.users;
      
      instructor = {
        name: `${instructorUser?.first_name || ''} ${instructorUser?.last_name || ''}`.trim() || 
              instructorUser?.email || 
              booking.instructor.id,
        email: instructorUser?.email,
      };
    }

    // Prepare lesson and flight type data
    const lesson = booking.lesson ? { name: booking.lesson.name } : null;
    const flightType = booking.flight_type ? { name: booking.flight_type.name } : null;

    // Send the email
    const result = await sendBookingConfirmation({
      booking,
      member: booking.user,
      aircraft: booking.aircraft,
      instructor,
      lesson,
      flightType,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });

  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
