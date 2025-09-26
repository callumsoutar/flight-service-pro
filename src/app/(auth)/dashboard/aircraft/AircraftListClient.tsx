"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Aircraft } from "@/types/aircraft";
import { useRouter } from "next/navigation";
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
  const [currentPage] = useState(0);
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
  const paginatedAircraft = React.useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return filteredAircraft.slice(start, end);
  }, [filteredAircraft, currentPage, pageSize]);


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
      <div className="overflow-x-auto">
        {paginatedAircraft.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {search ? "No aircraft match your search" : "No aircraft found"}
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 pr-4 font-medium text-gray-900">Aircraft</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-900">Type</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-900">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAircraft.map((ac) => (
                <tr
                  key={ac.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/aircraft/view/${ac.id}`)}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {ac.aircraft_image_url && (
                          <AvatarImage src={ac.aircraft_image_url} alt={ac.registration} />
                        )}
                        <AvatarFallback>
                          <Plane className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{ac.registration}</div>
                        {ac.type && (
                          <div className="text-sm text-gray-500">{ac.type}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-600">
                    {ac.type || "-"}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={ac.status === "active" || ac.status === "available" ? "default" : "destructive"}
                      className="capitalize"
                    >
                      {statusMap[ac.status ?? "available"]?.label || ac.status || "Unknown"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-600">
                    {ac.total_hours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 