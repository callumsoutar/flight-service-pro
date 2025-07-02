"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Aircraft } from "@/types/aircraft";
import { useRouter } from "next/navigation";

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
      } catch (err: any) {
        setError(err.message || "Unknown error");
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
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {aircraftList.map((ac) => (
        <div
          key={ac.id}
          className="rounded-xl border bg-white p-6 flex flex-col shadow-sm hover:shadow-lg transition cursor-pointer group"
          tabIndex={0}
          role="button"
          onClick={() => router.push(`/dashboard/aircraft/view/${ac.id}`)}
        >
          <div className="flex items-center gap-4 mb-4">
            <img
              src={ac.aircraft_image_url || "/aircraft-placeholder.jpg"}
              alt={ac.registration}
              className="w-16 h-16 object-cover rounded-md border"
              style={{ background: '#f3f4f6' }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-extrabold tracking-wide font-mono">{ac.registration}</span>
                <Badge className={`${statusMap[ac.status ?? "available"]?.color || "bg-gray-400"} text-white font-semibold px-3 py-1.5 text-xs`}>
                  {statusMap[ac.status ?? "available"]?.label || ac.status || "Unknown"}
                </Badge>
              </div>
              <div className="text-muted-foreground text-base font-medium">{ac.type}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm mb-2">
            <div className="flex justify-between"><span>Total Hours:</span> <span className="font-bold">{ac.total_hours}h</span></div>
            <div className="flex justify-between"><span>Last Maintenance:</span> <span className="font-bold">{ac.last_maintenance_date ? ac.last_maintenance_date.split("T")[0] : "-"}</span></div>
            <div className="flex justify-between"><span>Next Due:</span> <span className="font-bold">{ac.next_maintenance_date ? ac.next_maintenance_date.split("T")[0] : "-"}</span></div>
          </div>
          <div className="mt-4 pt-2 border-t text-xs text-muted-foreground flex items-center gap-1 group-hover:text-indigo-600">
            Click to view maintenance details <span aria-hidden>→</span>
          </div>
        </div>
      ))}
    </section>
  );
} 