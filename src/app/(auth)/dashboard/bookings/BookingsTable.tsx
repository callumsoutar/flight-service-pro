"use client";
import * as React from "react";
import type { Booking } from "@/types/bookings";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { Button } from "@/components/ui/button";
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
  // Sorting state
  const [sortBy, setSortBy] = React.useState<"start_time" | "instructor" | "aircraft">("start_time");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  // Helper lookups
  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name || "--";
  const getInstructorName = React.useCallback((id: string) => {
    return instructors.find((i) => i.id === id)?.name || "--";
  }, [instructors]);
  const getAircraftReg = React.useCallback((id: string) => {
    return aircraftList.find((a) => a.id === id)?.registration || "--";
  }, [aircraftList]);

  // Sorting logic
  const sorted = React.useMemo(() => {
    return [...bookings].sort((a, b) => {
      if (sortBy === "start_time") {
        return sortDir === "asc"
          ? new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          : new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }
      if (sortBy === "instructor") {
        const aName = getInstructorName(a.instructor_id ?? "");
        const bName = getInstructorName(b.instructor_id ?? "");
        return sortDir === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
      if (sortBy === "aircraft") {
        const aReg = getAircraftReg(a.aircraft_id ?? "");
        const bReg = getAircraftReg(b.aircraft_id ?? "");
        return sortDir === "asc" ? aReg.localeCompare(bReg) : bReg.localeCompare(aReg);
      }
      return 0;
    });
  }, [bookings, sortBy, sortDir, getAircraftReg, getInstructorName]);

  // Render
  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-2xl font-bold">Bookings List</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "start_time" ? "default" : "outline"}
            onClick={() => setSortBy("start_time")}
          >
            Date
          </Button>
          <Button
            variant={sortBy === "instructor" ? "default" : "outline"}
            onClick={() => setSortBy("instructor")}
          >
            Instructor
          </Button>
          <Button
            variant={sortBy === "aircraft" ? "default" : "outline"}
            onClick={() => setSortBy("aircraft")}
          >
            Aircraft
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            title="Toggle sort direction"
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </Button>
        </div>
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
            {sorted.map((b) => (
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