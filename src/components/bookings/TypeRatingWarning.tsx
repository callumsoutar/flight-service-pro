import React from 'react';
import { XCircle } from 'lucide-react';
import type { TypeRatingValidation } from '@/types/instructor_aircraft_ratings';
import { getValidationSeverity } from '@/hooks/use-instructor-type-rating';

interface TypeRatingWarningProps {
  validation: TypeRatingValidation | null;
  isValidating: boolean;
  error: string | null;
  className?: string;
}

export function TypeRatingWarning(props: TypeRatingWarningProps) {
  const { validation, error, className = '' } = props;
  // Only render if there's an actual error or validation failure
  // Don't show loading states or successful validations

  // Show error state only
  if (error) {
    return (
      <div className={`p-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm ${className}`}>
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>Unable to verify type rating: {error}</span>
        </div>
      </div>
    );
  }

  // Show validation result - only render for actual conflicts/errors, not success or loading
  if (validation && !validation.valid) {
    const severity = getValidationSeverity(validation);
    if (!severity) return null;

    return (
      <div className={`p-3 rounded-lg border ${severity.className} text-sm ${className}`}>
        <div className="flex items-start gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium mb-1">
              Type Rating Required
            </div>
            <div className="text-xs">
              {validation.message}
            </div>
            <div className="text-xs mt-2 font-medium">
              ⚠️ This booking can still be created, but the instructor may not be qualified to operate this aircraft type.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
