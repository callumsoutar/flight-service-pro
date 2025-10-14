import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';

const ConflictCheckSchema = z.object({
  instructor_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  exclude_rule_id: z.string().uuid().nullable().optional(),
  exclude_override_id: z.string().uuid().nullable().optional(),
}).refine(data => data.start_time < data.end_time, {
  message: "End time must be after start time",
  path: ["end_time"]
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Only instructors+ can check schedule conflicts
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Schedule conflict checking requires instructor, admin, or owner role'
      }, { status: 403 });
    }

    const body = await req.json();

    const validatedData = ConflictCheckSchema.parse(body);

    const { data: hasConflict, error } = await supabase.rpc('check_schedule_conflict', {
      p_instructor_id: validatedData.instructor_id,
      p_date: validatedData.date,
      p_start_time: validatedData.start_time,
      p_end_time: validatedData.end_time,
      p_exclude_rule_id: validatedData.exclude_rule_id,
      p_exclude_override_id: validatedData.exclude_override_id,
    });

    if (error) {
      console.error('Error checking schedule conflict:', error);
      return NextResponse.json({ error: 'Failed to check schedule conflict' }, { status: 500 });
    }

    // If there's a conflict, fetch the conflicting shifts for details
    let conflicting_shifts = undefined;
    if (hasConflict) {
      const dow = new Date(validatedData.date).getDay();

      // Get conflicting roster rules
      const { data: conflictingRules } = await supabase
        .from('roster_rules')
        .select('id, start_time, end_time, notes')
        .eq('instructor_id', validatedData.instructor_id)
        .eq('day_of_week', dow)
        .eq('is_active', true)
        .is('voided_at', null) // Exclude voided records
        .lte('effective_from', validatedData.date)
        .or(`effective_until.is.null,effective_until.gte.${validatedData.date}`)
        .not('id', 'eq', validatedData.exclude_rule_id || '')
        .filter('start_time', 'lt', validatedData.end_time)
        .filter('end_time', 'gt', validatedData.start_time);

      // Get conflicting overrides
      const { data: conflictingOverrides } = await supabase
        .from('shift_overrides')
        .select('id, start_time, end_time, override_type, notes')
        .eq('instructor_id', validatedData.instructor_id)
        .eq('override_date', validatedData.date)
        .is('voided_at', null) // Exclude voided records
        .in('override_type', ['add', 'replace'])
        .not('id', 'eq', validatedData.exclude_override_id || '')
        .filter('start_time', 'lt', validatedData.end_time)
        .filter('end_time', 'gt', validatedData.start_time);

      conflicting_shifts = [
        ...(conflictingRules || []).map(rule => ({
          id: rule.id,
          start_time: rule.start_time,
          end_time: rule.end_time,
          type: 'regular' as const,
          notes: rule.notes,
        })),
        ...(conflictingOverrides || []).map(override => ({
          id: override.id,
          start_time: override.start_time!,
          end_time: override.end_time!,
          type: override.override_type as 'add' | 'replace',
          notes: override.notes,
        })),
      ];
    }

    return NextResponse.json({
      has_conflict: hasConflict,
      conflicting_shifts,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }

    console.error('Error in POST /api/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
