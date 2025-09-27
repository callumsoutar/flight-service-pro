"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Progress from "@/components/ui/progress";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import type { Syllabus } from "@/types/syllabus";

// Type for exam result with joined exam and syllabus
interface ExamResultWithExamSyllabus {
  id: string;
  exam_id: string;
  user_id: string;
  score?: number | null;
  result: 'PASS' | 'FAIL';
  exam_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
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

interface ExamHistoryTabProps {
  memberId: string;
  syllabi: Syllabus[];
  examResults: ExamResultWithExamSyllabus[];
  setExamResults: (results: ExamResultWithExamSyllabus[]) => void;
  examExpanded: Record<string, boolean>;
  setExamExpanded: (expanded: Record<string, boolean>) => void;
}

export default function ExamHistoryTab({
  memberId,
  syllabi,
  examResults,
  setExamResults,
  examExpanded,
  setExamExpanded
}: ExamHistoryTabProps) {
  // Log Exam Result modal state
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [exams, setExams] = useState<{ id: string; name: string; syllabus_id?: string }[]>([]);
  const [examForm, setExamForm] = useState({
    syllabus_id: "",
    exam_id: "",
    result: "",
    score: "",
    exam_date: ""
  });
  const [examFormError, setExamFormError] = useState<string>("");
  const [examFormSubmitting, setExamFormSubmitting] = useState(false);

  // Modal management (syllabi already available from main state)
  useEffect(() => {
    // No additional setup needed - syllabi are already loaded
  }, [logModalOpen, syllabi]);

  // Fetch exams when syllabus changes (or fetch all exams if no syllabus), filtering out already passed exams
  useEffect(() => {
    const fetchExams = () => {
      const url = examForm.syllabus_id && examForm.syllabus_id !== "none"
        ? `/api/exam?syllabus_id=${examForm.syllabus_id}`
        : `/api/exam`; // Fetch all exams if no syllabus selected or "none" is selected

      fetch(url)
        .then(res => res.json())
        .then(data => {
          const allExams = Array.isArray(data.data) ? data.data : [];

          // Get exam IDs that user has already passed
          const passedExamIds = new Set(
            examResults
              .filter(result => result.result === 'PASS')
              .map(result => result.exam_id)
          );

          // Filter out exams that have already been passed
          const availableExams = allExams.filter((exam: { id: string; name: string }) => !passedExamIds.has(exam.id));

          setExams(availableExams);
        });
    };

    // Always fetch exams when modal opens, regardless of syllabus selection
    if (logModalOpen) {
      fetchExams();
    }
  }, [examForm.syllabus_id, examResults, logModalOpen]);

  // Refresh exam results after logging
  const refreshExamResults = () => {
    fetch(`/api/exam_results?user_id=${memberId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch exam results");
        return res.json();
      })
      .then((data) => {
        setExamResults(data.exam_results || []);
      })
      .catch((err) => {
        console.error("Failed to refresh exam results:", err);
      });
  };

  // Handle log exam result submit
  async function handleLogExamResult(e: React.FormEvent) {
    e.preventDefault();
    setExamFormSubmitting(true);
    setExamFormError("");

    if (!examForm.exam_id || !examForm.result || !examForm.exam_date) {
      setExamFormError("Please fill all required fields (Exam, Result, and Date).");
      setExamFormSubmitting(false);
      return;
    }

    const payload = {
      exam_id: examForm.exam_id,
      user_id: memberId,
      result: examForm.result,
      score: examForm.score ? Number(examForm.score) : null,
      exam_date: examForm.exam_date,
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
      setExamForm({
        syllabus_id: "",
        exam_id: "",
        result: "",
        score: "",
        exam_date: ""
      });
      refreshExamResults();
      toast.success("Exam result logged successfully!");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to log exam result";
      setExamFormError(errorMsg);
    } finally {
      setExamFormSubmitting(false);
    }
  }

  // Helper: result to badge color for exam results
  function ExamResultBadge({ result }: { result?: string | null }) {
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

  // Group exam results by syllabus
  const examsBySyllabus = examResults.reduce((acc, result) => {
    const syllabusId = result.exam?.syllabus_id || "other";
    if (!acc[syllabusId]) acc[syllabusId] = [];
    acc[syllabusId].push(result);
    return acc;
  }, {} as Record<string, ExamResultWithExamSyllabus[]>);

  return (
    <Card className="rounded-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Theory Exams
          </CardTitle>
          <Button onClick={() => setLogModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md">
            Log Exam Result
          </Button>
        </div>
      </CardHeader>

      {/* Log Exam Result Modal */}
      <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
        <DialogContent className="w-full max-w-md mx-auto p-0 bg-white rounded-2xl shadow-xl border border-gray-100">
          <form className="w-full" onSubmit={handleLogExamResult}>
            <div className="px-8 pt-8 pb-4">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold text-center">Log Exam Result</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mb-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-1">Syllabus *</label>
                  <Select value={examForm.syllabus_id} onValueChange={(value) => setExamForm({...examForm, syllabus_id: value, exam_id: ''})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select syllabus" />
                    </SelectTrigger>
                    <SelectContent>
                      {syllabi.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {examFormError.includes('syllabus') && <div className="text-red-500 text-xs mt-1">Please select a syllabus</div>}
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-1">Exam *</label>
                  <Select
                    value={examForm.exam_id}
                    onValueChange={(value) => setExamForm({...examForm, exam_id: value})}
                    disabled={!examForm.syllabus_id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.filter(e => e.syllabus_id === examForm.syllabus_id).map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {examFormError.includes('exam') && <div className="text-red-500 text-xs mt-1">Please select an exam</div>}
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-1">Result *</label>
                  <Select value={examForm.result} onValueChange={(value) => setExamForm({...examForm, result: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">Pass</SelectItem>
                      <SelectItem value="FAIL">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                  {examFormError.includes('result') && <div className="text-red-500 text-xs mt-1">Please select a result</div>}
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-1">Score (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={examForm.score}
                    onChange={(e) => setExamForm({...examForm, score: e.target.value})}
                    placeholder="e.g. 85"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-1">Date Completed *</label>
                  <Input
                    type="date"
                    value={examForm.exam_date}
                    onChange={(e) => setExamForm({...examForm, exam_date: e.target.value})}
                  />
                  {examFormError.includes('date') && <div className="text-red-500 text-xs mt-1">Please select a date</div>}
                </div>
              </div>
              {examFormError && <div className="text-red-600 text-sm mb-2 text-center">{examFormError}</div>}
            </div>
            <div className="flex justify-end gap-2 px-8 pb-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={examFormSubmitting} className="min-w-[90px]">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={examFormSubmitting}
                className="min-w-[110px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
              >
                {examFormSubmitting ? "Logging..." : "Log Result"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CardContent>
        {examResults.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900 mb-2">No exam results found</p>
            <p className="text-gray-600">Theory exam results will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-left py-3 pr-4 font-medium text-gray-900 w-12"></TableHead>
                  <TableHead className="text-left py-3 pr-4 font-medium text-gray-900">Syllabus</TableHead>
                  <TableHead className="text-left py-3 pr-4 font-medium text-gray-900">Progress</TableHead>
                  <TableHead className="text-center py-3 pr-4 font-medium text-gray-900">Passed</TableHead>
                  <TableHead className="text-center py-3 font-medium text-gray-900">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(examsBySyllabus).map(([syllabusId, exams]) => {
                  const isOther = syllabusId === "other";
                  const syllabus = isOther ? null : syllabi.find(s => s.id === syllabusId);
                  const displayName = isOther ? "Other" : (syllabus?.name || syllabusId);

                  const total = isOther ? exams.length : (syllabus?.number_of_exams || 0);
                  const passed = exams.filter(e => e.result === "PASS").length;
                  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;
                  const isOpen = examExpanded[syllabusId] === true;
                  return (
                    <React.Fragment key={syllabusId}>
                      <TableRow className="bg-gray-50/80 border-b border-gray-200 hover:bg-gray-100/80">
                        <TableCell className="py-4 pr-4">
                          <button
                            type="button"
                            aria-label={isOpen ? "Collapse" : "Expand"}
                            onClick={() => setExamExpanded(e => ({ ...e, [syllabusId]: !isOpen }))}
                            className="p-1 hover:bg-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                          >
                            {isOpen ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                          </button>
                        </TableCell>
                        <TableCell className="py-4 pr-4 text-base font-semibold text-gray-900">{displayName}</TableCell>
                        <TableCell className="py-4 pr-4" style={{ minWidth: 200 }}>
                          {isOther ? (
                            <span className="text-sm text-gray-600 font-medium">Individual Exams</span>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Progress value={percent} className="flex-1 h-2" />
                              <span className="text-sm font-semibold text-gray-800 min-w-[40px]">{percent}%</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-4 pr-4 text-center text-base font-semibold text-gray-900">{passed}</TableCell>
                        <TableCell className="py-4 text-center text-base font-semibold text-gray-900">{isOther ? exams.length : total}</TableCell>
                      </TableRow>
                      {isOpen && exams.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="p-0 bg-gray-50/30">
                            <div className="px-6 py-4">
                              <div className="overflow-x-auto">
                                <Table className="w-full border-none">
                                  <TableHeader>
                                    <TableRow className="border-b border-gray-200">
                                      <TableHead className="py-2 text-sm font-semibold text-gray-700">Exam</TableHead>
                                      <TableHead className="py-2 text-sm font-semibold text-gray-700 text-center">Score</TableHead>
                                      <TableHead className="py-2 text-sm font-semibold text-gray-700 text-center">Result</TableHead>
                                      <TableHead className="py-2 text-sm font-semibold text-gray-700 text-center">Date Completed</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {exams.map((row, i) => (
                                      <TableRow
                                        key={row.id || i}
                                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                                          row.result === "FAIL" ? "bg-red-50" : ""
                                        }`}
                                      >
                                        <TableCell className="py-3 pr-4 text-sm font-medium text-gray-900">{row.exam?.name || "-"}</TableCell>
                                        <TableCell className="py-3 pr-4 text-sm text-center text-gray-700">{row.score != null ? `${row.score}%` : "-"}</TableCell>
                                        <TableCell className="py-3 pr-4 text-center"><ExamResultBadge result={row.result} /></TableCell>
                                        <TableCell className="py-3 text-sm text-center text-gray-700">
                                          {row.exam_date ? format(new Date(row.exam_date), 'dd MMM yyyy') : "-"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
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
      </CardContent>
    </Card>
  );
}