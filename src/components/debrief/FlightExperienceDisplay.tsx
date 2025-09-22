import React from 'react';
// import { Badge } from '@/components/ui/badge';
// import { Clock } from 'lucide-react';
import type { FlightExperience } from '@/types/flight_experience';
import type { ExperienceType } from '@/types/experience_types';

interface FlightExperienceDisplayProps {
  flightExperiences: FlightExperience[];
  experienceTypes: ExperienceType[];
}

const FlightExperienceDisplay: React.FC<FlightExperienceDisplayProps> = ({
  flightExperiences,
  experienceTypes,
}) => {
  const getExperienceTypeName = (typeId: string) => {
    const type = experienceTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  const totalHours = flightExperiences.reduce((sum, exp) => sum + exp.duration_hours, 0);

  if (flightExperiences.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No flight experience records found for this lesson.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Flight Experience Records */}
      {flightExperiences.map((experience) => (
        <div key={experience.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">
                {getExperienceTypeName(experience.experience_type_id).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
              </span>
              {experience.conditions && (
                <span className="text-sm text-gray-500">({experience.conditions})</span>
              )}
            </div>
            {experience.notes && (
              <p className="text-sm text-gray-600 mt-1">{experience.notes}</p>
            )}
          </div>
          <div className="text-right">
            <span className="font-semibold text-gray-900">{experience.duration_hours}h</span>
          </div>
        </div>
      ))}
      
      {/* Total Hours Summary */}
      {totalHours > 0 && (
        <div className="pt-3 mt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">{totalHours.toFixed(1)}h</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightExperienceDisplay;
