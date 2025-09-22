import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';
import { UpdateRosterRuleRequest } from '@/types/roster';

const UpdateRosterRuleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  is_active: z.boolean().optional(),
  effective_from: z.string().optional(),
  effective_until: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(data => {
  if (data.start_time && data.end_time) {
    return data.start_time < data.end_time;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["end_time"]
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
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
      .eq('id', id)
      .is('voided_at', null) // Only get non-voided records
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Roster rule not found' }, { status: 404 });
      }
      console.error('Error fetching roster rule:', error);
      return NextResponse.json({ error: 'Failed to fetch roster rule' }, { status: 500 });
    }

    return NextResponse.json({ roster_rule: data });
  } catch (error) {
    console.error('Error in GET /api/roster-rules/[id]:', error);
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
    const body = await req.json();

    const validatedData = UpdateRosterRuleSchema.parse(body);

    // If updating times, check for conflicts
    if (validatedData.start_time || validatedData.end_time || validatedData.day_of_week) {
      // First get the current rule to fill in missing values for conflict check
      const { data: currentRule } = await supabase
        .from('roster_rules')
        .select('*')
        .eq('id', id)
        .is('voided_at', null) // Only get non-voided records
        .single();

      if (currentRule) {
        const checkDate = validatedData.effective_from || currentRule.effective_from;
        const checkStartTime = validatedData.start_time || currentRule.start_time;
        const checkEndTime = validatedData.end_time || currentRule.end_time;

        const { data: conflictCheck } = await supabase.rpc('check_schedule_conflict', {
          p_instructor_id: currentRule.instructor_id,
          p_date: checkDate,
          p_start_time: checkStartTime,
          p_end_time: checkEndTime,
          p_exclude_rule_id: id,
        });

        if (conflictCheck) {
          return NextResponse.json(
            { error: 'Schedule conflict detected with existing roster rule or override' },
            { status: 409 }
          );
        }
      }
    }

    const updateData: UpdateRosterRuleRequest & { updated_at: string } = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('roster_rules')
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
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Roster rule not found' }, { status: 404 });
      }
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A roster rule with these exact times already exists for this instructor and day' },
          { status: 409 }
        );
      }
      console.error('Error updating roster rule:', error);
      return NextResponse.json({ error: 'Failed to update roster rule' }, { status: 500 });
    }

    return NextResponse.json({ roster_rule: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }

    console.error('Error in PATCH /api/roster-rules/[id]:', error);
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

    // Soft delete by setting voided_at timestamp
    const { error } = await supabase
      .from('roster_rules')
      .update({ 
        voided_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .is('voided_at', null); // Only update non-voided records

    if (error) {
      console.error('Error soft deleting roster rule:', error);
      return NextResponse.json({ error: 'Failed to delete roster rule' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Roster rule deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/roster-rules/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
