"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UserPlus, GraduationCap, User, Plane } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Syllabus } from "@/types/syllabus";
import type { Instructor } from "@/types/instructors";
import type { StudentSyllabusEnrollment } from "@/types/student_syllabus_enrollment";
import type { AircraftType } from "@/types/aircraft_types";

interface EnrollMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  syllabi: Syllabus[];
  instructors: Instructor[];
  aircraftTypes: AircraftType[];
  existingEnrollments: StudentSyllabusEnrollment[];
  onEnrollmentCreated: (enrollment: StudentSyllabusEnrollment) => void;
}

export default function EnrollMemberModal({
  isOpen,
  onClose,
  memberId,
  syllabi,
  instructors,
  aircraftTypes,
  existingEnrollments,
  onEnrollmentCreated,
}: EnrollMemberModalProps) {
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>("");
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
  const [selectedAircraftTypeId, setSelectedAircraftTypeId] = useState<string>("");
  const [enrolledDate, setEnrolledDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out syllabi that the member is already enrolled in
  const availableSyllabi = syllabi.filter(
    syllabus => !existingEnrollments.some(enrollment => enrollment.syllabus_id === syllabus.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSyllabusId) {
      toast.error("Please select a syllabus");
      return;
    }

    setIsSubmitting(true);
    try {
      const enrollmentData = {
        user_id: memberId,
        syllabus_id: selectedSyllabusId,
        enrolled_at: enrolledDate.toISOString(),
        primary_instructor_id: selectedInstructorId || null,
        aircraft_type: selectedAircraftTypeId || null,
        status: "active",
      };

      const response = await fetch("/api/student_syllabus_enrollment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(enrollmentData),
      });

      if (!response.ok) {
        throw new Error("Failed to enroll member");
      }

      const result = await response.json();
      onEnrollmentCreated(result.data);
      toast.success("Member successfully enrolled in syllabus!");
      onClose();

      // Reset form
      setSelectedSyllabusId("");
      setSelectedInstructorId("");
      setSelectedAircraftTypeId("");
      setEnrolledDate(new Date());
    } catch (error) {
      console.error("Enrollment error:", error);
      toast.error("Failed to enroll member. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-0 w-full max-w-md shadow-xl border border-gray-100">
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
              <UserPlus className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-center mb-6">Enroll in Syllabus</h3>

          {availableSyllabi.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600">All available syllabi are already enrolled.</p>
            </div>
          ) : (
            <>
              {/* Syllabus Selection */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Syllabus *</label>
                <Select value={selectedSyllabusId} onValueChange={setSelectedSyllabusId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a syllabus" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSyllabi.map((syllabus) => (
                      <SelectItem key={syllabus.id} value={syllabus.id}>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-indigo-600" />
                          {syllabus.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Enrollment Date */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Enrollment Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !enrolledDate && "text-muted-foreground"
                      )}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {enrolledDate ? format(enrolledDate, "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={enrolledDate}
                      onSelect={date => setEnrolledDate(date ?? new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Primary Instructor */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  Primary Instructor <span className="text-xs">(optional)</span>
                </label>
                <Select value={selectedInstructorId} onValueChange={setSelectedInstructorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an instructor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          {instructor.first_name} {instructor.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aircraft Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  Aircraft Type <span className="text-xs">(optional)</span>
                </label>
                <Select value={selectedAircraftTypeId} onValueChange={setSelectedAircraftTypeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an aircraft type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {aircraftTypes.map((aircraftType) => (
                      <SelectItem key={aircraftType.id} value={aircraftType.id}>
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-green-600" />
                          {aircraftType.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-8 pb-6">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-w-[90px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedSyllabusId || availableSyllabi.length === 0}
            className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
          >
            {isSubmitting ? (
              "Enrolling..."
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Enroll
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}