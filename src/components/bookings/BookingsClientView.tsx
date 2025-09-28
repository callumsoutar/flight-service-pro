"use client";
import * as React from "react";
import BookingsTabsClient from "@/components/bookings/BookingsTabsClient";
import BookingsTable from "@/app/(auth)/dashboard/bookings/BookingsTable";
import type { Booking } from "@/types/bookings";

interface BookingsClientViewProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  userRole: string;
}

export default function BookingsClientView({
  bookings,
  members,
  instructors,
  aircraftList,
  userRole
}: BookingsClientViewProps) {
  const [selectedTab, setSelectedTab] = React.useState("all");

  return (
    <>
      <BookingsTabsClient selectedTab={selectedTab} onTabChange={setSelectedTab} userRole={userRole} />
      <BookingsTable
        bookings={bookings}
        members={members}
        instructors={instructors}
        aircraftList={aircraftList}
        statusFilter={selectedTab}
      />
    </>
  );
}