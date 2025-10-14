import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';
import { CreateRosterRuleRequest } from '@/types/roster';

const CreateRosterRuleSchema = z.object({
  instructor_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  effective_from: z.string().optional(),
  effective_until: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(data => data.start_time < data.end_time, {
  message: "End time must be after start time",
  path: ["end_time"]
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STEP 2: Authorization - Only instructors and above can view roster rules
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Viewing roster rules requires instructor, admin, or owner role'
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    
    const instructor_id = searchParams.get('instructor_id');
    const day_of_week = searchParams.get('day_of_week');
    const is_active = searchParams.get('is_active');
    const date = searchParams.get('date'); // YYYY-MM-DD format for effective date filtering

    let query = supabase
      .from('roster_rules')
      .select(`
        *,
        instructor:instructors(
          id,
          user_id,
          users!instructors_user_id_fkey(
            first_name,
            last_name,
            email
          )
        )
      `)
      .is('voided_at', null); // Only get non-voided records

    if (instructor_id) {
      query = query.eq('instructor_id', instructor_id);
    }

    if (day_of_week !== null) {
      query = query.eq('day_of_week', parseInt(day_of_week));
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    // Filter by effective date range if date is provided (major performance improvement)
    if (date) {
      query = query
        .lte('effective_from', date) // effective_from <= date
        .or(`effective_until.is.null,effective_until.gte.${date}`); // effective_until IS NULL OR effective_until >= date
    }

    query = query.order('day_of_week').order('start_time');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching roster rules:', error);
      return NextResponse.json({ error: 'Failed to fetch roster rules' }, { status: 500 });
    }

    return NextResponse.json({ roster_rules: data });
  } catch (error) {
    console.error('Error in GET /api/roster-rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Only admin/owner can create roster rules
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Creating roster rules requires admin or owner role'
      }, { status: 403 });
    }

    const body = await req.json();

    const validatedData = CreateRosterRuleSchema.parse(body);

    // Check for conflicts before creating
    const { data: conflictCheck } = await supabase.rpc('check_schedule_conflict', {
      p_instructor_id: validatedData.instructor_id,
      p_date: validatedData.effective_from || new Date().toISOString().split('T')[0],
      p_start_time: validatedData.start_time,
      p_end_time: validatedData.end_time,
    });

    if (conflictCheck) {
      return NextResponse.json(
        { error: 'Schedule conflict detected with existing roster rule or override' },
        { status: 409 }
      );
    }

    const insertData: CreateRosterRuleRequest = {
      instructor_id: validatedData.instructor_id,
      day_of_week: validatedData.day_of_week,
      start_time: validatedData.start_time,
      end_time: validatedData.end_time,
      effective_from: validatedData.effective_from,
      effective_until: validatedData.effective_until,
      notes: validatedData.notes,
    };

    const { data, error } = await supabase
      .from('roster_rules')
      .insert(insertData)
      .select(`
        *,
        instructor:instructors(
          id,
          user_id,
          users!instructors_user_id_fkey(
            first_name,
            last_name,
            email
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error creating roster rule:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A roster rule with these exact times already exists for this instructor and day' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create roster rule' }, { status: 500 });
    }

    return NextResponse.json({ roster_rule: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }

    console.error('Error in POST /api/roster-rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
