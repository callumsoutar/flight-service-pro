import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import SchedulerClient from "./SchedulerClient";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function SchedulerPage({ user: _user, userRole: _userRole }: ProtectedPageProps) {
  return <SchedulerClient />;
}

// Export protected component - all authenticated users can access scheduler
export default withRoleProtection(SchedulerPage, ROLE_CONFIGS.AUTHENTICATED_ONLY);