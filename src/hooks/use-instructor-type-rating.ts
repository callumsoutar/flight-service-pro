import { useState, useCallback } from 'react';
import type { TypeRatingValidation } from '@/types/instructor_aircraft_ratings';

/**
 * Hook to validate instructor type ratings for aircraft
 * Provides real-time validation and error handling
 */
export function useInstructorTypeRating() {
  const [validation, setValidation] = useState<TypeRatingValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateTypeRating = useCallback(async (instructorId: string | null, aircraftId: string | null) => {
    // Reset state
    setValidation(null);
    setError(null);

    // Skip validation if either is missing
    if (!instructorId || !aircraftId) {
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch('/api/instructor-aircraft-ratings/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructor_id: instructorId,
          aircraft_id: aircraftId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate type rating');
      }

      const result: TypeRatingValidation = await response.json();
      setValidation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      console.error('Type rating validation error:', err);
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Helper to reset validation state
  const resetValidation = useCallback(() => {
    setValidation(null);
    setError(null);
    setIsValidating(false);
  }, []);

  return {
    validation,
    isValidating,
    error,
    validateTypeRating,
    resetValidation,
  };
}

/**
 * Helper function to determine the severity and styling of validation messages
 * Only returns styling for error states since we don't show success states
 */
export function getValidationSeverity(validation: TypeRatingValidation | null) {
  if (!validation || validation.valid) return null;

  return {
    severity: 'error' as const,
    className: 'bg-red-50 border-red-200 text-red-700',
    icon: '❌',
  };
}
