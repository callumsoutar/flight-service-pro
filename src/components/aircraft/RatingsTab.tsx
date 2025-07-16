"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { X } from "lucide-react";

interface RatingsTabProps {
  instructorId: string;
  organizationId: string;
}

interface Endorsement {
  id: string;
  name: string;
  description?: string;
}

interface InstructorEndorsement {
  id: string;
  instructor_id: string;
  endorsement_id: string;
  granted_at: string;
}

export default function RatingsTab({ instructorId, organizationId }: RatingsTabProps) {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [instructorEndorsements, setInstructorEndorsements] = useState<InstructorEndorsement[]>([]);
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
        const [endorsementsRes, instructorEndorsementsRes] = await Promise.all([
          fetch(`/api/endorsements?organization_id=${organizationId}`),
          fetch(`/api/instructor_endorsements?instructor_id=${instructorId}`),
        ]);
        const endorsementsData = await endorsementsRes.json();
        const instructorEndorsementsData = await instructorEndorsementsRes.json();
        setEndorsements(Array.isArray(endorsementsData.endorsements) ? endorsementsData.endorsements : []);
        setInstructorEndorsements(Array.isArray(instructorEndorsementsData.instructor_endorsements) ? instructorEndorsementsData.instructor_endorsements : []);
      } catch {
        setError("Failed to load endorsements");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [instructorId, organizationId]);

  // Map assigned endorsements for fast lookup
  const assignedIds = new Set(instructorEndorsements.map((ie) => ie.endorsement_id));
  const assigned = endorsements.filter((e) => assignedIds.has(e.id));
  const available = endorsements.filter((e) => !assignedIds.has(e.id));

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      const res = await fetch("/api/instructor_endorsements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructor_id: instructorId, endorsement_id: selected }),
      });
      if (!res.ok) throw new Error("Failed to add endorsement");
      const data = await res.json();
      setInstructorEndorsements((prev) => [...prev, data.instructor_endorsement]);
      setSelected("");
    } catch {
      setError("Failed to add endorsement");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (endorsementId: string) => {
    const ie = instructorEndorsements.find((ie) => ie.endorsement_id === endorsementId);
    if (!ie) return;
    setRemoving(ie.id);
    try {
      const res = await fetch(`/api/instructor_endorsements?id=${ie.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove endorsement");
      setInstructorEndorsements((prev) => prev.filter((e) => e.id !== ie.id));
    } catch {
      setError("Failed to remove endorsement");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading endorsements...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-wrap gap-2">
        {assigned.length === 0 ? (
          <span className="text-muted-foreground">No endorsements assigned.</span>
        ) : (
          assigned.map((e) => (
            <Badge key={e.id} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 text-sm font-medium">
              {e.name}
              <button
                type="button"
                className="ml-1 rounded-full p-1 hover:bg-indigo-100 focus:outline-none transition"
                onClick={() => handleRemove(e.id)}
                aria-label={`Remove ${e.name}`}
                disabled={removing === e.id}
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
            <SelectValue placeholder="Add endorsement..." />
          </SelectTrigger>
          <SelectContent>
            {available.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={!selected || adding} size="sm">
          Add
        </Button>
      </div>
    </div>
  );
} 