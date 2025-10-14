import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';
import { UpdateShiftOverrideRequest } from '@/types/shift-overrides';

const UpdateShiftOverrideSchema = z.object({
  override_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  override_type: z.enum(['add', 'replace', 'cancel']).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  replaces_rule_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(data => {
  // If override_type is provided, validate time constraints
  if (data.override_type) {
    if (data.override_type === 'cancel') {
      return !data.start_time && !data.end_time;
    }
    if (data.override_type === 'add' || data.override_type === 'replace') {
      if (data.start_time && data.end_time) {
        return data.start_time < data.end_time;
      }
    }
  }
  // If times are provided without override_type change, validate they make sense
  if (data.start_time && data.end_time) {
    return data.start_time < data.end_time;
  }
  return true;
}, {
  message: "Invalid time configuration",
  path: ["override_type"]
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Only instructors+ can view shift overrides
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

    const { data, error } = await supabase
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
      .eq('id', id)
      .is('voided_at', null) // Only get non-voided records
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Shift override not found' }, { status: 404 });
      }
      console.error('Error fetching shift override:', error);
      return NextResponse.json({ error: 'Failed to fetch shift override' }, { status: 500 });
    }

    return NextResponse.json({ shift_override: data });
  } catch (error) {
    console.error('Error in GET /api/shift-overrides/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Only admin/owner can update shift overrides
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Updating shift overrides requires admin or owner role'
      }, { status: 403 });
    }

    const body = await req.json();

    const validatedData = UpdateShiftOverrideSchema.parse(body);

    // If updating times or date, check for conflicts (except for cancel type)
    if (validatedData.start_time || validatedData.end_time || validatedData.override_date || validatedData.override_type) {
      // First get the current override to fill in missing values for conflict check
      const { data: currentOverride } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('id', id)
        .is('voided_at', null) // Only get non-voided records
        .single();

      if (currentOverride) {
        const checkType = validatedData.override_type || currentOverride.override_type;
        
        if (checkType !== 'cancel') {
          const checkDate = validatedData.override_date || currentOverride.override_date;
          const checkStartTime = validatedData.start_time || currentOverride.start_time;
          const checkEndTime = validatedData.end_time || currentOverride.end_time;

          if (checkStartTime && checkEndTime) {
            const { data: conflictCheck } = await supabase.rpc('check_schedule_conflict', {
              p_instructor_id: currentOverride.instructor_id,
              p_date: checkDate,
              p_start_time: checkStartTime,
              p_end_time: checkEndTime,
              p_exclude_override_id: id,
            });

            if (conflictCheck) {
              return NextResponse.json(
                { error: 'Schedule conflict detected with existing roster rule or override' },
                { status: 409 }
              );
            }
          }
        }
      }
    }

    const updateData: UpdateShiftOverrideRequest & { updated_at: string } = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('shift_overrides')
      .update(updateData)
      .eq('id', id)
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Shift override not found' }, { status: 404 });
      }
      console.error('Error updating shift override:', error);
      return NextResponse.json({ error: 'Failed to update shift override' }, { status: 500 });
    }

    return NextResponse.json({ shift_override: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }

    console.error('Error in PATCH /api/shift-overrides/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // STEP 1: Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Only admin/owner can delete shift overrides
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      return NextResponse.json({
        error: 'Forbidden: Deleting shift overrides requires admin or owner role'
      }, { status: 403 });
    }

    // Soft delete by setting voided_at timestamp
    const { error } = await supabase
      .from('shift_overrides')
      .update({ 
        voided_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .is('voided_at', null); // Only update non-voided records

    if (error) {
      console.error('Error soft deleting shift override:', error);
      return NextResponse.json({ error: 'Failed to delete shift override' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Shift override deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/shift-overrides/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
