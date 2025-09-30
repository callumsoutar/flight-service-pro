import { useQuery } from '@tanstack/react-query';
import { StudentSyllabusEnrollment } from '@/types/student_syllabus_enrollment';
import { AircraftType } from '@/types/aircraft_types';

interface SyllabusEnrollmentWithAircraftType extends StudentSyllabusEnrollment {
  aircraft_type_details?: AircraftType;
}

interface UseMemberSyllabusEnrollmentsResult {
  enrollments: SyllabusEnrollmentWithAircraftType[];
  isLoading: boolean;
  error: string | null;
  preferredAircraftTypeIds: string[];
}

/**
 * Hook to fetch member's syllabus enrollments with aircraft type information
 * Returns preferred aircraft type IDs for syllabus-guided aircraft selection
 */
export function useMemberSyllabusEnrollments(userId: string | null): UseMemberSyllabusEnrollmentsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['member-syllabus-enrollments', userId],
    queryFn: async (): Promise<SyllabusEnrollmentWithAircraftType[]> => {
      if (!userId) return [];
      
      const response = await fetch(`/api/student_syllabus_enrollment?user_id=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch syllabus enrollments');
      }
      
      const { data: enrollments } = await response.json();
      return enrollments || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract preferred aircraft type IDs from active enrollments
  const preferredAircraftTypeIds = (data || [])
    .filter(enrollment => 
      enrollment.status === 'active' || enrollment.status === 'enrolled' || !enrollment.completed_at
    )
    .map(enrollment => enrollment.aircraft_type)
    .filter((aircraftTypeId): aircraftTypeId is string => !!aircraftTypeId);

  return {
    enrollments: data || [],
    isLoading,
    error: error?.message || null,
    preferredAircraftTypeIds,
  };
}
