import React from "react";
import StudentTrainingRecordClient from "./StudentTrainingRecordClient";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from '@/lib/rbac-page-wrapper';

interface StudentTrainingRecordPageProps extends ProtectedPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function StudentTrainingRecordPage({ params }: StudentTrainingRecordPageProps) {
  const { id } = await params;
  return <StudentTrainingRecordClient memberId={id} />;
}

// Export protected component with role restriction for instructors and above
export default withRoleProtection(StudentTrainingRecordPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);