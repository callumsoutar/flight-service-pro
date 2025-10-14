import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';
import { CreateShiftOverrideRequest } from '@/types/shift-overrides';

const CreateShiftOverrideSchema = z.object({
  instructor_id: z.string().uuid(),
  override_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  override_type: z.enum(['add', 'replace', 'cancel']),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  replaces_rule_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(data => {
  // For cancel type, start_time and end_time should be null
  if (data.override_type === 'cancel') {
    return !data.start_time && !data.end_time;
  }
  // For add and replace, both times should be provided and valid
  if (data.override_type === 'add' || data.override_type === 'replace') {
    return data.start_time && data.end_time && data.start_time < data.end_time;
  }
  return true;
}, {
  message: "Invalid time configuration for override type",
  path: ["override_type"]
}).refine(data => {
  // For replace type, replaces_rule_id should be provided
  if (data.override_type === 'replace') {
    return data.replaces_rule_id;
  }
  // For add and cancel, replaces_rule_id should be null
  if (data.override_type === 'add' || data.override_type === 'cancel') {
    return !data.replaces_rule_id;
  }
  return true;
}, {
  message: "Invalid replaces_rule_id for override type",
  path: ["replaces_rule_id"]
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STEP 2: Authorization - Only instructors and above can view shift overrides
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Viewing shift overrides requires instructor, admin, or owner role'
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    
    const instructor_id = searchParams.get('instructor_id');
    const override_date = searchParams.get('override_date');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    let query = supabase
      .from('shift_overrides')
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
        ),
        replaces_rule:roster_rules(
          id,
          day_of_week,
          start_time,
          end_time
        )
      `)
      .is('voided_at', null); // Only get non-voided records

    if (instructor_id) {
      query = query.eq('instructor_id', instructor_id);
    }

    if (override_date) {
      query = query.eq('override_date', override_date);
    }

    if (date_from) {
      query = query.gte('override_date', date_from);
    }

    if (date_to) {
      query = query.lte('override_date', date_to);
    }

    query = query.order('override_date').order('start_time');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching shift overrides:', error);
      return NextResponse.json({ error: 'Failed to fetch shift overrides' }, { status: 500 });
    }

    return NextResponse.json({ shift_overrides: data });
  } catch (error) {
    console.error('Error in GET /api/shift-overrides:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STEP 2: Authorization - Only admin/owner can create shift overrides
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Creating shift overrides requires admin or owner role'
      }, { status: 403 });
    }

    const body = await req.json();

    const validatedData = CreateShiftOverrideSchema.parse(body);

    // Check for conflicts before creating (except for cancel type)
    if (validatedData.override_type !== 'cancel' && validatedData.start_time && validatedData.end_time) {
      const { data: conflictCheck } = await supabase.rpc('check_schedule_conflict', {
        p_instructor_id: validatedData.instructor_id,
        p_date: validatedData.override_date,
        p_start_time: validatedData.start_time,
        p_end_time: validatedData.end_time,
      });

      if (conflictCheck) {
        return NextResponse.json(
          { error: 'Schedule conflict detected with existing roster rule or override' },
          { status: 409 }
        );
      }
    }

    const insertData: CreateShiftOverrideRequest = {
      instructor_id: validatedData.instructor_id,
      override_date: validatedData.override_date,
      override_type: validatedData.override_type,
      start_time: validatedData.start_time,
      end_time: validatedData.end_time,
      replaces_rule_id: validatedData.replaces_rule_id,
      notes: validatedData.notes,
    };

    const { data, error } = await supabase
      .from('shift_overrides')
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
        ),
        replaces_rule:roster_rules(
          id,
          day_of_week,
          start_time,
          end_time
        )
      `)
      .single();

    if (error) {
      console.error('Error creating shift override:', error);
      return NextResponse.json({ error: 'Failed to create shift override' }, { status: 500 });
    }

    return NextResponse.json({ shift_override: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }

    console.error('Error in POST /api/shift-overrides:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
