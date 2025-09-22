"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InstructorSelect, { InstructorResult } from "@/components/invoices/InstructorSelect";
import { UserResult } from "@/components/invoices/MemberSelect";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Syllabus } from "@/types/syllabus";
import type { StudentSyllabusEnrollment } from "@/types/student_syllabus_enrollment";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, User } from "lucide-react";
import { toast } from "sonner";

const enrollSchema = z.object({
  syllabus_id: z.string().uuid(),
  primary_instructor_id: z.string().uuid(),
});

type EnrollForm = z.infer<typeof enrollSchema>;

interface InstructorWithUser {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  users?: {
    id: string;
    email: string;
  };
}

interface MemberSyllabusEnrollmentTabProps {
  memberId: string;
}

export default function MemberSyllabusEnrollmentTab({ memberId }: MemberSyllabusEnrollmentTabProps) {
  const [enrollments, setEnrollments] = useState<StudentSyllabusEnrollment[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [instructors, setInstructors] = useState<InstructorWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorResult | null>(null);
  const [selectedSyllabus, setSelectedSyllabus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [instructorMap, setInstructorMap] = useState<Record<string, UserResult>>({});

  const {
    reset,
  } = useForm<EnrollForm>({
    resolver: zodResolver(enrollSchema),
  });

  // Fetch syllabi, enrollments, and instructors
  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/syllabus`).then(res => res.json()).then(data => Array.isArray(data.syllabi) ? data.syllabi : []),
      fetch(`/api/student_syllabus_enrollment?user_id=${memberId}`).then(res => res.json()).then(data => Array.isArray(data.data) ? data.data : []),
      fetch(`/api/instructors`).then(res => res.json()).then(data => Array.isArray(data.instructors) ? data.instructors : []),
    ])
      .then(([syllabiData, enrollmentsData, instructorsData]) => {
        setSyllabi(syllabiData);
        setEnrollments(enrollmentsData);
        setInstructors(instructorsData);
        // Create instructor map using instructor IDs as keys
        const map: Record<string, UserResult> = {};
        instructorsData.forEach((instructor: InstructorWithUser) => {
          map[instructor.id] = {
            id: instructor.users?.id || instructor.user_id,
            first_name: instructor.first_name || "",
            last_name: instructor.last_name || "",
            email: instructor.users?.email || "",
          };
        });
        setInstructorMap(map);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load syllabus enrollments"))
      .finally(() => setLoading(false));
  }, [memberId]);

  // Enroll form submit
  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    
    // Validate that we have both syllabus and instructor selected
    if (!selectedSyllabus || !selectedInstructor?.id) {
      setError("Please select both a syllabus and an instructor");
      setSubmitting(false);
      return;
    }
    
    try {
      const res = await fetch("/api/student_syllabus_enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabus_id: selectedSyllabus,
          primary_instructor_id: selectedInstructor.id, // This is the instructor ID from instructors table
          user_id: memberId,
        }),
      });
      if (!res.ok) throw new Error("Failed to enroll student");
      setShowEnrollDialog(false);
      reset();
      setSelectedInstructor(null);
      setSelectedSyllabus("");
      // Refresh enrollments
      const enrollmentsRes = await fetch(`/api/student_syllabus_enrollment?user_id=${memberId}`);
      const enrollmentsData = await enrollmentsRes.json();
      setEnrollments(Array.isArray(enrollmentsData.data) ? enrollmentsData.data : []);
      toast.success("Student enrolled in syllabus successfully!");
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Failed to enroll student";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Syllabi not yet enrolled in
  const availableSyllabi = syllabi.filter(s => !enrollments.some(e => e.syllabus_id === s.id));

  // Handle instructor change for enrollment
  const handleInstructorChange = async (enrollmentId: string, instructor: InstructorWithUser) => {
    try {
      const res = await fetch("/api/student_syllabus_enrollment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: enrollmentId,
          primary_instructor_id: instructor.id,
        }),
      });
      
      if (!res.ok) throw new Error("Failed to update instructor");
      
      // Update local state
      setEnrollments(prev => prev.map(e => 
        e.id === enrollmentId 
          ? { ...e, primary_instructor_id: instructor.id }
          : e
      ));
      
      // Update instructor map
      setInstructorMap(prev => ({
        ...prev,
        [instructor.id]: {
          id: instructor.users?.id || instructor.user_id,
          first_name: instructor.first_name || "",
          last_name: instructor.last_name || "",
          email: instructor.users?.email || "",
        }
      }));
      
      toast.success("Primary instructor updated successfully!");
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Failed to update instructor";
      toast.error(errorMsg);
    }
  };



  return (
    <Card className="w-full rounded-md">
      <CardContent className="py-4 px-2 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Syllabus Enrollments</h3>
          <Button onClick={() => setShowEnrollDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md">Enroll in Syllabus</Button>
        </div>
        {/* Enroll Dialog */}
        <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
          <DialogContent className="w-full max-w-md mx-auto p-0 bg-white rounded-2xl shadow-xl border border-gray-100">
            <form className="w-full" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
              <div className="px-8 pt-8 pb-4">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold text-center">Enroll in Syllabus</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mb-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">Syllabus *</label>
                    <Select value={selectedSyllabus} onValueChange={setSelectedSyllabus}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select syllabus" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSyllabi.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedSyllabus && error && <div className="text-red-500 text-xs mt-1">Please select a syllabus</div>}
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">Primary Instructor *</label>
                    <InstructorSelect
                      value={selectedInstructor}
                      onSelect={instructor => {
                        setSelectedInstructor(instructor);
                      }}
                    />
                    {!selectedInstructor && error && <div className="text-red-500 text-xs mt-1">Please select an instructor</div>}
                  </div>
                </div>
                {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
              </div>
              <div className="flex justify-end gap-2 px-8 pb-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={submitting} className="min-w-[90px]">Cancel</Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="min-w-[110px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
                >
                  {submitting ? "Enrolling..." : "Enroll"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {/* Enrollment Table */}
        <div className="mt-4">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="mt-2">Loading syllabus enrollments...</p>
            </div>
          ) : error ? (
            <div className="text-destructive py-8 text-center">
              <Info className="w-10 h-10 text-red-500 mx-auto" />
              <p className="mt-2">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Retry
              </Button>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <Info className="w-10 h-10 text-gray-500 mx-auto" />
              <p className="mt-2">No syllabus enrollments found for this member.</p>
            </div>
          ) : (
            <Table className="w-full table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/5 min-w-[180px]">Syllabus</TableHead>
                  <TableHead className="w-1/5 min-w-[120px]">Enrolled At</TableHead>
                  <TableHead className="w-1/4 min-w-[180px]">Primary Instructor</TableHead>
                  <TableHead className="w-1/6 min-w-[80px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((row) => {
                  const syllabus = syllabi.find(s => s.id === row.syllabus_id);
                  const instructor = instructorMap[row.primary_instructor_id || ""];
                  return (
                    <TableRow key={row.id} className="align-top hover:bg-muted/40 transition">
                      <TableCell className="align-top font-semibold py-2 truncate max-w-xs">
                        <div className="flex items-center gap-1">
                          <span className="truncate">{syllabus ? syllabus.name : row.syllabus_id}</span>
                          {syllabus?.description && (
                            <span className="group relative">
                              <Info className="w-4 h-4 text-muted-foreground" />
                              <span className="absolute left-1/2 -translate-x-1/2 mt-2 z-10 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-pre max-w-xs">
                                {syllabus.description}
                              </span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground py-2 whitespace-nowrap">
                        {row.enrolled_at ? new Date(row.enrolled_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select 
                          value={row.primary_instructor_id || ""} 
                          onValueChange={(instructorId) => {
                            const instructor = instructors.find(i => i.id === instructorId);
                            if (instructor) {
                              handleInstructorChange(row.id, instructor);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full min-w-[200px]">
                            <SelectValue placeholder="Select instructor">
                              {instructor ? (
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-indigo-500" />
                                  <span>{instructor.first_name} {instructor.last_name}</span>
                                </div>
                              ) : (
                                "Select instructor"
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {instructors.map(i => (
                              <SelectItem key={i.id} value={i.id} className="flex items-center gap-2">
                                <User className="w-4 h-4 text-indigo-500" />
                                <span>{i.first_name} {i.last_name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-middle text-center">
                        <Badge 
                          variant={row.status === "active" ? "default" : "secondary"}
                          className={row.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 