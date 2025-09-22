"use client";
import React, { useState, useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { User } from "lucide-react";
import { PLACEHOLDER_VALUES } from "@/constants/placeholders";

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
  disabled?: boolean;
  unavailableInstructorIds?: Set<string>; // Set of instructor IDs that are unavailable due to conflicts
};

export default function InstructorSelect({ onSelect, value, disabled = false, unavailableInstructorIds }: InstructorSelectProps) {
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
        const transformedInstructors = (data.instructors || []).map((instructor: { id: string; user_id: string; first_name?: string; last_name?: string; users?: { email?: string } }) => ({
          id: instructor.id, // instructor ID from instructors table
          user_id: instructor.user_id, // user ID from users table
          first_name: instructor.first_name || "",
          last_name: instructor.last_name || "",
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
        value={selectedInstructor?.id || (value?.id || PLACEHOLDER_VALUES.INSTRUCTOR)} 
        onValueChange={disabled ? undefined : (instructor_id) => {
          // Handle "No instructor" selection
          if (instructor_id === PLACEHOLDER_VALUES.INSTRUCTOR) {
            onSelect(null);
          } else if (instructors.length > 0) {
            const instructor = instructors.find(i => i.id === instructor_id);
            onSelect(instructor || null);
          }
        }}
        disabled={disabled || loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select instructor" />
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading instructors...</div>
          ) : error ? (
            <div className="px-2 py-1.5 text-sm text-destructive">Error loading instructors</div>
          ) : (
            <>
              <SelectItem value={PLACEHOLDER_VALUES.INSTRUCTOR}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>No instructor</span>
                </div>
              </SelectItem>
              {instructors.length > 0 ? (
                instructors.map((instructor) => {
                  const isUnavailable = unavailableInstructorIds?.has(instructor.id) || false;
                  return (
                    <SelectItem key={instructor.id} value={instructor.id} disabled={isUnavailable}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span>
                          {instructor.first_name} {instructor.last_name}
                          {isUnavailable ? " (booked)" : ""}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No instructors found</div>
              )}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
} 