import { useState, useEffect, useCallback } from 'react';
import type { FlightExperience, FlightExperienceInsert, FlightExperienceUpdate } from '@/types/flight_experience';

interface UseFlightExperienceProps {
  lessonProgressId?: string;
  bookingId?: string;
  userId?: string;
  instructorId?: string;
}

export function useFlightExperience({ lessonProgressId, bookingId, userId, instructorId }: UseFlightExperienceProps) {
  const [flightExperiences, setFlightExperiences] = useState<FlightExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlightExperiences = useCallback(async () => {
    if (!lessonProgressId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/flight-experience?lesson_progress_id=${lessonProgressId}&include_details=true`);
      const data = await response.json();

      if (response.ok) {
        setFlightExperiences(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch flight experiences');
      }
    } catch {
      setError('Failed to fetch flight experiences');
    } finally {
      setLoading(false);
    }
  }, [lessonProgressId]);

  useEffect(() => {
    fetchFlightExperiences();
  }, [fetchFlightExperiences]);

  const createFlightExperience = async (experienceData: Omit<FlightExperienceInsert, 'lesson_progress_id' | 'booking_id' | 'user_id' | 'instructor_id'>) => {
    if (!lessonProgressId || !bookingId || !userId || !instructorId) {
      throw new Error('Missing required IDs for creating flight experience');
    }

    try {
      const response = await fetch('/api/flight-experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...experienceData,
          lesson_progress_id: lessonProgressId,
          booking_id: bookingId,
          user_id: userId,
          instructor_id: instructorId,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setFlightExperiences(prev => [...prev, data.data]);
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create flight experience');
      }
    } catch (err) {
      throw err;
    }
  };

  const updateFlightExperience = async (id: string, experienceData: FlightExperienceUpdate) => {
    try {
      const response = await fetch(`/api/flight-experience/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(experienceData),
      });

      const data = await response.json();
      
      if (response.ok) {
        setFlightExperiences(prev => 
          prev.map(exp => exp.id === id ? data.data : exp)
        );
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to update flight experience');
      }
    } catch (err) {
      throw err;
    }
  };

  const deleteFlightExperience = async (id: string) => {
    try {
      const response = await fetch(`/api/flight-experience/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFlightExperiences(prev => prev.filter(exp => exp.id !== id));
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete flight experience');
      }
    } catch (err) {
      throw err;
    }
  };

  return {
    flightExperiences,
    loading,
    error,
    createFlightExperience,
    updateFlightExperience,
    deleteFlightExperience,
    refetch: fetchFlightExperiences,
  };
}
