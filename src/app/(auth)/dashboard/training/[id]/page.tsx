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
/* eslint-disable @typescript-eslint/no-explicit-any */
export default withRoleProtection(StudentTrainingRecordPage as any, ROLE_CONFIGS.INSTRUCTOR_AND_UP) as any;