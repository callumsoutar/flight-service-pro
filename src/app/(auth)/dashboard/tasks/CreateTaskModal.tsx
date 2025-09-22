import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { 
  Calendar as CalendarIcon, 
  User, 
  // AlertTriangle,
  // CheckCircle, 
  Clock, 
  Plus,
  FileText,
  AlertCircle,
  Flag,
  Tag
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

const TASK_STATUSES: TaskStatus[] = ["pending", "inProgress", "completed", "overdue"];
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
    case "pending": return "Pending";
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
  const [status, setStatus] = useState<TaskStatus>("pending");
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
    setStatus("pending");
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
      <DialogContent className="w-[800px] max-w-[98vw] mx-auto p-0 bg-white rounded-2xl shadow-xl border-0 max-h-[90vh] flex flex-col">
        <VisuallyHidden>
          <DialogTitle>Create New Task</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-gray-200 px-8 pt-8 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-green-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
            <p className="text-sm text-gray-500 mt-1">Add a new task to your workflow</p>
          </div>
        </div>

        <div className="space-y-4 py-4 px-8 overflow-y-auto flex-1">
          <form onSubmit={handleCreateTask} className="space-y-4">
            {/* Title - No Label */}
            <div className="pb-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg font-semibold border-none shadow-none bg-transparent p-0 focus:ring-0 focus:border-none"
                autoFocus
                placeholder="Enter task title..."
                required
              />
            </div>

            {/* Description */}
            <div className="pb-2">
              <label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  value={status} 
                  onValueChange={(val) => {
                    setStatus(val as TaskStatus);
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
                  value={priority} 
                  onValueChange={(val) => {
                    setPriority(val as TaskPriority);
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
                  value={category} 
                  onValueChange={(val) => {
                    setCategory(val as TaskCategory);
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
                      {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
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

              {/* Assigned To */}
              <div className="pb-2">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assigned To Instructor
                </label>
                <Select 
                  value={assignedToInstructorId} 
                  onValueChange={setAssignedToInstructorId}
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

            
            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-800 text-sm font-medium">{error}</div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !title || !status || !priority || !category || !dueDate}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
