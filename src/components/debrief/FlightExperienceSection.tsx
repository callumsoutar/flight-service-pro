"use client";
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useExperienceTypes } from '@/hooks/use-experience-types';
import { useFlightExperience } from '@/hooks/use-flight-experience';
import { toast } from 'sonner';
import type { FlightExperience } from '@/types/flight_experience';

interface FlightExperienceSectionProps {
  lessonProgressId?: string;
  bookingId?: string;
  userId?: string;
  instructorId?: string;
  onFlightExperienceChange?: (experiences: ExperienceFormData[]) => void;
}

interface ExperienceFormData {
  experience_type_id: string;
  duration_hours: number;
  notes?: string;
  conditions?: string;
}

interface ExperienceFormInput {
  experience_type_id: string;
  duration_hours: string;
  notes: string;
  conditions: string;
}

const FlightExperienceSection: React.FC<FlightExperienceSectionProps> = ({
  lessonProgressId,
  bookingId,
  userId,
  instructorId,
  onFlightExperienceChange,
}) => {
  const { experienceTypes, loading: typesLoading } = useExperienceTypes();
  const {
    flightExperiences,
    createFlightExperience,
    updateFlightExperience,
    deleteFlightExperience
  } = useFlightExperience({ lessonProgressId, bookingId, userId, instructorId });

  // Local state for experiences when no lesson progress exists yet
  const [localExperiences, setLocalExperiences] = useState<ExperienceFormData[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExperienceFormInput>({
    experience_type_id: '',
    duration_hours: '',
    notes: '',
    conditions: '',
  });

  const resetForm = () => {
    setFormData({
      experience_type_id: '',
      duration_hours: '',
      notes: '',
      conditions: '',
    });
    setIsAddingNew(false);
    setEditingId(null);
    setEditingIndex(null);
  };

  // Get current experiences (either from database or local state)
  const currentExperiences = lessonProgressId ? flightExperiences : localExperiences;
  const totalHours = currentExperiences.reduce((sum, exp) => sum + exp.duration_hours, 0);

  // Notify parent component of changes
  React.useEffect(() => {
    if (onFlightExperienceChange && !lessonProgressId) {
      onFlightExperienceChange(localExperiences);
    }
  }, [localExperiences, onFlightExperienceChange, lessonProgressId]);

  const handleSave = async () => {
    if (!formData.experience_type_id || !formData.duration_hours) {
      toast.error('Please select an experience type and enter duration');
      return;
    }

    const duration = parseFloat(formData.duration_hours);
    if (isNaN(duration) || duration <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    const experienceData: ExperienceFormData = {
      experience_type_id: formData.experience_type_id,
      duration_hours: duration,
      notes: formData.notes || undefined,
      conditions: formData.conditions || undefined,
    };

    if (lessonProgressId) {
      // Save to database
      try {
        if (editingId) {
          // Update existing experience
          await updateFlightExperience(editingId, {
            experience_type_id: formData.experience_type_id,
            duration_hours: duration,
            notes: formData.notes || null,
            conditions: formData.conditions || null,
          });
          toast.success('Flight experience updated successfully');
        } else {
          // Create new experience
          await createFlightExperience({
            experience_type_id: formData.experience_type_id,
            duration_hours: duration,
            notes: formData.notes || null,
            conditions: formData.conditions || null,
          });
          toast.success('Flight experience added successfully');
        }
        resetForm();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save flight experience');
      }
    } else {
      // Save to local state
      if (editingIndex !== null) {
        // Update existing local experience
        const updatedExperiences = [...localExperiences];
        updatedExperiences[editingIndex] = experienceData;
        setLocalExperiences(updatedExperiences);
        toast.success('Flight experience updated');
      } else {
        // Add new local experience
        setLocalExperiences(prev => [...prev, experienceData]);
        toast.success('Flight experience added');
      }
      resetForm();
    }
  };

  const handleEdit = (experience: FlightExperience | ExperienceFormData, index?: number) => {
    setFormData({
      experience_type_id: experience.experience_type_id,
      duration_hours: experience.duration_hours.toString(),
      notes: experience.notes || '',
      conditions: experience.conditions || '',
    });
    
    if ('id' in experience) {
      // Database experience
      setEditingId(experience.id);
      setEditingIndex(null);
    } else {
      // Local experience
      setEditingId(null);
      setEditingIndex(index || 0);
    }
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this flight experience record?')) {
      if (typeof id === 'string') {
        // Delete from database
        try {
          await deleteFlightExperience(id);
          toast.success('Flight experience deleted successfully');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to delete flight experience');
        }
      } else {
        // Delete from local state
        setLocalExperiences(prev => prev.filter((_, index) => index !== id));
        toast.success('Flight experience deleted');
      }
    }
  };

  const getExperienceTypeName = (typeId: string) => {
    const type = experienceTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Clock className="w-5 h-5 text-orange-600 mr-1" />
        <CardTitle className="text-lg">Flight Experience</CardTitle>
        {totalHours > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {totalHours.toFixed(1)}h total
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {typesLoading ? (
          <div className="text-muted-foreground">Loading experience types...</div>
        ) : (
          <div className="space-y-4">
            {/* Existing Flight Experiences */}
            {currentExperiences.length > 0 && (
              <div className="space-y-3">
                {currentExperiences.map((experience, index) => (
                  <div key={lessonProgressId ? (experience as FlightExperience).id : index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {getExperienceTypeName(experience.experience_type_id)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {experience.duration_hours}h
                        </Badge>
                        {experience.conditions && (
                          <Badge variant="secondary" className="text-xs">
                            {experience.conditions}
                          </Badge>
                        )}
                      </div>
                      {experience.notes && (
                        <p className="text-xs text-muted-foreground">{experience.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(experience, index)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(lessonProgressId ? (experience as FlightExperience).id : index)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Form */}
            {(isAddingNew || editingId || editingIndex !== null) && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Experience Type
                      </label>
                      <Select
                        value={formData.experience_type_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, experience_type_id: value }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {experienceTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Duration (hours)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="999"
                        value={formData.duration_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value }))}
                        placeholder="1.5"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Conditions (optional)
                    </label>
                    <Input
                      value={formData.conditions}
                      onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                      placeholder="VFR, IFR, simulated, etc."
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Notes (optional)
                    </label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this experience..."
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="h-8 px-3"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      {(editingId || editingIndex !== null) ? 'Update' : 'Add'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetForm}
                      className="h-8 px-3"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Add New Button */}
            {!isAddingNew && !editingId && editingIndex === null && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNew(true)}
                className="w-full h-8 text-sm"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Flight Experience
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FlightExperienceSection;
