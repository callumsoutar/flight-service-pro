"use client";
import React from "react";
import { CheckSquare, Clock, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { Task } from "@/types/tasks";

interface TasksStatsCardsProps {
  tasks: Task[] | undefined | null;
}

export default function TasksStatsCards({ tasks }: TasksStatsCardsProps) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const total = safeTasks.length;
  const completed = safeTasks.filter(task => task.status === "completed").length;
  const assigned = safeTasks.filter(task => task.status === "assigned").length;
  const overdue = safeTasks.filter(task => {
    if (!task.due_date || task.status === "completed") return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;
  const inProgress = safeTasks.filter(task => task.status === "inProgress").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#89d2dc]/20 rounded-lg flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-[#6564db]" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-xl font-bold text-gray-900">{total}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned</p>
            <p className="text-xl font-bold text-gray-900">{assigned}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">In Progress</p>
            <p className="text-xl font-bold text-gray-900">{inProgress}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completed</p>
            <p className="text-xl font-bold text-gray-900">{completed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overdue</p>
            <p className="text-xl font-bold text-gray-900">{overdue}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
