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
                  <div key={lessonProgressId ? (experience as FlightExperience).id : index} className="group p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            {getExperienceTypeName(experience.experience_type_id)}
                          </span>
                          <Badge variant="outline" className="text-sm font-medium px-2 py-1">
                            {experience.duration_hours}h
                          </Badge>
                          {experience.conditions && (
                            <Badge variant="secondary" className="text-sm">
                              {experience.conditions}
                            </Badge>
                          )}
                        </div>
                        {experience.notes && (
                          <p className="text-sm text-gray-600 leading-relaxed">{experience.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(experience, index)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                          title="Edit experience"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lessonProgressId ? (experience as FlightExperience).id : index)}
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                          title="Delete experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Form */}
            {(isAddingNew || editingId || editingIndex !== null) && (
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                <div className="text-sm font-medium text-blue-900 mb-4">
                  {(editingId || editingIndex !== null) ? 'Edit Flight Experience' : 'Add New Flight Experience'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Experience Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.experience_type_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, experience_type_id: value }))}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="Select experience type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {experienceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{type.name}</span>
                              {type.description && (
                                <span className="text-xs text-muted-foreground">{type.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Duration (hours) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="999"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value }))}
                      placeholder="1.5"
                      className="h-10 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Conditions (optional)
                  </label>
                  <Input
                    value={formData.conditions}
                    onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                    placeholder="VFR, IFR, simulated, night, cross-country, etc."
                    className="h-10 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Notes (optional)
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this flight experience..."
                    className="min-h-[80px] bg-white resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-blue-200">
                  <Button
                    onClick={handleSave}
                    className="h-10 px-4 bg-blue-600 hover:bg-blue-700"
                    disabled={!formData.experience_type_id || !formData.duration_hours}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {(editingId || editingIndex !== null) ? 'Update Experience' : 'Add Experience'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="h-10 px-4 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Add New Button */}
            {!isAddingNew && !editingId && editingIndex === null && (
              <Button
                variant="outline"
                onClick={() => setIsAddingNew(true)}
                className="w-full h-12 text-sm font-medium border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
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
