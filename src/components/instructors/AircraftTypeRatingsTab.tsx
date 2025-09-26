"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { X, Plane } from "lucide-react";
import type { AircraftType } from "@/types/aircraft_types";
import type { InstructorAircraftRating } from "@/types/instructor_aircraft_ratings";

interface AircraftTypeRatingsTabProps {
  instructorId: string;
}

export default function AircraftTypeRatingsTab({ instructorId }: AircraftTypeRatingsTabProps) {
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([]);
  const [instructorRatings, setInstructorRatings] = useState<InstructorAircraftRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [typesRes, ratingsRes] = await Promise.all([
          fetch(`/api/aircraft-types`),
          fetch(`/api/instructor-aircraft-ratings?instructor_id=${instructorId}`),
        ]);
        const typesData = await typesRes.json();
        const ratingsData = await ratingsRes.json();
        setAircraftTypes(Array.isArray(typesData.aircraft_types) ? typesData.aircraft_types : []);
        setInstructorRatings(Array.isArray(ratingsData.ratings) ? ratingsData.ratings : []);
      } catch {
        setError("Failed to load aircraft type ratings");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [instructorId]);

  const assignedTypeIds = new Set(instructorRatings.map((r) => r.aircraft_type_id));
  const assigned = aircraftTypes.filter((t) => assignedTypeIds.has(t.id));
  const available = aircraftTypes.filter((t) => !assignedTypeIds.has(t.id));

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      const res = await fetch("/api/instructor-aircraft-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructor_id: instructorId,
          aircraft_type_id: selected,
          certified_date: new Date().toISOString().split('T')[0]
        }),
      });
      if (!res.ok) throw new Error("Failed to add aircraft type rating");
      const data = await res.json();
      setInstructorRatings((prev) => [...prev, data.rating]);
      setSelected("");
    } catch {
      setError("Failed to add aircraft type rating");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (aircraftTypeId: string) => {
    const rating = instructorRatings.find((r) => r.aircraft_type_id === aircraftTypeId);
    if (!rating) return;
    setRemoving(rating.id);
    try {
      const res = await fetch(`/api/instructor-aircraft-ratings/${rating.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove aircraft type rating");
      setInstructorRatings((prev) => prev.filter((r) => r.id !== rating.id));
    } catch {
      setError("Failed to remove aircraft type rating");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading aircraft type ratings...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-wrap gap-2">
        {assigned.length === 0 ? (
          <span className="text-muted-foreground">No aircraft type ratings assigned.</span>
        ) : (
          assigned.map((type) => (
            <Badge key={type.id} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-sm font-medium">
              <Plane className="w-3 h-3" />
              {type.name}
              <button
                type="button"
                className="ml-1 rounded-full p-1 hover:bg-blue-100 focus:outline-none transition"
                onClick={() => handleRemove(type.id)}
                aria-label={`Remove ${type.name}`}
                disabled={removing === type.id}
              >
                <X className="w-4 h-4" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <div className="flex gap-2 items-center mt-1">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Add aircraft type rating..." />
          </SelectTrigger>
          <SelectContent>
            {available.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">All types assigned</div>
            ) : (
              available.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <Plane className="w-3 h-3" />
                    {type.name}
                    {type.category && <span className="text-xs text-muted-foreground">({type.category})</span>}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={!selected || adding} size="sm">
          Add
        </Button>
      </div>
    </div>
  );
}