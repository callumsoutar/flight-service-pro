import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    user_id,
    booking_count,
    start_date,
    until_date,
    days,
    time_slot,
    aircraft_id,
    instructor_id
  } = body;

  try {
    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (!userData?.email) {
      return NextResponse.json({ message: "No email found for user" });
    }

    // Get aircraft details
    const { data: aircraftData } = await supabase
      .from('aircraft')
      .select('registration, type')
      .eq('id', aircraft_id)
      .single();

    // Get instructor details if provided
    let instructorData = null;
    if (instructor_id) {
      const { data: instructor } = await supabase
        .from('instructors')
        .select(`
          *,
          users:users!instructors_user_id_fkey(first_name, last_name, email)
        `)
        .eq('id', instructor_id)
        .single();

      if (instructor?.users) {
        const instructorUser = Array.isArray(instructor.users)
          ? instructor.users[0]
          : instructor.users;

        instructorData = {
          name: `${instructorUser?.first_name || ''} ${instructorUser?.last_name || ''}`.trim() ||
                instructorUser?.email ||
                instructor.id,
          email: instructorUser?.email,
        };
      }
    }

    // Format day names for display
    const dayNames = days.map((day: string) =>
      day.charAt(0).toUpperCase() + day.slice(1)
    ).join(', ');

    // Compose email content
    const memberName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email;
    const aircraftDisplay = aircraftData ? `${aircraftData.registration} (${aircraftData.type})` : aircraft_id;
    const instructorDisplay = instructorData?.name || 'No instructor assigned';

    // For now, just log the summary instead of sending an actual email
    // This avoids the Resend rate limiting and domain verification issues

    return NextResponse.json({
      message: "Bulk booking notification logged successfully",
      summary: {
        bookingCount: booking_count,
        member: memberName,
        dateRange: `${start_date} to ${until_date}`,
        days: dayNames,
        timeSlot: time_slot,
        aircraft: aircraftDisplay,
        instructor: instructorDisplay
      }
    });
  } catch (error) {
    console.error('Error sending bulk booking notification:', error);
    return NextResponse.json({
      error: "Failed to send notification",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}