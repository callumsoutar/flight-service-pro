"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, AlertCircle, BookOpen } from "lucide-react";
import { Exam } from "@/types/exam";

interface ExamFormData {
  name: string;
  description: string;
  syllabus_id: string;
  passing_score: number;
  is_active: boolean;
}

interface Syllabus {
  id: string;
  name: string;
}

export default function ExamsConfig() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState<ExamFormData>({
    name: "",
    description: "",
    syllabus_id: "none",
    passing_score: 70,
    is_active: true,
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/exams");
      if (!response.ok) {
        throw new Error("Failed to fetch exams");
      }
      const data = await response.json();
      setExams(data.exams || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchSyllabi = async () => {
    try {
      const response = await fetch("/api/syllabus");
      if (!response.ok) {
        throw new Error("Failed to fetch syllabi");
      }
      const data = await response.json();
      setSyllabi(data.syllabi || []);
    } catch (err) {
      console.error("Failed to fetch syllabi:", err);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchSyllabi();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      syllabus_id: "none",
      passing_score: 70,
      is_active: true,
    });
  };

  const handleAdd = async () => {
    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          syllabus_id: formData.syllabus_id === "none" ? "" : formData.syllabus_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create exam");
      }

      await fetchExams();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleEdit = async () => {
    if (!editingExam) return;

    try {
      const response = await fetch("/api/exams", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          id: editingExam.id,
          syllabus_id: formData.syllabus_id === "none" ? "" : formData.syllabus_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update exam");
      }

      await fetchExams();
      setIsEditDialogOpen(false);
      setEditingExam(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to void this exam? This will hide it from the list but preserve the data.")) {
      return;
    }

    try {
      const response = await fetch(`/api/exams?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete exam");
      }

      await fetchExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const openEditDialog = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      description: exam.description || "",
      syllabus_id: exam.syllabus_id || "none",
      passing_score: exam.passing_score,
      is_active: exam.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const getSyllabusName = (syllabusId: string) => {
    const syllabus = syllabi.find(s => s.id === syllabusId);
    return syllabus ? syllabus.name : "No Syllabus";
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (syllabusId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [syllabusId]: !prev[syllabusId]
    }));
  };

  const groupedExams = exams.reduce((groups, exam) => {
    const key = exam.syllabus_id || "no-syllabus";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(exam);
    return groups;
  }, {} as Record<string, Exam[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading exams...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Exams</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-full rounded-xl p-6">
            <DialogHeader>
              <DialogTitle>Add New Exam</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Written Exam, Checkride, Theory Test"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter a description for this exam"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="syllabus">Syllabus (Optional)</Label>
                <Select value={formData.syllabus_id} onValueChange={(value) => setFormData({ ...formData, syllabus_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a syllabus or leave empty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Syllabus</SelectItem>
                    {syllabi.map((syllabus) => (
                      <SelectItem key={syllabus.id} value={syllabus.id}>
                        {syllabus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="passing_score">Passing Score (%)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!formData.name.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(groupedExams).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No exams configured yet. Click &quot;Add Exam&quot; to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExams).map(([syllabusId, syllabusExams]) => {
            const isExpanded = expandedGroups[syllabusId] || false;
            return (
              <div key={syllabusId} className="border rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleGroup(syllabusId)}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-600" />
                    <h4 className="text-md font-medium text-gray-900">
                      {syllabusId === "no-syllabus" ? "Independent Exams" : getSyllabusName(syllabusId)}
                    </h4>
                    <span className="text-sm text-gray-500">({syllabusExams.length} exam{syllabusExams.length !== 1 ? 's' : ''})</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </Button>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Passing Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syllabusExams.map((exam) => (
                          <TableRow key={exam.id}>
                            <TableCell className="font-medium">{exam.name}</TableCell>
                            <TableCell>{exam.description || "-"}</TableCell>
                            <TableCell>{exam.passing_score}%</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  exam.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {exam.is_active ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(exam);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(exam.id);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                  title="Void exam"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md w-full rounded-xl p-6">
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Written Exam, Checkride, Theory Test"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter a description for this exam"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-syllabus">Syllabus (Optional)</Label>
              <Select value={formData.syllabus_id} onValueChange={(value) => setFormData({ ...formData, syllabus_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a syllabus or leave empty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Syllabus</SelectItem>
                  {syllabi.map((syllabus) => (
                    <SelectItem key={syllabus.id} value={syllabus.id}>
                      {syllabus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>
            <div>
              <Label htmlFor="edit-passing_score">Passing Score (%)</Label>
              <Input
                id="edit-passing_score"
                type="number"
                min="0"
                max="100"
                value={formData.passing_score}
                onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-is_active">Active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingExam(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!formData.name.trim()}>
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}