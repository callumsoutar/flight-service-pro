export type TaskStatus = "assigned" | "inProgress" | "completed" | "overdue";
export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory = "Safety" | "Training" | "Maintenance" | "Administrative" | "Other";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  due_date?: string | null; // ISO date string
  assigned_to_user_id?: string | null;
  assigned_to_instructor_id?: string | null;
  created_by_user_id: string;
  related_booking_id?: string | null;
  related_aircraft_id?: string | null;
  related_user_id?: string | null;
  related_instructor_id?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  start_date?: string | null; // ISO date string
  completed_date?: string | null; // ISO timestamp string
  attachments: TaskAttachment[];
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
  
  // Joined data from API
  assigned_to_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  assigned_to_instructor?: {
    id: string;
    first_name: string;
    last_name: string;
    user_id: string;
  } | null;
  created_by?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  related_booking?: {
    id: string;
    start_time: string;
    end_time: string;
    purpose: string;
  } | null;
  related_aircraft?: {
    id: string;
    registration: string;
    type: string;
  } | null;
  related_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  related_instructor?: {
    id: string;
    first_name: string;
    last_name: string;
    user_id: string;
  } | null;
}

export interface TaskAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mime_type: string;
  uploaded_at: string; // ISO timestamp string
  uploaded_by: string; // user ID
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  due_date?: string; // ISO date string
  assigned_to_user_id?: string;
  assigned_to_instructor_id?: string;
  related_booking_id?: string;
  related_aircraft_id?: string;
  related_user_id?: string;
  related_instructor_id?: string;
  estimated_hours?: number;
  start_date?: string; // ISO date string
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  due_date?: string; // ISO date string
  assigned_to_user_id?: string | null;
  assigned_to_instructor_id?: string | null;
  related_booking_id?: string | null;
  related_aircraft_id?: string | null;
  related_user_id?: string | null;
  related_instructor_id?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  start_date?: string | null; // ISO date string
  completed_date?: string | null; // ISO timestamp string
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assigned_to_user_id?: string;
  assigned_to_instructor_id?: string;
  related_booking_id?: string;
  related_aircraft_id?: string;
  related_user_id?: string;
  related_instructor_id?: string;
  due_date_from?: string; // ISO date string
  due_date_to?: string; // ISO date string
  search?: string;
}

export interface TaskStats {
  total: number;
  assigned: number;
  inProgress: number;
  completed: number;
  overdue: number;
  by_priority: {
    low: number;
    medium: number;
    high: number;
  };
  by_category: Record<TaskCategory, number>;
}

// Constants for UI
export const TASK_STATUSES: TaskStatus[] = ["assigned", "inProgress", "completed", "overdue"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
export const TASK_CATEGORIES: TaskCategory[] = ["Safety", "Training", "Maintenance", "Administrative", "Other"];

// Helper functions for UI
export const getTaskStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800 border-green-200";
    case "overdue": return "bg-red-100 text-red-800 border-red-200";
    case "inProgress": return "bg-blue-100 text-blue-800 border-blue-200";
    case "assigned": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const getTaskPriorityColor = (priority: TaskPriority): string => {
  switch (priority) {
    case "high": return "bg-red-100 text-red-800 border-red-200";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low": return "bg-green-100 text-green-800 border-green-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const getTaskStatusIcon = (status: TaskStatus): string => {
  switch (status) {
    case "completed": return "CheckCircle";
    case "overdue": return "AlertTriangle";
    case "inProgress": return "Clock";
    case "assigned": return "Clock";
    default: return "Clock";
  }
};

export const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date || task.status === "completed") return false;
  const dueDate = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

export const getTaskDaysUntilDue = (task: Task): number | null => {
  if (!task.due_date) return null;
  const dueDate = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
