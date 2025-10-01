import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { MaintenanceVisit } from '@/types/maintenance_visits';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const aircraft_id = searchParams.get('aircraft_id');
  const component_id = searchParams.get('component_id');
  const maintenance_visit_id = searchParams.get('maintenance_visit_id');

  let query = supabase.from('maintenance_visits').select('*');
  if (maintenance_visit_id) {
    query = query.eq('id', maintenance_visit_id);
    const { data, error } = await query.single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data as MaintenanceVisit);
  }
  if (aircraft_id) query = query.eq('aircraft_id', aircraft_id);
  if (component_id) query = query.eq('component_id', component_id);

  const { data, error } = await query.order('visit_date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as MaintenanceVisit[]);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  // Accept new scheduling fields
  const {
    booking_id,
    scheduled_for,
    scheduled_end,
    scheduled_by,
    ...rest
  } = body;

  // Start transaction
  const { data: visit, error: visitError } = await supabase.from('maintenance_visits').insert([
    {
      ...rest,
      booking_id,
      scheduled_for,
      scheduled_end,
      scheduled_by,
    }
  ]).select().single();
  if (visitError) return NextResponse.json({ error: visitError.message }, { status: 400 });

  // If this visit is for a component, update the component's scheduling fields
  if (visit.component_id && visit.hours_at_visit) {
    // Fetch the component
    const { data: component, error: compError } = await supabase.from('aircraft_components').select('*').eq('id', visit.component_id).single();
    if (compError) return NextResponse.json({ error: compError.message }, { status: 400 });
    // Calculate new due values
    const intervalType = component.interval_type;
    const intervalHours = component.interval_hours || 0;
    const intervalDays = component.interval_days || 0;
    
    // Use override values from payload if provided, otherwise calculate
    // This allows users to manually adjust next due values if needed
    let newDueHours: number;
    if (body.next_due_hours !== undefined && body.next_due_hours !== null) {
      // User provided override
      newDueHours = Number(body.next_due_hours);
    } else {
      // Calculate from component's CURRENT base due (no extension)
      // This ensures extensions NEVER become cumulative
      const baseDueHours = Number(component.current_due_hours);
      newDueHours = baseDueHours + intervalHours;
    }
    
    let newDueDate: string | null = component.current_due_date;
    if (body.next_due_date) {
      // User provided override
      newDueDate = body.next_due_date;
    } else if (intervalType === 'CALENDAR' || intervalType === 'BOTH') {
      // Calculate from visit date
      const baseDate = new Date(visit.visit_date);
      newDueDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // Update the component
    const { error: updateError } = await supabase.from('aircraft_components').update({
      last_completed_hours: visit.hours_at_visit,
      last_completed_date: visit.visit_date,
      current_due_hours: newDueHours,
      extension_limit_hours: null, // Clear extension after maintenance
      current_due_date: newDueDate,
    }).eq('id', visit.component_id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json(visit as MaintenanceVisit, { status: 201 });
} 

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, booking_id, scheduled_for, scheduled_end, scheduled_by, ...updateFields } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Update the maintenance visit
  const { data: visit, error } = await supabase
    .from('maintenance_visits')
    .update({
      ...updateFields,
      booking_id,
      scheduled_for,
      scheduled_end,
      scheduled_by,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Only update component due dates if relevant fields were actually changed
  // This prevents automatic recalculation when just editing technician names, notes, etc.
  const relevantFieldsChanged = body.visit_date || body.hours_at_visit || body.next_due_hours || body.next_due_date;

  if (visit && visit.component_id && visit.hours_at_visit && relevantFieldsChanged) {
    // Fetch the component
    const { data: component, error: compError } = await supabase.from('aircraft_components').select('*').eq('id', visit.component_id).single();
    if (compError) return NextResponse.json({ error: compError.message }, { status: 400 });

    // Only update component if specific override fields are provided
    // This prevents automatic recalculation on every edit
    if (body.next_due_hours !== undefined || body.next_due_date !== undefined) {
      const intervalType = component.interval_type;
      const intervalHours = component.interval_hours || 0;
      const intervalDays = component.interval_days || 0;

      let newDueHours: number = component.current_due_hours;
      if (body.next_due_hours !== undefined && body.next_due_hours !== null) {
        // User provided override
        newDueHours = Number(body.next_due_hours);
      } else if (body.hours_at_visit && body.hours_at_visit !== component.last_completed_hours) {
        // Only recalculate if hours_at_visit actually changed
        const baseDueHours = Number(component.current_due_hours);
        newDueHours = baseDueHours + intervalHours;
      }

      let newDueDate: string | null = component.current_due_date;
      if (body.next_due_date !== undefined) {
        newDueDate = body.next_due_date;
      } else if (body.visit_date && (intervalType === 'CALENDAR' || intervalType === 'BOTH')) {
        // Only recalculate if visit_date actually changed
        const baseDate = new Date(visit.visit_date);
        newDueDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
      }

      // Update the component
      const { error: updateError } = await supabase.from('aircraft_components').update({
        last_completed_hours: visit.hours_at_visit,
        last_completed_date: visit.visit_date,
        current_due_hours: newDueHours,
        extension_limit_hours: null, // Clear extension after maintenance
        current_due_date: newDueDate,
      }).eq('id', visit.component_id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json(visit as MaintenanceVisit, { status: 200 });
} 