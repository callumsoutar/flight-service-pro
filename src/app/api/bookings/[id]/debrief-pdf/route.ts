import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { renderToStream } from '@react-pdf/renderer';
import DebriefPDFTemplate from '@/components/debrief/DebriefPDFTemplate';
import type { Booking } from "@/types/bookings";
import type { User as UserType } from "@/types/users";
import type { Aircraft } from "@/types/aircraft";
import type { Lesson } from "@/types/lessons";
import type { LessonProgress } from "@/types/lesson_progress";
import type { FlightExperience } from "@/types/flight_experience";
import type { ExperienceType } from "@/types/experience_types";

interface BookingWithJoins extends Booking {
  user?: UserType;
  instructor?: UserType;
  lesson?: Lesson;
  aircraft?: Aircraft;
}

interface LessonProgressWithInstructor extends LessonProgress {
  instructor?: {
    id: string;
    user?: {
      id: string;
      first_name?: string;
      last_name?: string;
      email?: string;
    };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user role using the standardized RPC function
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    const canViewAllDebriefs = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

    // Fetch booking with related data
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        user:user_id(*),
        instructor:instructor_id(*),
        lesson:lesson_id(*),
        flight_logs(
          *,
          checked_out_aircraft:checked_out_aircraft_id(*)
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to fetch booking' },
        { status: 500 }
      );
    }

    const booking: BookingWithJoins | null = bookingData;

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Security check: instructors/admins/owners can download any debrief, others can only download their own
    if (!canViewAllDebriefs && booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only download your own debriefs' },
        { status: 403 }
      );
    }

    // Fetch lesson progress for this booking with instructor details
    const { data: lpData, error: lpError } = await supabase
      .from("lesson_progress")
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
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lpError && lpError.code !== 'PGRST116') {
      console.error('Error fetching lesson progress:', lpError);
    }

    const lessonProgress: LessonProgressWithInstructor | null = lpData;

    // Fetch lesson details if lesson_id exists
    let lesson: Lesson | null = null;
    if (lessonProgress?.lesson_id) {
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonProgress.lesson_id)
        .single();
      lesson = lessonData;
    }

    // Fetch flight experiences if lesson progress exists
    let flightExperiences: FlightExperience[] = [];
    if (lessonProgress?.id) {
      const { data: feData } = await supabase
        .from("flight_experience")
        .select("*")
        .eq("lesson_progress_id", lessonProgress.id)
        .order("created_at", { ascending: true });
      flightExperiences = feData || [];
    }

    // Fetch experience types
    const { data: etData } = await supabase
      .from("experience_types")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    const experienceTypes: ExperienceType[] = etData || [];

    // Generate PDF
    const pdfStream = await renderToStream(
      DebriefPDFTemplate({
        booking,
        lessonProgress,
        lesson,
        flightExperiences,
        experienceTypes,
      })
    );

    // Convert stream to buffer for Next.js response
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      // Ensure chunk is a Buffer
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(bufferChunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Generate filename
    const studentName = booking.user?.first_name && booking.user?.last_name
      ? `${booking.user.first_name}-${booking.user.last_name}`
      : 'Student';
    const date = lessonProgress?.date
      ? new Date(lessonProgress.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const filename = `Debrief-${studentName}-${date}.pdf`;

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
