import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from "@/lib/SupabaseServerClient";
import { FlightAuthorizationsClient } from './FlightAuthorizationsClient';

export default async function FlightAuthorizationsPage() {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Check if user is instructor/admin/owner
  const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
  if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
    redirect('/dashboard');
  }

  // Fetch pending authorizations
  const { data: pendingAuthorizations } = await supabase
    .from("flight_authorizations")
    .select(`
      *,
      booking:booking_id(
        *,
        aircraft:aircraft_id(id, registration, type)
      ),
      student:student_id(id, first_name, last_name, email),
      aircraft:aircraft_id(id, registration, type),
      flight_type:flight_type_id(*),
      authorizing_instructor:authorizing_instructor_id(
        *,
        users:users!instructors_user_id_fkey(
          id, first_name, last_name, email
        )
      )
    `)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  // Fetch recent authorizations (approved/rejected)
  const { data: recentAuthorizations } = await supabase
    .from("flight_authorizations")
    .select(`
      *,
      booking:booking_id(
        *,
        aircraft:aircraft_id(id, registration, type)
      ),
      student:student_id(id, first_name, last_name, email),
      aircraft:aircraft_id(id, registration, type),
      flight_type:flight_type_id(*),
      authorizing_instructor:authorizing_instructor_id(
        *,
        users:users!instructors_user_id_fkey(
          id, first_name, last_name, email
        )
      ),
      approving_instructor:approving_instructor_id(
        *,
        users:users!instructors_user_id_fkey(
          id, first_name, last_name, email
        )
      )
    `)
    .in('status', ['approved', 'rejected'])
    .order('updated_at', { ascending: false })
    .limit(10);

  return (
    <FlightAuthorizationsClient
      pendingAuthorizations={pendingAuthorizations || []}
      recentAuthorizations={recentAuthorizations || []}
      userRole={userRole}
    />
  );
}
