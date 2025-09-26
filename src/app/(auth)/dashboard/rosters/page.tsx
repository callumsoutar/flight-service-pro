import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";
import RostersClient from "./RostersClient";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function RostersPage({ user: _user, userRole: _userRole }: ProtectedPageProps) {
  return <RostersClient />;
}

// Export protected component - instructors and above can access rosters
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(RostersPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;