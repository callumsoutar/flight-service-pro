"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Aircraft } from "@/types/aircraft";
import { useRouter } from "next/navigation";
import Image from "next/image";

const statusMap: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-500" },
  in_use: { label: "In Use", color: "bg-blue-600" },
  maintenance: { label: "Maintenance", color: "bg-red-500" },
};

export default function AircraftListClient() {
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    return <div className="text-center text-muted-foreground py-10">Loading aircraft...</div>;
  }
  if (error) {
    return <div className="text-center text-red-600 py-10">{error}</div>;
  }
  if (aircraftList.length === 0) {
    return <div className="col-span-full text-center text-muted-foreground py-10">No aircraft found.</div>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        <input
          type="text"
          placeholder="Search aircraft..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl">
          <thead>
            <tr className="text-left text-zinc-600 text-sm border-b">
              <th className="py-3 px-4">Image</th>
              <th className="py-3 px-4">Registration</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Total Hours</th>
              <th className="py-3 px-4">Last Maintenance</th>
              <th className="py-3 px-4">Next Due</th>
            </tr>
          </thead>
          <tbody>
            {filteredAircraft.length ? (
              filteredAircraft.map((ac) => (
                <tr
                  key={ac.id}
                  className="hover:bg-indigo-50 transition cursor-pointer border-b"
                  tabIndex={0}
                  role="button"
                  onClick={() => router.push(`/dashboard/aircraft/view/${ac.id}`)}
                >
                  <td className="py-3 px-4">
                    <Image
                      src={ac.aircraft_image_url || "/aircraft-placeholder.jpg"}
                      alt={ac.registration}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded border"
                      style={{ background: '#f3f4f6' }}
                      priority={true}
                    />
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-base">{ac.registration}</td>
                  <td className="py-3 px-4">{ac.type}</td>
                  <td className="py-3 px-4">
                    <Badge className={`${statusMap[ac.status ?? "available"]?.color || "bg-gray-400"} text-white font-semibold px-3 py-1.5 text-xs`}>
                      {statusMap[ac.status ?? "available"]?.label || ac.status || "Unknown"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">{ac.total_hours}h</td>
                  <td className="py-3 px-4">{ac.last_maintenance_date ? ac.last_maintenance_date.split("T")[0] : "-"}</td>
                  <td className="py-3 px-4">{ac.next_maintenance_date ? ac.next_maintenance_date.split("T")[0] : "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="h-24 text-center text-muted-foreground">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 