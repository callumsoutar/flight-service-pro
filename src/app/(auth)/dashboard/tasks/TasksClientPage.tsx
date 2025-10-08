"use client";
import { useState, useEffect } from "react";
import { Plus, Search, Calendar, User, Edit, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskDetailsModal } from "./TaskDetailsModal";
import { CreateTaskModal } from "./CreateTaskModal";
import { Task } from "@/types/tasks";
import { toast } from "sonner";

const statusConfig = {
  assigned: { label: "Assigned", color: "bg-purple-100 text-purple-800 border-purple-200" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800 border-red-200" },
  inProgress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200" }
};

const priorityConfig = {
  high: { label: "High", color: "bg-red-100 text-red-800 border-red-200" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  low: { label: "Low", color: "bg-green-100 text-green-800 border-green-200" }
};

export default function TasksClientPage({ }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch tasks on component mount
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, []);

  // Use fetched tasks data, fallback to empty array if undefined
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const filteredTasks = safeTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesCompleted = showCompleted || task.status !== "completed";
    return matchesSearch && matchesStatus && matchesCompleted;
  });

  // Get count of completed tasks
  const completedCount = safeTasks.filter(task => task.status === "completed").length;

  // const getStatusIcon = (status: string) => {
  //   switch (status) {
  //     case "completed": return <CheckCircle className="w-4 h-4 text-green-600" />;
  //     case "overdue": return <AlertTriangle className="w-4 h-4 text-red-600" />;
  //     case "inProgress": return <Clock className="w-4 h-4 text-blue-600" />;
  //     case "pending": return <Clock className="w-4 h-4 text-yellow-600" />;
  //     case "assigned": return <User className="w-4 h-4 text-purple-600" />;
  //     default: return <Clock className="w-4 h-4 text-gray-600" />;
  //   }
  // };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return { text: "No due date", color: "text-gray-500", bgColor: "bg-gray-100", borderColor: "border-gray-200", isOverdue: false };

    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0); // Normalize to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Overdue
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

  const handleEditTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTaskId(null);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    // Update the task in the local state
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  const handleCreateTask = (newTask: Task) => {
    // Add the new task to the beginning of the list
    setTasks(prevTasks => [newTask, ...prevTasks]);
  };

  // Show loading state while fetching data
  if (loading) {
    return (
      <main className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Tasks</h1>
            <p className="text-gray-600 text-lg">Manage your tasks and assignments efficiently</p>
          </div>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Compact Stats & Filters Row */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Compact Stats */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Total: {safeTasks.length}</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Assigned: {safeTasks.filter(t => t.status === "assigned").length}</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Completed: {safeTasks.filter(t => t.status === "completed").length}</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Overdue: {safeTasks.filter(t => t.status === "overdue").length}</span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3 flex-1 lg:justify-end">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 border-gray-200 rounded-lg">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="inProgress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showCompleted ? "default" : "outline"}
              onClick={() => setShowCompleted(!showCompleted)}
              className={`gap-2 ${
                showCompleted
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {showCompleted ? `Hide Completed (${completedCount})` : `Show Completed (${completedCount})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      {filteredTasks.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-3">No tasks found</h3>
            <p className="text-gray-500 text-center max-w-md text-lg">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Get started by creating your first task to stay organized and on track."
              }
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button 
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 px-6 py-3"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-gray-50/80 transition-all duration-200 group cursor-pointer ${
                      task.status === 'completed' ? 'opacity-60 hover:opacity-80' : ''
                    }`}
                    onClick={() => handleEditTask(task.id.toString())}
                  >
                    <td className="px-6 py-5">
                      <div>
                        <h4 className={`font-semibold mb-1 group-hover:text-indigo-600 transition-colors ${
                          task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>{task.title}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 max-w-xs leading-relaxed">{task.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge className={`${statusConfig[task.status as keyof typeof statusConfig]?.color} px-3 py-1.5 text-xs font-medium`}>
                        {statusConfig[task.status as keyof typeof statusConfig]?.label || task.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <Badge className={`${priorityConfig[task.priority as keyof typeof priorityConfig]?.color} px-3 py-1.5 text-xs font-medium`}>
                        {priorityConfig[task.priority as keyof typeof priorityConfig]?.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      {(() => {
                        const dateInfo = formatDate(task.due_date);
                        return (
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              dateInfo.isOverdue ? 'bg-red-100' :
                              dateInfo.text === 'Due today' ? 'bg-orange-100' :
                              dateInfo.text === 'Due tomorrow' ? 'bg-yellow-100' :
                              'bg-blue-50'
                            }`}>
                              <Calendar className={`w-4 h-4 ${
                                dateInfo.isOverdue ? 'text-red-600' :
                                dateInfo.text === 'Due today' ? 'text-orange-600' :
                                dateInfo.text === 'Due tomorrow' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`} />
                            </div>
                            <Badge className={`${dateInfo.bgColor} ${dateInfo.color} border ${dateInfo.borderColor} px-2.5 py-1 text-xs font-medium`}>
                              {dateInfo.text}
                            </Badge>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {task.assigned_to_user ? `${task.assigned_to_user.first_name} ${task.assigned_to_user.last_name}` : 
                           task.assigned_to_instructor ? `${task.assigned_to_instructor.first_name} ${task.assigned_to_instructor.last_name}` : 
                           'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {task.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {task.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch(`/api/tasks/${task.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    status: 'completed',
                                    completed_date: new Date().toISOString()
                                  }),
                                });
                                if (response.ok) {
                                  const data = await response.json();
                                  handleTaskUpdate(data.task);
                                  toast.success('Task marked as complete!');
                                }
                              } catch (error) {
                                console.error('Error completing task:', error);
                                toast.error('Failed to complete task');
                              }
                            }}
                            title="Mark as Complete"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTask(task.id.toString());
                          }}
                          title="Edit Task"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement delete functionality
                          }}
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailsModal
          open={isModalOpen}
          onClose={handleCloseModal}
          taskId={selectedTaskId}
          onTaskUpdate={handleTaskUpdate}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreate={handleCreateTask}
      />
    </main>
  );
}
