"use client";
import * as React from "react";
import UnconfirmedBookingsSection from "./UnconfirmedBookingsSection";
import FlyingBookingsSection from "./FlyingBookingsSection";
import BookingsAdvancedSearch from "./BookingsAdvancedSearch";
import type { Booking } from "@/types/bookings";

interface PrivilegedUserBookingsViewProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
}

export default function PrivilegedUserBookingsView({
  bookings,
  members,
  instructors,
  aircraftList
}: PrivilegedUserBookingsViewProps) {
  return (
    <div className="space-y-8">
      {/* Section 1: Unconfirmed Bookings */}
      <UnconfirmedBookingsSection
        bookings={bookings}
        members={members}
        instructors={instructors}
        aircraftList={aircraftList}
      />

      {/* Section 2: Flying Bookings */}
      <FlyingBookingsSection
        bookings={bookings}
        members={members}
        instructors={instructors}
        aircraftList={aircraftList}
      />

      {/* Section 3: Advanced Search */}
      <BookingsAdvancedSearch
        members={members}
        instructors={instructors}
        aircraftList={aircraftList}
      />
    </div>
  );
}