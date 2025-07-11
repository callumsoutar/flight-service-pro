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
  if (visit.component_id) {
    // Fetch the component
    const { data: component, error: compError } = await supabase.from('aircraft_components').select('*').eq('id', visit.component_id).single();
    if (compError) return NextResponse.json({ error: compError.message }, { status: 400 });
    // Calculate new due values
    const intervalType = component.interval_type;
    const intervalHours = component.interval_hours || 0;
    const intervalDays = component.interval_days || 0;
    const prevScheduledDue = component.scheduled_due_hours || component.current_due_hours || 0;
    const newScheduledDue = prevScheduledDue + intervalHours;
    let newDueDate = component.current_due_date;
    if (intervalType === 'CALENDAR' || intervalType === 'BOTH') {
      // Use visit.visit_date as base
      const baseDate = new Date(visit.visit_date);
      newDueDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
    }
    // Update the component
    const { error: updateError } = await supabase.from('aircraft_components').update({
      last_completed_hours: visit.hours_at_visit,
      last_completed_date: visit.visit_date,
      scheduled_due_hours: newScheduledDue,
      current_due_hours: newScheduledDue,
      extension_limit_hours: null, // Clear extension after maintenance
      current_due_date: newDueDate,
      // Optionally: scheduled_due_date: newScheduledDueDate,
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

  // If this visit is for a component and status is 'Completed', update the component's scheduling fields
  if (visit && visit.component_id && visit.status === 'Completed') {
    // Fetch the component
    const { data: component, error: compError } = await supabase.from('aircraft_components').select('*').eq('id', visit.component_id).single();
    if (compError) return NextResponse.json({ error: compError.message }, { status: 400 });
    // Calculate new due values
    const intervalType = component.interval_type;
    const intervalHours = component.interval_hours || 0;
    const intervalDays = component.interval_days || 0;
    const prevScheduledDue = component.scheduled_due_hours || component.current_due_hours || 0;
    const newScheduledDue = prevScheduledDue + intervalHours;
    let newDueDate = component.current_due_date;
    if (intervalType === 'CALENDAR' || intervalType === 'BOTH') {
      // Use visit.visit_date as base
      const baseDate = new Date(visit.visit_date);
      newDueDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
    }
    // Update the component
    const { error: updateError } = await supabase.from('aircraft_components').update({
      last_completed_hours: visit.hours_at_visit,
      last_completed_date: visit.visit_date,
      scheduled_due_hours: newScheduledDue,
      current_due_hours: newScheduledDue,
      extension_limit_hours: null, // Clear extension after maintenance
      current_due_date: newDueDate,
      // Optionally: scheduled_due_date: newScheduledDueDate,
    }).eq('id', visit.component_id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json(visit as MaintenanceVisit, { status: 200 });
} 