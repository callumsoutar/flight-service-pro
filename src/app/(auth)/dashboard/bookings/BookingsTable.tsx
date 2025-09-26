"use client";
import * as React from "react";
import type { Booking } from "@/types/bookings";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { useRouter } from "next/navigation";

interface BookingsTableProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
}



function formatDateTime(dateStr: string) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

export default function BookingsTable({ bookings, members, instructors, aircraftList }: BookingsTableProps) {
  const router = useRouter();
  // Helper lookups
  const getMemberName = (id: string | null) => {
    if (!id) return "--";
    return members.find((m) => m.id === id)?.name || "--";
  };
  const getInstructorName = React.useCallback((id: string) => {
    return instructors.find((i) => i.id === id)?.name || "--";
  }, [instructors]);
  const getAircraftReg = React.useCallback((id: string) => {
    return aircraftList.find((a) => a.id === id)?.registration || "--";
  }, [aircraftList]);

  // Render
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Bookings List</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Aircraft</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow
                key={b.id}
                className="hover:bg-blue-50 cursor-pointer transition"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/bookings/view/${b.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    router.push(`/dashboard/bookings/view/${b.id}`);
                  }
                }}
              >
                <TableCell>{formatDateTime(b.start_time)}</TableCell>
                <TableCell>{formatDateTime(b.end_time)}</TableCell>
                <TableCell>{getMemberName(b.user_id)}</TableCell>
                <TableCell>{getInstructorName(b.instructor_id ?? "")}</TableCell>
                <TableCell>{b.purpose || "--"}</TableCell>
                <TableCell>{getAircraftReg(b.aircraft_id ?? "")}</TableCell>
                <TableCell>
                  <StatusBadge status={b.status} className="font-semibold px-3 py-1 text-sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 