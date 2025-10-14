import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';
import { DaySchedule, WeekSchedule } from '@/types/schedule';

const WeekScheduleQuerySchema = z.object({
  instructor_id: z.string().uuid(),
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Only instructors+ can view instructor schedules
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Viewing instructor schedules requires instructor, admin, or owner role'
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const instructor_id = searchParams.get('instructor_id');
    const week_start_date = searchParams.get('week_start_date');

    if (!instructor_id || !week_start_date) {
      return NextResponse.json(
        { error: 'instructor_id and week_start_date are required' },
        { status: 400 }
      );
    }

    const validatedData = WeekScheduleQuerySchema.parse({
      instructor_id,
      week_start_date,
    });

    // Call the database function to get the resolved schedule
    const { data: scheduleData, error } = await supabase.rpc('get_instructor_week_schedule', {
      p_instructor_id: validatedData.instructor_id,
      p_week_start_date: validatedData.week_start_date,
    });

    if (error) {
      console.error('Error fetching week schedule:', error);
      return NextResponse.json({ error: 'Failed to fetch week schedule' }, { status: 500 });
    }

    // Transform the data into the expected format
    interface ScheduleDay {
      date: string;
      day_of_week: number;
      shifts: unknown[];
    }

    const days: DaySchedule[] = (scheduleData || []).map((day: ScheduleDay) => ({
      date: day.date,
      day_of_week: day.day_of_week,
      shifts: Array.isArray(day.shifts) ? day.shifts : [],
    }));

    const weekSchedule: WeekSchedule = {
      week_start: validatedData.week_start_date,
      instructor_id: validatedData.instructor_id,
      days,
    };

    return NextResponse.json({ schedule: weekSchedule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }

    console.error('Error in GET /api/schedule/week:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
