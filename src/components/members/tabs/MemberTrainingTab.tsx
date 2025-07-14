import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useOrgContext } from "@/components/OrgContextProvider";
import { format } from "date-fns";
import Progress from "@/components/ui/progress";
import type { Syllabus } from "@/types/syllabus";
import { ChevronDown, ChevronRight } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";

// Type for exam result with joined exam and syllabus
interface ExamResultWithExamSyllabus {
  id: string;
  exam_id: string;
  user_id: string;
  score?: number | null;
  result: 'PASS' | 'FAIL';
  date_completed?: string | null;
  kdrs_completed?: boolean | null;
  kdrs_signed_by?: string | null;
  organization_id: string;
  created_at: string;
  exam?: {
    id: string;
    name: string;
    syllabus_id: string;
    syllabus?: {
      id: string;
      name: string;
    };
  };
}

// Helper: result to badge color
function ResultBadge({ result }: { result?: string | null }) {
  const normalized = (result || "").toLowerCase();
  let color: "default" | "destructive" | "secondary" = "secondary";
  let label = result || "-";
  let customClass = "";
  switch (normalized) {
    case "pass":
      color = "default"; label = "PASS"; customClass = "bg-green-100 text-green-800 border-green-200"; break;
    case "fail":
      color = "destructive"; label = "FAIL"; break;
    default:
      color = "secondary";
  }
  return <Badge variant={color} className={customClass}>{label}</Badge>;
}

export default function MemberTrainingTab({ memberId }: { memberId: string }) {
  const [examResults, setExamResults] = useState<ExamResultWithExamSyllabus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const { currentOrgId } = useOrgContext();

  // Log Exam Result modal state
  const [syllabi, setSyllabi] = useState<{ id: string; name: string }[]>([]);
  const [selectedSyllabus, setSelectedSyllabus] = useState<string>("");
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [result, setResult] = useState<'PASS' | 'FAIL' | "">("");
  const [score, setScore] = useState<string>("");
  const [dateCompleted, setDateCompleted] = useState<Date | undefined>(undefined);
  const [kdrsCompleted, setKdrsCompleted] = useState<boolean | null>(null);
  const [kdrsSignedBy, setKdrsSignedBy] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syllabusMap, setSyllabusMap] = useState<Record<string, Syllabus>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Fetch syllabi on modal open and for progress
  useEffect(() => {
    if (!currentOrgId) return;
    fetch(`/api/syllabus?organization_id=${currentOrgId}`)
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data.data) ? data.data : [];
        setSyllabi(arr);
        const map: Record<string, Syllabus> = {};
        arr.forEach((s: Syllabus) => { map[s.id] = s; });
        setSyllabusMap(map);
      });
  }, [logModalOpen, currentOrgId]);

  // Fetch exams when syllabus changes
  useEffect(() => {
    if (!selectedSyllabus) return setExams([]);
    fetch(`/api/exam?syllabus_id=${selectedSyllabus}`)
      .then(res => res.json())
      .then(data => setExams(Array.isArray(data.data) ? data.data : []));
  }, [selectedSyllabus]);

  // Refresh table after logging
  const refreshResults = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/exam_results?user_id=${memberId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch");
        }
        return res.json();
      })
      .then((data) => {
        setExamResults(data.exam_results || []);
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
      })
      .finally(() => setLoading(false));
  };

  // Handle log exam result submit
  async function handleLogExamResult(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    if (!selectedExam || !result || !dateCompleted || !currentOrgId) {
      setModalError("Please fill all required fields.");
      setSubmitting(false);
      return;
    }
    const payload = {
      exam_id: selectedExam,
      user_id: memberId,
      organization_id: currentOrgId,
      result,
      score: score ? Number(score) : null,
      date_completed: dateCompleted.toISOString().split("T")[0],
      kdrs_completed: kdrsCompleted,
      kdrs_signed_by: kdrsSignedBy || null,
    };
    try {
      const res = await fetch("/api/exam_results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log exam result");
      }
      setLogModalOpen(false);
      // Reset modal state
      setSelectedSyllabus(""); setSelectedExam(""); setResult(""); setScore(""); setDateCompleted(undefined); setKdrsCompleted(null); setKdrsSignedBy("");
      refreshResults();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to log exam result";
      setModalError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/exam_results?user_id=${memberId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch");
        }
        return res.json();
      })
      .then((data) => {
        setExamResults(data.exam_results || []);
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  // Calculate progress per syllabus
  const examsBySyllabus: Record<string, ExamResultWithExamSyllabus[]> = {};
  examResults.forEach((exam) => {
    const syllabusId = exam.exam?.syllabus_id;
    if (!syllabusId) return;
    if (!examsBySyllabus[syllabusId]) examsBySyllabus[syllabusId] = [];
    examsBySyllabus[syllabusId].push(exam);
  });

  return (
    <Card className="w-full">
      <CardContent className="py-4 px-2 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Exam Results</h3>
          <Button onClick={() => setLogModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md">Log Exam Result</Button>
        </div>
        {/* Log Exam Result Modal */}
        <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
          <DialogContent className="w-[500px] max-w-[95vw] mx-auto p-6 max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-muted">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Log Exam Result</DialogTitle>
            </DialogHeader>
            <form className="flex flex-col gap-4 w-full" onSubmit={handleLogExamResult}>
              <div>
                <label className="block text-base font-medium mb-1">Syllabus</label>
                <Select value={selectedSyllabus} onValueChange={setSelectedSyllabus} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select syllabus" />
                  </SelectTrigger>
                  <SelectContent>
                    {syllabi.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-base font-medium mb-1">Exam</label>
                <Select value={selectedExam} onValueChange={setSelectedExam} required disabled={!selectedSyllabus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedSyllabus ? "Select exam" : "Select syllabus first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-base font-medium mb-1">Result</label>
                  <Select value={result} onValueChange={val => setResult(val as 'PASS' | 'FAIL')} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">PASS</SelectItem>
                      <SelectItem value="FAIL">FAIL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-base font-medium mb-1">Score (%)</label>
                  <Input type="number" min={0} max={100} value={score} onChange={e => setScore(e.target.value)} placeholder="e.g. 85" className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-base font-medium mb-1">Date Completed</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start text-left font-normal text-base hover:border-indigo-400 focus:border-indigo-500"
                    >
                      {dateCompleted ? format(dateCompleted, "dd MMM yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <Calendar
                      mode="single"
                      selected={dateCompleted}
                      onSelect={setDateCompleted}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-base font-medium mb-1">KDRs Completed</label>
                  <Select value={kdrsCompleted === null ? "" : kdrsCompleted ? "yes" : "no"} onValueChange={val => setKdrsCompleted(val === "yes" ? true : val === "no" ? false : null)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-base font-medium mb-1">KDRs Signed By</label>
                  <Input value={kdrsSignedBy} onChange={e => setKdrsSignedBy(e.target.value)} placeholder="Instructor name" className="w-full" />
                </div>
              </div>
              {modalError && <div className="text-red-600 text-sm mt-2">{modalError}</div>}
              <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                <DialogClose asChild>
                  <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400" disabled={submitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" disabled={submitting}>{submitting ? "Logging..." : "Log Exam Result"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <div>
          <div className="mb-2">
            {loading ? (
              <div className="text-muted-foreground py-8 text-center">Loading exam results...</div>
            ) : error ? (
              <div className="text-destructive py-8 text-center">{error}</div>
            ) : examResults.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">No exam results found for this member.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Syllabus</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Passed</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(examsBySyllabus).map(([syllabusId, exams]) => {
                      const syllabus = syllabusMap[syllabusId];
                      const total = syllabus?.number_of_exams || 0;
                      const passed = exams.filter(e => e.result === "PASS").length;
                      const percent = total > 0 ? Math.round((passed / total) * 100) : 0;
                      const isOpen = expanded[syllabusId] || false;
                      return (
                        <React.Fragment key={syllabusId}>
                          <TableRow key={syllabusId} className="bg-muted/30">
                            <TableCell style={{ width: 36 }}>
                              <button
                                type="button"
                                aria-label={isOpen ? "Collapse" : "Expand"}
                                onClick={() => setExpanded(e => ({ ...e, [syllabusId]: !isOpen }))}
                                className="focus:outline-none"
                              >
                                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </TableCell>
                            <TableCell>{syllabus?.name || syllabusId}</TableCell>
                            <TableCell style={{ minWidth: 120 }}>
                              <div className="flex items-center gap-2">
                                <Progress value={percent} />
                                <span className="text-xs text-muted-foreground ml-2">{percent}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{passed}</TableCell>
                            <TableCell>{total}</TableCell>
                          </TableRow>
                          {isOpen && exams.length > 0 && (
                            <TableRow key={syllabusId + "-exams"}>
                              <TableCell colSpan={5} className="p-0 bg-white">
                                <div className="overflow-x-auto">
                                  <Table className="w-full min-w-[600px] border-none">
                                    <TableHeader>
                                      <TableRow className="bg-muted/40">
                                        <TableHead className="py-3 px-4 font-semibold text-gray-700">Exam</TableHead>
                                        <TableHead className="py-3 px-4 font-semibold text-gray-700">Score</TableHead>
                                        <TableHead className="py-3 px-4 font-semibold text-gray-700">Result</TableHead>
                                        <TableHead className="py-3 px-4 font-semibold text-gray-700">Date Completed</TableHead>
                                        <TableHead className="py-3 px-4 font-semibold text-gray-700">KDRs</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {exams.map((row, i) => (
                                        <TableRow key={row.id || i} className={row.result === "FAIL" ? "bg-red-50" : ""}>
                                          <TableCell className="py-3 px-4">{row.exam?.name || "-"}</TableCell>
                                          <TableCell className="py-3 px-4">{row.score != null ? `${row.score}%` : "-"}</TableCell>
                                          <TableCell className="py-3 px-4"><ResultBadge result={row.result} /></TableCell>
                                          <TableCell className="py-3 px-4">{row.date_completed || "-"}</TableCell>
                                          <TableCell className="py-3 px-4">
                                            {row.kdrs_completed === true ? <Badge variant="default">KDRs ✓</Badge> : row.kdrs_completed === false ? <Badge variant="secondary">No</Badge> : "-"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
