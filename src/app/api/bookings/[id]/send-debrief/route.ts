import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { sendDebriefReport } from '@/lib/email/booking-emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    // Fetch booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        user:user_id(*),
        flight_logs(
          *,
          checked_out_aircraft:checked_out_aircraft_id(*)
        )
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

    // Fetch lesson progress for this booking with instructor details
    const { data: lessonProgress, error: lpError } = await supabase
      .from('lesson_progress')
      .select(`
        *,
        instructor:instructor_id(
          id,
          user:user_id(
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lpError || !lessonProgress) {
      return NextResponse.json(
        { error: 'No lesson progress found for this booking' },
        { status: 404 }
      );
    }

    // Fetch lesson details if lesson_id exists
    let lesson = null;
    if (lessonProgress.lesson_id) {
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('name')
        .eq('id', lessonProgress.lesson_id)
        .single();
      lesson = lessonData;
    }

    // Fetch flight experiences if lesson progress exists
    let flightExperiences: Array<{
      experience_type: string;
      duration: number;
      notes?: string;
    }> = [];
    if (lessonProgress.id) {
      const { data: feData } = await supabase
        .from('flight_experience')
        .select(`
          experience_type,
          duration,
          notes
        `)
        .eq('lesson_progress_id', lessonProgress.id)
        .order('created_at', { ascending: true });
      flightExperiences = feData || [];
    }

    // Send the email
    const result = await sendDebriefReport({
      booking,
      member: booking.user,
      lessonProgress,
      lesson,
      flightExperiences,
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
    console.error('Error sending debrief report email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}