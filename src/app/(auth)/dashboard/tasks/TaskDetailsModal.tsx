import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
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
  User,
  Eye,
  Clock,
  CheckCircle,
  PlayCircle
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

const TASK_STATUSES: TaskStatus[] = ["assigned", "inProgress", "completed", "overdue"];
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
    case "assigned": return "Assigned";
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

  // Temporary edit values
  const [tempTitle, setTempTitle] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [tempStatus, setTempStatus] = useState<TaskStatus>("assigned");
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

    onClose();
  };

  const handleQuickStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;

    setSaving(true);
    try {
      const updates: Partial<Task> = {
        status: newStatus,
      };

      // If marking as completed, add completed_date
      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString();
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

      const statusLabel = getStatusDisplayText(newStatus);
      toast.success(`Task marked as ${statusLabel}!`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setSaving(false);
    }
  };

  const formatDateInfo = (dateString: string | null | undefined) => {
    if (!dateString) return { text: "No due date", color: "text-gray-500", bgColor: "bg-gray-100", borderColor: "border-gray-200", isOverdue: false };

    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        text: daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`,
        color: "text-red-700",
        bgColor: "bg-red-100",
        borderColor: "border-red-200",
        isOverdue: true
      };
    } else if (diffDays === 0) {
      return {
        text: "Due today",
        color: "text-orange-700",
        bgColor: "bg-orange-100",
        borderColor: "border-orange-200",
        isOverdue: false
      };
    } else if (diffDays === 1) {
      return {
        text: "Due tomorrow",
        color: "text-yellow-700",
        bgColor: "bg-yellow-100",
        borderColor: "border-yellow-200",
        isOverdue: false
      };
    } else if (diffDays <= 7) {
      return {
        text: `Due in ${diffDays} days`,
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-200",
        isOverdue: false
      };
    } else {
      return {
        text: `Due in ${diffDays} days`,
        color: "text-gray-700",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-200",
        isOverdue: false
      };
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[800px] max-w-[98vw] mx-auto p-0 bg-white rounded-2xl shadow-xl border-0 max-h-[90vh] flex flex-col">
          <VisuallyHidden>
            <DialogTitle>Loading Task Details</DialogTitle>
            <DialogDescription>Please wait while we load the task information</DialogDescription>
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
            <DialogDescription>The requested task could not be found</DialogDescription>
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
      <DialogContent className="w-[750px] max-w-[95vw] mx-auto p-0 bg-white rounded-xl shadow-xl border-0 overflow-hidden flex flex-col max-h-[90vh]">
        <VisuallyHidden>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>View and manage task information</DialogDescription>
        </VisuallyHidden>

        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 bg-indigo-100 rounded-lg">
              <Eye className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900">Task Details</h2>
              <p className="text-slate-600 text-xs">View and manage task information</p>
            </div>
            {task && (
              <div className="flex items-center gap-2">
                <Badge className={`${
                  task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                  task.status === 'inProgress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  task.status === 'overdue' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-purple-100 text-purple-800 border-purple-200'
                } border text-xs`}>
                  {getStatusDisplayText(task.status)}
                </Badge>
                {task.priority && (
                  <Badge className={`${
                    task.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  } border text-xs`}>
                    Priority: {task.priority}
                  </Badge>
                )}
              </div>
            )}
          </div>
          {task && task.due_date && (() => {
            const dueDateInfo = formatDateInfo(task.due_date);
            if (dueDateInfo.isOverdue || dueDateInfo.text === 'Due today' || dueDateInfo.text === 'Due tomorrow') {
              return (
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-2 ml-11">
                  <Clock className="w-3 h-3" />
                  {dueDateInfo.text}
                </div>
              );
            }
          })()}
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form onSubmit={saveChanges} className="space-y-4">
            {/* Title field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                Task Name
                <span className="text-red-500">*</span>
              </label>
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                required
                className="border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
                placeholder="Enter task name..."
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                placeholder="Provide additional details about this task..."
                className="w-full min-h-[70px] px-3 py-2 border border-slate-200 rounded-md resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 text-sm"
              />
            </div>

            {/* Status, Priority, and Category in a row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  Status
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={tempStatus}
                  onValueChange={(val) => {
                    setTempStatus(val as TaskStatus);
                  }}
                >
                  <SelectTrigger className="w-full border-slate-200 focus:border-indigo-300 focus:ring-indigo-200">
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

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  Priority
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={tempPriority}
                  onValueChange={(val) => {
                    setTempPriority(val as TaskPriority);
                  }}
                >
                  <SelectTrigger className="w-full border-slate-200 focus:border-indigo-300 focus:ring-indigo-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
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

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <Select
                  value={tempCategory}
                  onValueChange={(val) => {
                    setTempCategory(val as TaskCategory);
                  }}
                >
                  <SelectTrigger className="w-full border-slate-200 focus:border-indigo-300 focus:ring-indigo-200">
                    <SelectValue placeholder="Select category..." />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Due Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal border-slate-200 hover:border-slate-300"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                      <span className="text-sm">
                        {tempDueDate ? format(tempDueDate, 'PPP') : 'Pick a date'}
                      </span>
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

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Assigned To Instructor</label>
                <Select
                  value={tempAssignedToInstructorId || "unassigned"}
                  onValueChange={(value) => setTempAssignedToInstructorId(value === "unassigned" ? "" : value)}
                  disabled={loadingInstructors}
                >
                  <SelectTrigger className="w-full border-slate-200 focus:border-indigo-300 focus:ring-indigo-200">
                    <SelectValue placeholder={loadingInstructors ? "Loading..." : "Select instructor..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        Unassigned
                      </div>
                    </SelectItem>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-3 h-3" />
                          {instructor.first_name} {instructor.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due date status indicator */}
            {tempDueDate && (() => {
              const dateInfo = formatDateInfo(tempDueDate.toISOString());
              if (dateInfo.isOverdue || dateInfo.text === 'Due today' || dateInfo.text === 'Due tomorrow') {
                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${dateInfo.bgColor} ${dateInfo.borderColor}`}>
                    <Clock className={`w-3.5 h-3.5 ${dateInfo.color}`} />
                    <span className={`text-xs font-semibold ${dateInfo.color}`}>
                      {dateInfo.text}
                    </span>
                  </div>
                );
              }
            })()}


            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {task.status !== 'completed' && (
                  <>
                    {task.status !== 'inProgress' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickStatusChange('inProgress')}
                        disabled={saving}
                        className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Start
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickStatusChange('completed')}
                      disabled={saving}
                      className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Complete
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isDirty && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelChanges}
                    disabled={saving}
                    className="text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};