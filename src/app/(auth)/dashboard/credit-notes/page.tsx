import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';
import CreditNotesClientPage from './CreditNotesClientPage';

async function CreditNotesPage({ userRole }: ProtectedPageProps) {
  return <CreditNotesClientPage userRole={userRole} />;
}

// Export protected component with role restriction for instructors and above
/* eslint-disable @typescript-eslint/no-explicit-any */
export default withRoleProtection(CreditNotesPage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;

