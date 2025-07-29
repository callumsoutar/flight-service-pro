"use client";
import React, { useState, useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { User } from "lucide-react";

export type InstructorResult = {
  id: string; // This is the instructor ID from the instructors table
  user_id: string; // This is the user ID from the users table
  first_name: string;
  last_name: string;
  email: string;
};

type InstructorSelectProps = {
  onSelect: (instructor: InstructorResult | null) => void;
  value: InstructorResult | null;
};

export default function InstructorSelect({ onSelect, value }: InstructorSelectProps) {
  const [instructors, setInstructors] = useState<InstructorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    fetch('/api/instructors')
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch instructors");
        const data = await res.json();
        // Transform the data to match InstructorResult format
        const transformedInstructors = (data.instructors || []).map((instructor: { id: string; user_id: string; users?: { first_name?: string; last_name?: string; email?: string } }) => ({
          id: instructor.id, // instructor ID from instructors table
          user_id: instructor.user_id, // user ID from users table
          first_name: instructor.users?.first_name || "",
          last_name: instructor.users?.last_name || "",
          email: instructor.users?.email || "",
        }));
        setInstructors(transformedInstructors);
      })
      .catch(() => {
        setError("Failed to load instructors");
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedInstructor = value ? instructors.find(i => i.id === value.id) : null;

  return (
    <div className="relative w-full">
      <Select 
        value={selectedInstructor?.id || ""} 
        onValueChange={(instructor_id) => {
          const instructor = instructors.find(i => i.id === instructor_id);
          onSelect(instructor || null);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select instructor" />
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading instructors...</div>
          ) : error ? (
            <div className="px-2 py-1.5 text-sm text-destructive">Error loading instructors</div>
          ) : instructors.length > 0 ? (
            instructors.map((instructor) => (
              <SelectItem key={instructor.id} value={instructor.id}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>{instructor.first_name} {instructor.last_name}</span>
                </div>
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No instructors found</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
} 