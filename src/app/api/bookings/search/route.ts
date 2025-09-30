import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  const isPrivilegedUser = userRole && ['admin', 'owner', 'instructor'].includes(userRole);

  if (!isPrivilegedUser) {
    return NextResponse.json({
      error: 'Forbidden: Advanced search requires instructor+ privileges'
    }, { status: 403 });
  }

  const searchParams = req.nextUrl.searchParams;
  const instructor = searchParams.get("instructor");
  const aircraft = searchParams.get("aircraft");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  try {
    let bookingsQuery = supabase
      .from("bookings")
      .select(`
        id,
        aircraft_id,
        user_id,
        instructor_id,
        start_time,
        end_time,
        status,
        purpose,
        remarks,
        lesson_id,
        flight_type_id,
        booking_type,
        created_at,
        updated_at
      `, { count: 'exact' });

    let countQuery = supabase
      .from("bookings")
      .select("*", { count: 'exact', head: true });

    if (instructor) {
      bookingsQuery = bookingsQuery.eq('instructor_id', instructor);
      countQuery = countQuery.eq('instructor_id', instructor);
    }

    if (aircraft) {
      bookingsQuery = bookingsQuery.eq('aircraft_id', aircraft);
      countQuery = countQuery.eq('aircraft_id', aircraft);
    }


    // Handle date filtering for overlapping bookings
    if (startDate && endDate) {
      // For date range: find bookings that overlap with the selected range
      const startDateTime = `${startDate}T00:00:00.000Z`;
      const endDateTime = `${endDate}T23:59:59.999Z`;

      // Booking overlaps if: booking_start <= range_end AND booking_end >= range_start
      bookingsQuery = bookingsQuery
        .lte('start_time', endDateTime)
        .gte('end_time', startDateTime);
      countQuery = countQuery
        .lte('start_time', endDateTime)
        .gte('end_time', startDateTime);
    } else if (startDate) {
      // For start date only: find bookings that start on or after this date
      const startDateTime = `${startDate}T00:00:00.000Z`;
      bookingsQuery = bookingsQuery.gte('start_time', startDateTime);
      countQuery = countQuery.gte('start_time', startDateTime);
    } else if (endDate) {
      // For end date only: find bookings that start on or before this date
      const endDateTime = `${endDate}T23:59:59.999Z`;
      bookingsQuery = bookingsQuery.lte('start_time', endDateTime);
      countQuery = countQuery.lte('start_time', endDateTime);
    }

    if (status) {
      bookingsQuery = bookingsQuery.eq('status', status);
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const { data: bookings, error: bookingsError } = await bookingsQuery
      .order("start_time", { ascending: false })
      .range(offset, offset + limit - 1);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({
      bookings: bookings || [],
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    });

  } catch (error) {
    console.error('Booking search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}