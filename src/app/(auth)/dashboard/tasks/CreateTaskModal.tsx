import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import {
  Calendar as CalendarIcon,
  User,
  // AlertTriangle,
  // CheckCircle,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Task, TaskStatus, TaskPriority, TaskCategory } from "@/types/tasks";

// Task types and configurations

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onTaskCreate?: (newTask: Task) => void;
}

const TASK_STATUSES: TaskStatus[] = ["assigned", "inProgress", "completed", "overdue"];
const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const TASK_CATEGORIES: TaskCategory[] = ["Safety", "Training", "Maintenance", "Administrative", "Other"];

// Helper functions for styling (unused but keeping for potential future use)
// const getStatusColor = (status: TaskStatus): string => {
//   switch (status) {
//     case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
//     case 'inProgress': return 'bg-blue-100 text-blue-800 border-blue-200';
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

// const getStatusIcon = (status: TaskStatus) => {
//   switch (status) {
//     case "completed": return <CheckCircle className="w-4 h-4" />;
//     case "overdue": return <AlertTriangle className="w-4 h-4" />;
//     case "inProgress": return <Clock className="w-4 h-4" />;
//     default: return <Clock className="w-4 h-4" />;
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

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ 
  open, 
  onClose, 
  onTaskCreate 
}) => {
  // Form fields for new task
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("assigned");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState<TaskCategory>("Other");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assignedToInstructorId, setAssignedToInstructorId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Instructor data
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  // Set default due date to tomorrow
  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow);
  }, []);

  // Fetch instructors when modal opens
  useEffect(() => {
    if (open) {
      fetchInstructors();
    }
  }, [open]);

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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!title || !status || !priority || !category || !dueDate) {
      setError("Required fields must be filled.");
      return;
    }

    setIsCreating(true);
    
    try {
      // Make real API call to create task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          category,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
          assigned_to_instructor_id: assignedToInstructorId.trim() || null, // Use instructor ID instead of user ID
          // Add other optional fields as needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const { task } = await response.json();
      
      // Call the callback with the created task
      onTaskCreate?.(task);
      handleClose();
      toast.success("Task created successfully!");
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Reset form fields
    setTitle("");
    setDescription("");
    setStatus("assigned");
    setPriority("medium");
    setCategory("Other");
    setDueDate(undefined);
    setAssignedToInstructorId("");
    setError(null);
    setIsCreating(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="w-[750px] max-w-[95vw] mx-auto p-0 bg-white rounded-xl shadow-xl border-0 overflow-hidden flex flex-col max-h-[90vh]">
        <VisuallyHidden>
          <DialogTitle>Create New Task</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 bg-indigo-100 rounded-lg">
              <Plus className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900">Create New Task</h2>
              <p className="text-slate-600 text-xs">Add a new task to your workflow</p>
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form onSubmit={handleCreateTask} className="space-y-4">
            {/* Title field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                Task Name
                <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
                placeholder="Enter task name..."
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  value={status}
                  onValueChange={(val) => {
                    setStatus(val as TaskStatus);
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
                  value={priority}
                  onValueChange={(val) => {
                    setPriority(val as TaskPriority);
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
                  value={category}
                  onValueChange={(val) => {
                    setCategory(val as TaskCategory);
                  }}
                >
                  <SelectTrigger className="w-full border-slate-200 focus:border-indigo-300 focus:ring-indigo-200">
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
                        {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Assigned To Instructor</label>
                <Select
                  value={assignedToInstructorId}
                  onValueChange={setAssignedToInstructorId}
                  disabled={loadingInstructors}
                >
                  <SelectTrigger className="w-full border-slate-200 focus:border-indigo-300 focus:ring-indigo-200">
                    <SelectValue placeholder={loadingInstructors ? "Loading..." : "Select instructor..."} />
                  </SelectTrigger>
                  <SelectContent>
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

            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-800 text-sm font-medium">{error}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="text-slate-700 border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !title || !status || !priority || !category || !dueDate}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm"
                >
                  {isCreating ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
