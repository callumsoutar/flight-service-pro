import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { 
  Calendar as CalendarIcon,
  Edit,
  User,
  Eye,
  FileText,
  AlertCircle,
  Flag,
  Tag,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Task, TaskStatus, TaskPriority, TaskCategory } from "@/types/tasks";

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  onTaskUpdate?: (updatedTask: Task) => void;
}

const TASK_STATUSES: TaskStatus[] = ["pending", "inProgress", "completed", "overdue"];
const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const TASK_CATEGORIES: TaskCategory[] = ["Safety", "Training", "Maintenance", "Administrative", "Other"];

// const getStatusColor = (status: TaskStatus): string => {
//   switch (status) {
//     case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
//     case 'inProgress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
//     case 'completed': return 'bg-green-100 text-green-800 border-green-200';
//     case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
//     default: return 'bg-gray-100 text-gray-800 border-gray-200';
//   }
// };

// const getPriorityColor = (priority: TaskPriority): string => {
//   switch (priority) {
//     case 'low': return 'bg-green-100 text-green-800 border-green-200';
//     case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
//     case 'high': return 'bg-red-100 text-red-800 border-red-200';
//     default: return 'bg-gray-100 text-gray-800 border-gray-200';
//   }
// };

const getStatusDisplayText = (status: TaskStatus): string => {
  switch (status) {
    case "pending": return "Pending";
    case "inProgress": return "In Progress";
    case "completed": return "Completed";
    case "overdue": return "Overdue";
    default: return status;
  }
};

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ 
  open, 
  onClose, 
  taskId, 
  onTaskUpdate 
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  // Individual field edit states (only for title)
  const [editingTitle, setEditingTitle] = useState(false);

  // Temporary edit values
  const [tempTitle, setTempTitle] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [tempStatus, setTempStatus] = useState<TaskStatus>("pending");
  const [tempPriority, setTempPriority] = useState<TaskPriority>("medium");
  const [tempCategory, setTempCategory] = useState<TaskCategory>("Other");
  const [tempDueDate, setTempDueDate] = useState<Date | undefined>(undefined);
  const [tempAssignedToInstructorId, setTempAssignedToInstructorId] = useState("");

  // Global save state
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Instructor data
  const [instructors, setInstructors] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    status: string;
  }[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      const data = await response.json();
      setTask(data.task);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
      fetchInstructors();
    }
  }, [open, taskId, fetchTask]);

  useEffect(() => {
    if (task) {
      setTempTitle(task.title);
      setTempDescription(task.description || "");
      setTempStatus(task.status);
      setTempPriority(task.priority);
      setTempCategory(task.category);
      setTempDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setTempAssignedToInstructorId(task.assigned_to_instructor?.id || "");
      setIsDirty(false);
    }
  }, [task]);

  // Check if form has changes
  useEffect(() => {
    if (!task) return;
    
    const originalDueDate = task.due_date ? new Date(task.due_date) : undefined;
    const hasChanges = (
      tempTitle !== task.title ||
      tempDescription !== (task.description || "") ||
      tempStatus !== task.status ||
      tempPriority !== task.priority ||
      tempCategory !== task.category ||
      tempDueDate?.getTime() !== originalDueDate?.getTime() ||
      tempAssignedToInstructorId !== (task.assigned_to_instructor?.id || "")
    );
    
    setIsDirty(hasChanges);
  }, [task, tempTitle, tempDescription, tempStatus, tempPriority, tempCategory, tempDueDate, tempAssignedToInstructorId]);

  const fetchInstructors = async () => {
    setLoadingInstructors(true);
    try {
      const response = await fetch('/api/instructors');
      if (response.ok) {
        const data = await response.json();
        setInstructors(data.instructors || []);
      } else {
        console.error('Failed to fetch instructors');
        setInstructors([]);
      }
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setInstructors([]);
    } finally {
      setLoadingInstructors(false);
    }
  };

  const saveChanges = async () => {
    if (!task || !isDirty) return;
    
    setSaving(true);
    try {
      const updates: Partial<Task> = {};
      
      if (tempTitle !== task.title) updates.title = tempTitle;
      if (tempDescription !== (task.description || "")) updates.description = tempDescription;
      if (tempStatus !== task.status) updates.status = tempStatus;
      if (tempPriority !== task.priority) updates.priority = tempPriority;
      if (tempCategory !== task.category) updates.category = tempCategory;
      if (tempDueDate?.getTime() !== (task.due_date ? new Date(task.due_date).getTime() : undefined)) {
        updates.due_date = tempDueDate ? tempDueDate.toISOString().split('T')[0] : null;
      }
      if (tempAssignedToInstructorId !== (task.assigned_to_instructor?.id || "")) {
        updates.assigned_to_instructor_id = tempAssignedToInstructorId || null;
      }
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update task');
      
      const data = await response.json();
      setTask(data.task);
      onTaskUpdate?.(data.task);
      setIsDirty(false);
      
      
      toast.success("Task updated successfully!");
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    if (!task) return;
    
    // Reset all temp values to original task values
    setTempTitle(task.title);
    setTempDescription(task.description || "");
    setTempStatus(task.status);
    setTempPriority(task.priority);
    setTempCategory(task.category);
    setTempDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setTempAssignedToInstructorId(task.assigned_to_instructor?.id || "");
    
    // Reset title edit state
    setEditingTitle(false);
    
    setIsDirty(false);
  };

  // const formatDate = (date: Date | undefined) => {
  //   if (!date) return "No due date";
  //   const today = new Date();
  //
  //   if (date.toDateString() === today.toDateString()) return "Today";
  //
  //   const tomorrow = new Date(today);
  //   tomorrow.setDate(tomorrow.getDate() + 1);
  //   if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  //
  //   return format(date, 'MMM d, yyyy');
  // };

  // const getAssignedToDisplay = () => {
  //   if (tempAssignedToInstructorId) {
  //     const instructor = instructors.find(inst => inst.id === tempAssignedToInstructorId);
  //     if (instructor) {
  //       return `${instructor.first_name} ${instructor.last_name}`;
  //     }
  //   }
  //   return "Unassigned";
  // };

  const handleClose = () => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to close without saving?');
      if (!confirmLeave) return;
    }
    
    
    // Reset to original values if closing without saving
    if (isDirty && task) {
      cancelChanges();
    }
    
    // Reset title edit state
    setEditingTitle(false);
    
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[800px] max-w-[98vw] mx-auto p-0 bg-white rounded-2xl shadow-xl border-0 max-h-[90vh] flex flex-col">
          <VisuallyHidden>
            <DialogTitle>Loading Task Details</DialogTitle>
          </VisuallyHidden>
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[800px] max-w-[98vw] mx-auto p-0 bg-white rounded-2xl shadow-xl border-0 max-h-[90vh] flex flex-col">
          <VisuallyHidden>
            <DialogTitle>Task Not Found</DialogTitle>
          </VisuallyHidden>
          <div className="text-center py-8">
            <p className="text-gray-500">Task not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[900px] max-w-[98vw] mx-auto p-0 bg-white rounded-2xl shadow-xl border-0 max-h-[90vh] flex flex-col">
        <VisuallyHidden>
          <DialogTitle>Task Details</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-gray-200 px-8 pt-8 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
            <p className="text-sm text-gray-500 mt-1">Click any field to edit</p>
          </div>
        </div>

        <div className="space-y-4 py-4 px-8 overflow-y-auto flex-1">
          {/* Title - No Label */}
          <div className="pb-2">
            {editingTitle ? (
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="w-full text-lg font-semibold border-none shadow-none bg-transparent p-0 focus:ring-0 focus:border-none"
                autoFocus
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingTitle(false);
                  } else if (e.key === 'Escape') {
                    setTempTitle(task?.title || '');
                    setEditingTitle(false);
                  }
                }}
              />
            ) : (
              <div 
                className="group p-4 rounded-lg bg-gray-50 cursor-pointer border border-gray-200 hover:border-gray-300 transition-all"
                onClick={() => setEditingTitle(true)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                  <Edit className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="pb-2">
            <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={tempDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add description..."
            />
          </div>

          {/* Status, Priority, Category Grid */}
          <div className="grid grid-cols-3 gap-6 pb-2">
            {/* Status */}
            <div className="pb-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Status
              </label>
              <Select 
                value={tempStatus} 
                onValueChange={(val) => {
                  setTempStatus(val as TaskStatus);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusDisplayText(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="pb-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Priority
              </label>
              <Select 
                value={tempPriority} 
                onValueChange={(val) => {
                  setTempPriority(val as TaskPriority);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          p === 'low' ? 'bg-green-500' : 
                          p === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="pb-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Category
              </label>
              <Select 
                value={tempCategory} 
                onValueChange={(val) => {
                  setTempCategory(val as TaskCategory);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date and Assigned To */}
          <div className="grid grid-cols-2 gap-6 pb-2">
            {/* Due Date */}
            <div className="pb-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Due Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempDueDate ? format(tempDueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={tempDueDate}
                    onSelect={setTempDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Assigned To */}
            <div className="pb-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-2">
                <User className="w-4 h-4" />
                Assigned To Instructor
              </label>
              <Select 
                value={tempAssignedToInstructorId} 
                onValueChange={setTempAssignedToInstructorId}
                disabled={loadingInstructors}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingInstructors ? "Loading instructors..." : "Select an instructor..."} />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {instructor.first_name} {instructor.last_name}
                        {instructor.status !== 'active' && (
                          <Badge variant="secondary" className="text-xs">
                            {instructor.status}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          
          {/* Save/Cancel Actions */}
          {isDirty && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-8 -mb-6 mt-8">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={cancelChanges}
                  disabled={saving}
                  className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel Changes
                </Button>
                <Button
                  onClick={saveChanges}
                  disabled={saving || !isDirty}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};