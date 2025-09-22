import StudentTrainingRecordClient from "./StudentTrainingRecordClient";

interface StudentTrainingRecordPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StudentTrainingRecordPage({ params }: StudentTrainingRecordPageProps) {
  const { id } = await params;
  return <StudentTrainingRecordClient memberId={id} />;
}