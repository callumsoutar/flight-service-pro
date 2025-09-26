import TasksClientPage from "./TasksClientPage";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import type { Task } from "@/types/tasks";

// Component now receives guaranteed authenticated user and role data
async function TasksPage({}: ProtectedPageProps) {
  // TODO: Replace with real data from API or props
  const tasks: Task[] = [];

  return <TasksClientPage tasks={tasks} />;
}

// Export the protected component using the standardized HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(TasksPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;
