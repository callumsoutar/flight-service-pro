import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from "@/lib/SupabaseServerClient";
import { FlightAuthorizationClient } from './FlightAuthorizationClient';
import type { Booking } from '@/types/bookings';
import type { FlightAuthorization } from '@/types/flight_authorizations';

interface FlightAuthorizationPageProps {
  params: Promise<{ id: string }>;
}

export default async function FlightAuthorizationPage({ params }: FlightAuthorizationPageProps) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch booking with all related data
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      *,
      user:user_id(id, first_name, last_name, email),
      instructor:instructor_id(
        *,
        users:users!instructors_user_id_fkey(
          id, first_name, last_name, email
        )
      ),
      aircraft:aircraft_id(id, registration, type),
      flight_type:flight_type_id(*)
    `)
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    redirect('/dashboard/bookings');
  }

  // Check if user has permission to view this authorization
  // Students can only view their own bookings, instructors/admins can view all
  if (booking.user_id !== user.id) {
    const { data: userRole } = await supabase.rpc('get_user_role', { user_id: user.id });
    if (!userRole || !['instructor', 'admin', 'owner'].includes(userRole)) {
      redirect('/dashboard/bookings');
    }
  }

  // Check if this is actually a solo flight that needs authorization
  let requiresAuthorization = false;
  if (booking.flight_type_id) {
    const { data: flightType } = await supabase
      .from("flight_types")
      .select("instruction_type")
      .eq("id", booking.flight_type_id)
      .single();
    
    // Require authorization for solo flights without an instructor
    requiresAuthorization = flightType?.instruction_type === 'solo' && !booking.instructor_id;
  }

  // If authorization is not required, redirect back to booking
  if (!requiresAuthorization) {
    redirect(`/dashboard/bookings/view/${bookingId}`);
  }

  // Check if authorization already exists
  const { data: existingAuthorization } = await supabase
    .from("flight_authorizations")
    .select(`
      *,
      booking:booking_id(*),
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
    .eq("booking_id", bookingId)
    .single();

  // Get current user's role for permission checking
  const { data: currentUserRole } = await supabase.rpc('get_user_role', { user_id: user.id });

  // Fetch all instructors for selection
  const { data: instructors } = await supabase
    .from("instructors")
    .select(`
      id,
      user_id,
      users!instructors_user_id_fkey (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .order('users(first_name)');

  const formattedInstructors = (instructors || []).map((instructor) => {
    const user = instructor.users?.[0];
    return {
      id: instructor.id,
      user_id: instructor.user_id,
      name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : instructor.id,
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || ''
    };
  });

  return (
    <FlightAuthorizationClient
      booking={booking as Booking}
      existingAuthorization={existingAuthorization as FlightAuthorization | null}
      instructors={formattedInstructors}
      user={user}
      userRole={currentUserRole}
    />
  );
}
