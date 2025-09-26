"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Trash2, Edit, GripVertical, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Syllabus } from "@/types/syllabus";
import { Lesson, SyllabusStage, LessonInsert, LessonUpdate } from "@/types/lessons";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot
} from "@hello-pangea/dnd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Fetch functions
const fetchSyllabi = async (): Promise<Syllabus[]> => {
  const response = await fetch("/api/syllabus");
  if (!response.ok) throw new Error("Failed to fetch syllabi");
  const data = await response.json();
  return data.syllabi || [];
};

const fetchLessons = async (syllabusId: string): Promise<Lesson[]> => {
  const response = await fetch(`/api/lessons?syllabus_id=${syllabusId}`);
  if (!response.ok) throw new Error("Failed to fetch lessons");
  const data = await response.json();
  return data.lessons || [];
};


// Lesson creation/editing component
function LessonModal({
  isOpen,
  onClose,
  syllabusId,
  lesson = null
}: {
  isOpen: boolean;
  onClose: () => void;
  syllabusId: string;
  lesson?: Lesson | null;
}) {
  const [name, setName] = useState(lesson?.name || "");
  const [description, setDescription] = useState(lesson?.description || "");
  const [isRequired, setIsRequired] = useState(lesson?.is_required ?? true);
  const [syllabusStage, setSyllabusStage] = useState<SyllabusStage | "">(lesson?.syllabus_stage || "");
  const queryClient = useQueryClient();

  const isEditing = !!lesson;

  // Reset form when modal opens or lesson changes
  useEffect(() => {
    if (isOpen) {
      setName(lesson?.name || "");
      setDescription(lesson?.description || "");
      setIsRequired(lesson?.is_required ?? true);
      setSyllabusStage(lesson?.syllabus_stage || "");
    }
  }, [isOpen, lesson]);

  const mutation = useMutation({
    mutationFn: async (data: LessonInsert | (LessonUpdate & { id: string })) => {
      const url = isEditing ? "/api/lessons" : "/api/lessons";
      const method = isEditing ? "PATCH" : "POST";
      const body = isEditing ? { id: lesson.id, ...data } : data;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Failed to ${isEditing ? "update" : "create"} lesson`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", syllabusId] });
      toast.success(`Lesson ${isEditing ? "updated" : "created"} successfully`);
      onClose();
    },
    onError: () => {
      toast.error(`Failed to ${isEditing ? "update" : "create"} lesson`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      is_required: isRequired,
      syllabus_stage: syllabusStage || null,
      ...(!isEditing && { syllabus_id: syllabusId }),
    };

    mutation.mutate(data as LessonInsert | (LessonUpdate & { id: string }));
  };

  const syllabusStages: SyllabusStage[] = [
    'basic syllabus',
    'advances syllabus',
    'circuit training',
    'terrain and weather awareness',
    'instrument flying and flight test revision',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-semibold">
            {isEditing ? "Edit Lesson" : "Create New Lesson"}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {isEditing 
              ? "Update the lesson details below." 
              : "Add a new lesson to the selected syllabus. You can reorder lessons later using drag and drop."
            }
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Lesson Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">
              Lesson Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Circuit Training - Touch and Go"
              className="text-base py-3"
              required
            />
            <p className="text-xs text-gray-500">
              Give your lesson a clear, descriptive name that students will easily understand.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the lesson objectives, what will be covered, and expected outcomes..."
              rows={4}
              className="text-base resize-none"
            />
            <p className="text-xs text-gray-500">
              Provide a comprehensive description of what this lesson covers and its learning objectives.
            </p>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Syllabus Stage */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                Syllabus Stage
              </label>
              <Select value={syllabusStage || "none"} onValueChange={(value) => setSyllabusStage(value === "none" ? "" : value as SyllabusStage)}>
                <SelectTrigger className="text-base py-3">
                  <SelectValue placeholder="Select a training stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {syllabusStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Categorize this lesson within a specific training stage.
              </p>
            </div>

            {/* Required Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                Lesson Requirements
              </label>
              <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                  id="required"
                />
                <div className="flex-1">
                  <label htmlFor="required" className="text-sm font-medium cursor-pointer">
                    Required lesson
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">
                      Students must complete this lesson
                    </p>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Required lessons must be completed by students before progressing. 
                          Optional lessons provide additional training opportunities.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="px-6 py-2">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending 
                ? `${isEditing ? "Updating" : "Creating"}...` 
                : isEditing ? "Update Lesson" : "Create Lesson"
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LessonsTab() {
  const [selectedSyllabus, setSelectedSyllabus] = useState<string | null>(null);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const queryClient = useQueryClient();

  // Fetch syllabi
  const { data: syllabi = [], isLoading: syllabusLoading } = useQuery({
    queryKey: ["syllabi"],
    queryFn: fetchSyllabi,
  });

  // Fetch lessons for selected syllabus
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons", selectedSyllabus],
    queryFn: () => selectedSyllabus ? fetchLessons(selectedSyllabus) : Promise.resolve([]),
    enabled: !!selectedSyllabus,
  });

  // Delete mutations
  const deleteSyllabusMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/syllabus?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete syllabus");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabi"] });
      setSelectedSyllabus(null);
      toast.success("Syllabus deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete syllabus");
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/lessons?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete lesson");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", selectedSyllabus] });
      toast.success("Lesson deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete lesson");
    },
  });

  // Reorder lessons mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ syllabusId, lessonOrders }: { syllabusId: string; lessonOrders: { id: string; order: number }[] }) => {
      const response = await fetch("/api/lessons/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabus_id: syllabusId, lesson_orders: lessonOrders }),
      });
      if (!response.ok) throw new Error("Failed to reorder lessons");
      return response.json();
    },
    onMutate: async ({ syllabusId, lessonOrders }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["lessons", syllabusId] });

      // Snapshot the previous value
      const previousLessons = queryClient.getQueryData<Lesson[]>(["lessons", syllabusId]);

      // Optimistically update to the new value
      if (previousLessons) {
        const updatedLessons = lessonOrders.map(order => {
          const lesson = previousLessons.find(l => l.id === order.id);
          return lesson ? { ...lesson, order: order.order } : null;
        }).filter(Boolean) as Lesson[];
        
        // Sort by new order
        updatedLessons.sort((a, b) => a.order - b.order);
        
        queryClient.setQueryData(["lessons", syllabusId], updatedLessons);
      }

      // Return a context object with the snapshotted value
      return { previousLessons, syllabusId };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousLessons) {
        queryClient.setQueryData(["lessons", context.syllabusId], context.previousLessons);
      }
      toast.error("Failed to reorder lessons");
    },
    onSuccess: () => {
      toast.success("Lesson order updated");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync with server
      queryClient.invalidateQueries({ queryKey: ["lessons", selectedSyllabus] });
    },
  });

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !selectedSyllabus) return;

    const items = Array.from(lessons);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers
    const lessonOrders = items.map((lesson, index) => ({
      id: lesson.id,
      order: index + 1,
    }));

    reorderMutation.mutate({ syllabusId: selectedSyllabus, lessonOrders });
  };

  const selectedSyllabusData = syllabi.find(s => s.id === selectedSyllabus);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Syllabus & Lessons Management
          </CardTitle>
          <CardDescription>
            Create and manage training syllabi and their associated lessons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
            {/* Syllabi Panel */}
            <div className="space-y-4 pr-4 lg:border-r lg:border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Syllabi</h3>
                  <p className="text-sm text-gray-500">Select a syllabus to manage its lessons →</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {syllabusLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading syllabi...</div>
                ) : syllabi.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No syllabi found. Create your first syllabus to get started.
                  </div>
                ) : (
                  syllabi.map((syllabus) => {
                    const lessonCount = selectedSyllabus === syllabus.id ? lessons.length : 0;
                    return (
                      <div
                        key={syllabus.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedSyllabus === syllabus.id
                            ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                        }`}
                        onClick={() => setSelectedSyllabus(syllabus.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-gray-900">{syllabus.name}</h4>
                              {selectedSyllabus === syllabus.id && (
                                <div className="flex items-center text-blue-600">
                                  <span className="text-sm font-medium">{lessonCount} lessons</span>
                                  <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            {syllabus.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{syllabus.description}</p>
                            )}
                            {!syllabus.is_active && (
                              <div className="mt-2">
                                <Badge variant="destructive" className="text-xs">Inactive</Badge>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSyllabusMutation.mutate(syllabus.id);
                            }}
                            disabled={deleteSyllabusMutation.isPending}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Lessons Panel */}
            <div className="space-y-4 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedSyllabusData ? `${selectedSyllabusData.name} Lessons` : "Lessons"}
                  </h3>
                  {selectedSyllabusData && (
                    <p className="text-sm text-gray-500">Drag lessons to reorder • {lessons.length} total</p>
                  )}
                </div>
                {selectedSyllabus && (
                  <Button onClick={() => setLessonModalOpen(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lesson
                  </Button>
                )}
              </div>

              {!selectedSyllabus ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-300 rounded-lg">
                  <BookOpen className="w-12 h-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Syllabus</h4>
                  <p className="text-gray-500 max-w-sm">
                    Choose a syllabus from the left panel to view and manage its lessons
                  </p>
                </div>
              ) : lessonsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading lessons...</div>
              ) : lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-300 rounded-lg">
                  <Plus className="w-12 h-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Lessons Yet</h4>
                  <p className="text-gray-500 max-w-sm mb-4">
                    Add your first lesson to {selectedSyllabusData?.name}
                  </p>
                  <Button onClick={() => setLessonModalOpen(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Lesson
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="lessons">
                    {(provided: DroppableProvided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-1 max-h-[500px] overflow-y-auto pr-2"
                      >
                        {lessons.map((lesson, index) => (
                          <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`group p-2 border rounded-md transition-all duration-200 ${
                                  snapshot.isDragging 
                                    ? "shadow-lg bg-white border-blue-300 ring-2 ring-blue-200" 
                                    : "bg-white hover:border-gray-300 hover:shadow-sm"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1"
                                  >
                                    <GripVertical className="w-3 h-3" />
          </div>
                                  
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                      #{lesson.order}
                                    </span>
                                    
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm truncate text-gray-900">{lesson.name}</h4>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          {lesson.is_required && (
                                            <Badge variant="default" className="text-xs px-1.5 py-0">Required</Badge>
                                          )}
                                          {lesson.syllabus_stage && (
                                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                                              {lesson.syllabus_stage.split(' ')[0]}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
          </div>

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditingLesson(lesson);
                                        setLessonModalOpen(true);
                                      }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                      onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                      disabled={deleteLessonMutation.isPending}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedSyllabus && (
        <LessonModal
          isOpen={lessonModalOpen}
          onClose={() => {
            setLessonModalOpen(false);
            setEditingLesson(null);
          }}
          syllabusId={selectedSyllabus}
          lesson={editingLesson}
        />
      )}
    </div>
  );
}