"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useOrgContext } from "@/components/OrgContextProvider";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Syllabus } from "@/types/syllabus";
import type { StudentSyllabusEnrollment } from "@/types/student_syllabus_enrollment";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty } from "@/components/ui/command";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";

const enrollSchema = z.object({
  syllabus_id: z.string().uuid(),
  primary_instructor_id: z.string().uuid(),
});

type EnrollForm = z.infer<typeof enrollSchema>;

interface MemberSyllabusEnrollmentTabProps {
  memberId: string;
}

export default function MemberSyllabusEnrollmentTab({ memberId }: MemberSyllabusEnrollmentTabProps) {
  const { currentOrgId } = useOrgContext();
  const [enrollments, setEnrollments] = useState<StudentSyllabusEnrollment[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<UserResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [instructorMap, setInstructorMap] = useState<Record<string, UserResult>>({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EnrollForm>({
    resolver: zodResolver(enrollSchema),
  });

  // Fetch syllabi and enrollments
  useEffect(() => {
    if (!memberId || !currentOrgId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/syllabus?organization_id=${currentOrgId}`).then(res => res.json()).then(data => Array.isArray(data.data) ? data.data : []),
      fetch(`/api/student_syllabus_enrollment?user_id=${memberId}`).then(res => res.json()).then(data => Array.isArray(data.data) ? data.data : []),
    ])
      .then(([syllabiData, enrollmentsData]) => {
        setSyllabi(syllabiData);
        setEnrollments(enrollmentsData);
        // Fetch instructor details for each enrollment
        const instructorIds = enrollmentsData.map((e: StudentSyllabusEnrollment) => e.primary_instructor_id).filter(Boolean);
        if (instructorIds.length > 0) {
          fetch(`/api/users?ids=${instructorIds.join(",")}`)
            .then(res => res.json())
            .then(data => {
              const map: Record<string, UserResult> = {};
              (data.users || []).forEach((u: UserResult) => { map[u.id] = u; });
              setInstructorMap(map);
            });
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load syllabus enrollments"))
      .finally(() => setLoading(false));
  }, [memberId, currentOrgId]);

  // Enroll form submit
  const onSubmit = async (values: EnrollForm) => {
    if (!currentOrgId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student_syllabus_enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          user_id: memberId,
          organization_id: currentOrgId,
        }),
      });
      if (!res.ok) throw new Error("Failed to enroll student");
      setShowEnrollDialog(false);
      reset();
      setSelectedInstructor(null);
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

  // Helper for instructor chip
  function InstructorChip({ instructor }: { instructor: UserResult }) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-lg">
        <Avatar className="w-6 h-6">
          {/* No profile_image_url on UserResult, fallback to initials */}
          <AvatarFallback>{(instructor.first_name?.[0] || "").toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm">{instructor.first_name} {instructor.last_name}</span>
        <span className="text-xs text-gray-500">{instructor.email}</span>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="py-4 px-2 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Syllabus Enrollments</h3>
          <Button onClick={() => setShowEnrollDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md">Enroll in Syllabus</Button>
        </div>
        {/* Enroll Dialog */}
        <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
          <DialogContent className="w-[400px] max-w-[95vw] mx-auto p-6 max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-muted">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Enroll in Syllabus</DialogTitle>
            </DialogHeader>
            <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-base font-medium mb-1">Syllabus</label>
                <select {...register("syllabus_id")} className="w-full border rounded p-2">
                  <option value="">Select syllabus</option>
                  {availableSyllabi.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.syllabus_id && <div className="text-red-500 text-xs mt-1">{errors.syllabus_id.message}</div>}
              </div>
              <div>
                <label className="block text-base font-medium mb-1">Primary Instructor</label>
                <MemberSelect
                  value={selectedInstructor}
                  onSelect={instructor => {
                    setSelectedInstructor(instructor);
                    setValue("primary_instructor_id", instructor?.id || "");
                  }}
                />
                {errors.primary_instructor_id && <div className="text-red-500 text-xs mt-1">{errors.primary_instructor_id.message}</div>}
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" disabled={submitting}>
                  {submitting ? "Enrolling..." : "Enroll"}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
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
              <Button onClick={() => setShowEnrollDialog(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Enroll in Syllabus
              </Button>
            </div>
          ) : (
            <Table className="w-full table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/5 min-w-[180px]">Syllabus</TableHead>
                  <TableHead className="w-1/5 min-w-[120px]">Enrolled At</TableHead>
                  <TableHead className="w-1/4 min-w-[180px]">Primary Instructor</TableHead>
                  <TableHead className="w-1/6 min-w-[80px]">Status</TableHead>
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
                        <Popover>
                          <PopoverTrigger asChild>
                            {instructor ? (
                              <button className="focus:outline-none">
                                <InstructorChip instructor={instructor} />
                              </button>
                            ) : (
                              <Button size="sm" variant="outline" className="text-xs">Assign</Button>
                            )}
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-72">
                            <Command>
                              <CommandInput placeholder="Search instructor..." />
                              <CommandList>
                                <CommandEmpty>No instructors found</CommandEmpty>
                                {/* Fetch and list instructors here, on select call handleInstructorChange */}
                                {/* Example: */}
                                {/* instructors.map(i => (
                                  <CommandItem key={i.id} onSelect={() => handleInstructorChange(row.id, i)}>
                                    <UserIcon className="w-4 h-4 mr-2" />
                                    {i.first_name} {i.last_name} <span className="ml-2 text-xs text-gray-500">{i.email}</span>
                                    {row.primary_instructor_id === i.id && <Check className="ml-auto w-4 h-4 text-green-500" />}
                                  </CommandItem>
                                )) */}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="secondary">
                          <span className={row.status === "active" ? "text-green-600 font-semibold" : undefined}>{row.status}</span>
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