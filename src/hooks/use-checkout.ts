"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
export interface CheckOutParams {
  bookingId: string;
  bookingData: {
    start_time?: string | null;
    end_time?: string | null;
    user_id?: string | null;
    lesson_id?: string | null;
    remarks?: string;
    purpose?: string;
    flight_type_id?: string | null;
    booking_type?: string;
    status?: string;
  };
  flightLogData?: {
    id?: string;
    booking_id: string;
    checked_out_aircraft_id?: string;
    checked_out_instructor_id?: string;
    eta?: string | null;
    fuel_on_board?: number;
    passengers?: string;
    route?: string;
    flight_remarks?: string;
    hobbs_start?: number;
    hobbs_end?: number;
    tach_start?: number;
    tach_end?: number;
    flight_time?: number;
    briefing_completed?: boolean;
    authorization_completed?: boolean;
  };
}

interface AircraftMeterData {
  current_hobbs: number | null;
  current_tach: number | null;
  fuel_consumption: number | null;
}

interface InstructorResult {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface InstructorComplianceData {
  instructor_check_due_date: string | null;
  class_1_medical_due_date: string | null;
}

interface UserComplianceData {
  class_1_medical_due: string | null;
  class_2_medical_due: string | null;
  DL9_due: string | null;
  BFR_due: string | null;
  pilot_license_expiry: string | null;
}

// Query keys
export const checkoutKeys = {
  all: ['checkout'] as const,
  aircraft: (id: string) => [...checkoutKeys.all, 'aircraft', id] as const,
  instructor: (id: string) => [...checkoutKeys.all, 'instructor', id] as const,
  instructorCompliance: (id: string) => [...checkoutKeys.all, 'instructor-compliance', id] as const,
  userCompliance: (id: string) => [...checkoutKeys.all, 'user-compliance', id] as const,
};

// Hook for fetching aircraft meter data
export function useAircraftMeters(aircraftId: string | null) {
  return useQuery({
    queryKey: checkoutKeys.aircraft(aircraftId || ''),
    queryFn: async (): Promise<AircraftMeterData | null> => {
      if (!aircraftId) return null;
      
      const response = await fetch(`/api/aircraft?id=${aircraftId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch aircraft data');
      }
      
      const data = await response.json();
      if (data.aircraft) {
        return {
          current_hobbs: typeof data.aircraft.current_hobbs === 'number' ? data.aircraft.current_hobbs : null,
          current_tach: typeof data.aircraft.current_tach === 'number' ? data.aircraft.current_tach : null,
          fuel_consumption: typeof data.aircraft.fuel_consumption === 'number' ? data.aircraft.fuel_consumption : null,
        };
      }
      return null;
    },
    enabled: !!aircraftId,
    staleTime: 1000 * 60 * 5, // 5 minutes for aircraft meters
    retry: 1,
  });
}

// Hook for fetching instructor data (reuse from booking view)
export function useInstructorData(instructorId: string | null) {
  return useQuery({
    queryKey: checkoutKeys.instructor(instructorId || ''),
    queryFn: async (): Promise<InstructorResult | null> => {
      if (!instructorId) return null;
      
      const response = await fetch(`/api/instructors?id=${instructorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch instructor data');
      }
      
      const data = await response.json();
      if (data.instructor && data.instructor.users) {
        const user = data.instructor.users;
        return {
          id: data.instructor.id,
          user_id: data.instructor.user_id,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          email: user.email || "",
        };
      }
      return null;
    },
    enabled: !!instructorId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
}

// Hook for check-out save operations
export function useCheckOutSave(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CheckOutParams) => {
      const { bookingId, bookingData, flightLogData } = params;

      // Sanitize UUID fields - convert empty strings to null
      const sanitizeUuid = (value: string | null | undefined) => {
        if (typeof value === 'string' && value.trim() === '') {
          return null;
        }
        return value;
      };

      // Sanitize booking data
      const sanitizedBookingData = {
        ...bookingData,
        user_id: sanitizeUuid(bookingData.user_id),
        lesson_id: sanitizeUuid(bookingData.lesson_id),
        flight_type_id: sanitizeUuid(bookingData.flight_type_id),
      };

      // Update booking if there's data to update
      if (Object.keys(sanitizedBookingData).length > 0) {
        const bookingResponse = await fetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: bookingId, ...sanitizedBookingData }),
        });
        
        if (!bookingResponse.ok) {
          const errorData = await bookingResponse.json();
          throw new Error(errorData.error || "Failed to update booking");
        }
      }

      // Update flight log if there's data to update
      if (flightLogData && Object.keys(flightLogData).length > 1) { // more than just booking_id
        let flightLogResponse;
        
        if (flightLogData.id) {
          // Update existing flight log
          flightLogResponse = await fetch(`/api/flight-logs`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(flightLogData),
          });
        } else {
          // Create new flight log
          flightLogResponse = await fetch(`/api/flight-logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(flightLogData),
          });
        }
        
        if (!flightLogResponse.ok) {
          const errorData = await flightLogResponse.json();
          throw new Error(errorData.error || "Failed to save flight log");
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: checkoutKeys.all });
      // Call custom onSuccess callback if provided
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save check-out details");
    },
  });
}

// Helper hook to get instructor display value with smart fallbacks
export function useInstructorValue(
  instructorId: string | null,
  instructors: { id: string; name: string }[],
  existingInstructor?: {
    id: string;
    user_id: string;
    users?: {
      first_name: string;
      last_name: string;
      email: string;
    };
  } | null
): InstructorResult | null {
  const { data: instructorData, isLoading } = useInstructorData(instructorId);
  
  // Priority 1: Use existing instructor data from server-side join if available
  if (existingInstructor && existingInstructor.users) {
    return {
      id: existingInstructor.id,
      user_id: existingInstructor.user_id,
      first_name: existingInstructor.users.first_name || "",
      last_name: existingInstructor.users.last_name || "",
      email: existingInstructor.users.email || "",
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

// Hook for fetching instructor compliance data
export function useInstructorCompliance(instructorId: string | null) {
  return useQuery({
    queryKey: checkoutKeys.instructorCompliance(instructorId || ''),
    queryFn: async (): Promise<InstructorComplianceData | null> => {
      if (!instructorId) return null;

      const response = await fetch(`/api/instructors?id=${instructorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch instructor compliance data');
      }

      const data = await response.json();
      if (data.instructor) {
        return {
          instructor_check_due_date: data.instructor.instructor_check_due_date || null,
          class_1_medical_due_date: data.instructor.class_1_medical_due_date || null,
        };
      }
      return null;
    },
    enabled: !!instructorId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Hook for fetching user compliance data
export function useUserCompliance(userId: string | null) {
  return useQuery({
    queryKey: checkoutKeys.userCompliance(userId || ''),
    queryFn: async (): Promise<UserComplianceData | null> => {
      if (!userId) return null;

      const response = await fetch(`/api/users?id=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user compliance data');
      }

      const data = await response.json();
      if (data.users && data.users.length > 0) {
        const user = data.users[0];
        return {
          class_1_medical_due: user.class_1_medical_due || null,
          class_2_medical_due: user.class_2_medical_due || null,
          DL9_due: user.DL9_due || null,
          BFR_due: user.BFR_due || null,
          pilot_license_expiry: user.pilot_license_expiry || null,
        };
      }
      return null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}