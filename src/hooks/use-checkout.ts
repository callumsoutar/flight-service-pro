"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
interface CheckOutParams {
  bookingId: string;
  bookingData: {
    checked_out_aircraft_id?: string | null;
    checked_out_instructor_id?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    user_id?: string | null;
    lesson_id?: string | null;
    remarks?: string;
    purpose?: string;
    flight_type_id?: string | null;
    booking_type?: string;
    status?: string;
    hobbs_start?: number;
    tach_start?: number;
  };
  bookingDetailsData?: {
    id?: string;
    eta?: string | null;
    fuel_on_board?: number;
    passengers?: string;
    route?: string;
    remarks?: string;
    booking_id: string;
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

// Query keys
export const checkoutKeys = {
  all: ['checkout'] as const,
  aircraft: (id: string) => [...checkoutKeys.all, 'aircraft', id] as const,
  instructor: (id: string) => [...checkoutKeys.all, 'instructor', id] as const,
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
export function useCheckOutSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CheckOutParams) => {
      const { bookingId, bookingData, bookingDetailsData } = params;

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
        checked_out_aircraft_id: sanitizeUuid(bookingData.checked_out_aircraft_id),
        checked_out_instructor_id: sanitizeUuid(bookingData.checked_out_instructor_id),
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

      // Update booking details if there's data to update
      if (bookingDetailsData && Object.keys(bookingDetailsData).length > 1) { // more than just booking_id
        let detailsResponse;
        
        if (bookingDetailsData.id) {
          // Update existing booking details
          detailsResponse = await fetch(`/api/booking_details`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookingDetailsData),
          });
        } else {
          // Create new booking details
          detailsResponse = await fetch(`/api/booking_details`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookingDetailsData),
          });
        }
        
        if (!detailsResponse.ok) {
          const errorData = await detailsResponse.json();
          throw new Error(errorData.error || "Failed to save booking details");
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Check-Out details saved successfully!");
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: checkoutKeys.all });
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