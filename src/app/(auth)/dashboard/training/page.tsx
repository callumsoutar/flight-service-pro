import TrainingClientPage from "./TrainingClientPage";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

// Component now receives guaranteed authenticated user and role data
async function TrainingPage({}: ProtectedPageProps) {
  return <TrainingClientPage />;
}

// Export the protected component using the standardized HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(TrainingPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;