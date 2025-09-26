import React from 'react';
import { createClient } from "@/lib/SupabaseServerClient";
import { FlightAuthorizationsClient } from './FlightAuthorizationsClient';
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

async function FlightAuthorizationsPage({ userRole }: ProtectedPageProps) {
  const supabase = await createClient();

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

// Export protected component with role restriction for instructors and above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(FlightAuthorizationsPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;
