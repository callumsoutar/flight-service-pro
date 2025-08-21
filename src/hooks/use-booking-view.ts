"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
interface BookingUpdateParams {
  id: string;
  start_time: string | null;
  end_time: string | null;
  purpose: string;
  remarks: string;
  instructor_id: string | null;
  user_id: string | null;
  aircraft_id: string | null;
  lesson_id: string | null;
  flight_type_id: string | null;
  booking_type: string;
}

interface UserResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
}

interface InstructorResult {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Query keys
export const bookingViewKeys = {
  all: ['booking-view'] as const,
  user: (id: string) => [...bookingViewKeys.all, 'user', id] as const,
  instructor: (id: string) => [...bookingViewKeys.all, 'instructor', id] as const,
};

// Hook for fetching user data
export function useUserData(userId: string | null) {
  return useQuery({
    queryKey: bookingViewKeys.user(userId || ''),
    queryFn: async (): Promise<UserResult | null> => {
      if (!userId) return null;
      
      const response = await fetch(`/api/users?id=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      if (data.users && data.users.length > 0) {
        const user = data.users[0];
        return {
          id: user.id,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          email: user.email || "",
          role: user.role || "",
        };
      }
      return null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
}

// Hook for fetching instructor data
export function useInstructorData(instructorId: string | null) {
  return useQuery({
    queryKey: bookingViewKeys.instructor(instructorId || ''),
    queryFn: async (): Promise<InstructorResult | null> => {
      if (!instructorId) return null;
      
      const response = await fetch(`/api/instructors?id=${instructorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch instructor data');
      }
      
      const data = await response.json();
      if (data.instructor) {
        const instructor = data.instructor;
        return {
          id: instructor.id,
          user_id: instructor.user_id,
          first_name: instructor.first_name || "",
          last_name: instructor.last_name || "",
          email: instructor.users?.email || "",
        };
      }
      return null;
    },
    enabled: !!instructorId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
}

// Hook for booking updates
export function useBookingUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BookingUpdateParams) => {
      // Sanitize UUID fields - convert empty strings to null to prevent PostgreSQL errors
      const sanitizeUuid = (value: string | null) => {
        if (typeof value === 'string' && value.trim() === '') {
          return null;
        }
        return value;
      };

      const sanitizedParams = {
        ...params,
        instructor_id: sanitizeUuid(params.instructor_id),
        user_id: sanitizeUuid(params.user_id), 
        aircraft_id: sanitizeUuid(params.aircraft_id),
        lesson_id: sanitizeUuid(params.lesson_id),
        flight_type_id: sanitizeUuid(params.flight_type_id),
      };

      const response = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedParams),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update booking");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success("Booking updated successfully");
      // Invalidate related queries if needed
      queryClient.invalidateQueries({ queryKey: bookingViewKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred while saving");
    },
  });
}

// Helper hook to get member display value from available data
export function useMemberValue(
  userId: string | null, 
  members: { id: string; name: string }[],
  existingUser?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null
): UserResult | null {
  const { data: userData, isLoading } = useUserData(userId);
  
  // Priority 1: Use existing user data from server-side join if available
  if (existingUser) {
    return {
      id: existingUser.id,
      first_name: existingUser.first_name || "",
      last_name: existingUser.last_name || "",
      email: existingUser.email || "",
    };
  }
  
  // Priority 2: Use fresh user data from the query
  if (userData) {
    return userData;
  }
  
  // If query is loading, don't return anything yet (unless we have existing data)
  if (isLoading) {
    return null;
  }
  
  // Priority 3: Fallback to members list if available
  if (userId) {
    const selectedMember = members.find(m => m.id === userId);
    if (selectedMember) {
      return {
        id: selectedMember.id,
        first_name: selectedMember.name.split(" ")[0] || "",
        last_name: selectedMember.name.split(" ").slice(1).join(" ") || "",
        email: "",
      };
    }
    
    // Last resort fallback
    return {
      id: userId,
      first_name: "Unknown",
      last_name: "User",
      email: "",
    };
  }
  
  return null;
}

// Helper hook to get instructor display value from available data
export function useInstructorValue(
  instructorId: string | null,
  instructors: { id: string; name: string }[],
  existingInstructor?: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null
): InstructorResult | null {
  const { data: instructorData, isLoading } = useInstructorData(instructorId);
  
  // Priority 1: Use existing instructor data from server-side if available
  if (existingInstructor) {
    return {
      id: existingInstructor.id,
      user_id: existingInstructor.user_id,
      first_name: existingInstructor.first_name || "",
      last_name: existingInstructor.last_name || "",
      email: existingInstructor.email || "",
    };
  }
  
  // Priority 2: Use fresh instructor data from the query
  if (instructorData) {
    return instructorData;
  }
  
  // If query is loading, don't return anything yet (unless we have existing data)
  if (isLoading) {
    return null;
  }
  
  // Priority 3: Fallback to instructors list if available
  if (instructorId) {
    const selectedInstructor = instructors.find(i => i.id === instructorId);
    if (selectedInstructor) {
      return {
        id: selectedInstructor.id,
        user_id: selectedInstructor.id,
        first_name: selectedInstructor.name.split(" ")[0] || "",
        last_name: selectedInstructor.name.split(" ").slice(1).join(" ") || "",
        email: "",
      };
    }
    
    // Last resort fallback
    return {
      id: instructorId,
      user_id: instructorId,
      first_name: "Unknown",
      last_name: "Instructor",
      email: "",
    };
  }
  
  return null;
}