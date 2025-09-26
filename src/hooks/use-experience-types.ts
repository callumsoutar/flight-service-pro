import { useState, useEffect } from 'react';
import type { ExperienceType } from '@/types/experience_types';

export function useExperienceTypes() {
  const [experienceTypes, setExperienceTypes] = useState<ExperienceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExperienceTypes = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/experience-types');
        const data = await response.json();
        
        if (response.ok) {
          const activeTypes = (data.experience_types || []).filter((type: ExperienceType) => type.is_active);
          setExperienceTypes(activeTypes);
        } else {
          setError(data.error || 'Failed to fetch experience types');
        }
      } catch {
        setError('Failed to fetch experience types');
      } finally {
        setLoading(false);
      }
    };

    fetchExperienceTypes();
  }, []);

  return { experienceTypes, loading, error };
}
