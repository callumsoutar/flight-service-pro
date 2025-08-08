"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Aircraft } from "@/types/aircraft";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plane } from "lucide-react";

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-500" },
  available: { label: "Available", color: "bg-green-500" },
  in_use: { label: "In Use", color: "bg-blue-600" },
  maintenance: { label: "Maintenance", color: "bg-red-500" },
};

export default function AircraftListClient() {
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  // Custom filter for registration, type, or status
  const filteredAircraft = React.useMemo(() => {
    if (!search) return aircraftList;
    const q = search.toLowerCase();
    return aircraftList.filter((ac) => {
      return (
        (ac.registration && ac.registration.toLowerCase().includes(q)) ||
        (ac.type && ac.type.toLowerCase().includes(q)) ||
        (ac.status && ac.status.toLowerCase().includes(q))
      );
    });
  }, [aircraftList, search]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAircraft.length / pageSize);
  const paginatedAircraft = React.useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return filteredAircraft.slice(start, end);
  }, [filteredAircraft, currentPage, pageSize]);

  const canPreviousPage = currentPage > 0;
  const canNextPage = currentPage < totalPages - 1;

  useEffect(() => {
    async function fetchAircraft() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/aircraft");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch aircraft");
        }
        const data = await res.json();
        setAircraftList(data.aircrafts || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || "Unknown error");
        } else {
          setError("Unknown error");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAircraft();
  }, []);

  if (loading) {
    return <div className="bg-white rounded-xl shadow p-6 text-center text-muted-foreground">Loading aircraft...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-xl shadow p-6 text-center text-destructive">{error}</div>;
  }
  if (aircraftList.length === 0) {
    return <div className="bg-white rounded-xl shadow p-6 text-center text-muted-foreground">No aircraft found.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
      {/* Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <h2 className="text-xl font-bold">Aircraft Fleet</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center justify-end">
          <Input
            placeholder="Search aircraft..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
        </div>
      </div>
      
      {/* Table */}
      <div className="w-full">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Last Maintenance</TableHead>
                <TableHead>Next Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAircraft.length ? (
                paginatedAircraft.map((ac) => (
                  <TableRow
                    key={ac.id}
                    className="cursor-pointer hover:bg-indigo-50 transition"
                    onClick={() => router.push(`/dashboard/aircraft/view/${ac.id}`)}
                  >
                    <TableCell>
                      {ac.aircraft_image_url ? (
                        <Image
                          src={ac.aircraft_image_url}
                          alt={ac.registration}
                          width={48}
                          height={48}
                          className="w-12 h-12 object-cover rounded border"
                          style={{ background: '#f3f4f6' }}
                          priority={true}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                          <Plane className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-base">{ac.registration}</TableCell>
                    <TableCell>{ac.type}</TableCell>
                    <TableCell>
                      <Badge className={`${statusMap[ac.status ?? "available"]?.color || "bg-gray-400"} text-white font-semibold px-3 py-1.5 text-xs`}>
                        {statusMap[ac.status ?? "available"]?.label || ac.status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{ac.total_hours}h</TableCell>
                    <TableCell>{ac.last_maintenance_date ? ac.last_maintenance_date.split("T")[0] : "-"}</TableCell>
                    <TableCell>{ac.next_maintenance_date ? ac.next_maintenance_date.split("T")[0] : "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => prev - 1)}
            disabled={!canPreviousPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!canNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
} 