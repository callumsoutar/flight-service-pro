/**
 * TimeSlotConfiguration Component
 * 
 * Provides UI for managing booking time slots and default booking duration.
 * 
 * Features:
 * - Configure default booking duration (0.5-12 hours)
 * - Add/edit/delete custom time slots
 * - Compact, expandable interface for better UX
 * - Real-time validation and error handling
 * - Integration with settings system for persistence
 * 
 * Usage:
 * - Access via Settings → Bookings → Time Slots tab
 * - Changes are automatically saved to database
 * - Settings are used by NewBookingModal for automatic end time calculation
 */
"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, CalendarDays, Save, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettingsManager } from "@/hooks/use-settings";
import { TimeSlot } from "@/types/settings";
import { toast } from "sonner";

const WEEKDAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const defaultTimeSlot: TimeSlot = {
  name: '',
  start_time: '09:00',
  end_time: '17:00',
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
};

interface TimeSlotRowProps {
  slot: TimeSlot;
  index: number;
  onUpdate: (updates: Partial<TimeSlot>) => void;
  onRemove: () => void;
  onToggleDay: (day: string) => void;
  errors: string[];
}

function TimeSlotRow({ slot, index, onUpdate, onRemove, onToggleDay, errors }: TimeSlotRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatTime = (time: string) => {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time;
    }
  };

  const getDaysDisplay = () => {
    const selectedCount = slot.days.length;
    
    if (selectedCount === 7) return 'Every day';
    if (selectedCount === 5 && !slot.days.includes('saturday') && !slot.days.includes('sunday')) return 'Weekdays';
    if (selectedCount === 2 && slot.days.includes('saturday') && slot.days.includes('sunday')) return 'Weekends';
    if (selectedCount <= 3) {
      return slot.days.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ');
    }
    return `${selectedCount} days`;
  };

  return (
    <div className={`border rounded-lg transition-all ${errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
      {/* Compact Row */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 h-6 w-6"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-900 truncate">
                {slot.name || `Time Slot ${index + 1}`}
              </span>
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                {getDaysDisplay()}
              </span>
            </div>
            {errors.length > 0 && (
              <p className="text-xs text-red-600 mt-1">{errors[0]}</p>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-6 w-6"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Name */}
            <div>
              <Label htmlFor={`slot-name-${index}`} className="text-sm font-medium">
                Name
              </Label>
              <Input
                id={`slot-name-${index}`}
                value={slot.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="e.g., Morning Session"
                className="mt-1"
              />
            </div>

            {/* Start Time */}
            <div>
              <Label htmlFor={`slot-start-${index}`} className="text-sm font-medium">
                Start Time
              </Label>
              <Input
                id={`slot-start-${index}`}
                type="time"
                value={slot.start_time}
                onChange={(e) => onUpdate({ start_time: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* End Time */}
            <div>
              <Label htmlFor={`slot-end-${index}`} className="text-sm font-medium">
                End Time
              </Label>
              <Input
                id={`slot-end-${index}`}
                type="time"
                value={slot.end_time}
                onChange={(e) => onUpdate({ end_time: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Days */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Available Days</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {WEEKDAYS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`slot-${index}-${day.value}`}
                    checked={slot.days.includes(day.value)}
                    onCheckedChange={() => onToggleDay(day.value)}
                  />
                  <Label
                    htmlFor={`slot-${index}-${day.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* All Validation Errors */}
          {errors.length > 0 && (
            <div className="text-sm text-red-600 space-y-1">
              {errors.map((error, errorIndex) => (
                <p key={errorIndex}>• {error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TimeSlotConfiguration() {
  const { 
    getSettingValue, 
    updateSettingValue, 
    isUpdating, 
    isLoading,
    settings
  } = useSettingsManager('bookings');

  const [customTimeSlots, setCustomTimeSlots] = useState<TimeSlot[]>([]);
  const [defaultDuration, setDefaultDuration] = useState<number>(2);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings when they become available or change
  useEffect(() => {
    if (!isLoading && settings) {
      const slots = getSettingValue('custom_time_slots', []);
      const duration = getSettingValue('default_booking_duration_hours', 2);
      
      setCustomTimeSlots(Array.isArray(slots) ? slots : []);
      setDefaultDuration(duration);
      setHasChanges(false); // Reset changes flag when loading fresh data
    }
  }, [isLoading, settings, getSettingValue]);

  const addTimeSlot = () => {
    const newSlot = { ...defaultTimeSlot, name: `Time Slot ${customTimeSlots.length + 1}` };
    setCustomTimeSlots([...customTimeSlots, newSlot]);
    setHasChanges(true);
  };

  const removeTimeSlot = (index: number) => {
    setCustomTimeSlots(customTimeSlots.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateTimeSlot = (index: number, updates: Partial<TimeSlot>) => {
    const updated = customTimeSlots.map((slot, i) => 
      i === index ? { ...slot, ...updates } : slot
    );
    setCustomTimeSlots(updated);
    setHasChanges(true);
  };

  const toggleDay = (slotIndex: number, day: string) => {
    const slot = customTimeSlots[slotIndex];
    const days = slot.days.includes(day)
      ? slot.days.filter(d => d !== day)
      : [...slot.days, day];
    updateTimeSlot(slotIndex, { days });
  };

  const handleDefaultDurationChange = (value: number) => {
    setDefaultDuration(value);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    try {
      await Promise.all([
        updateSettingValue('custom_time_slots', customTimeSlots),
        updateSettingValue('default_booking_duration_hours', defaultDuration),
      ]);
      
      // The settings should be automatically updated via the mutations,
      // but we'll reset the hasChanges flag
      setHasChanges(false);
      toast.success('Time slot settings saved successfully');
    } catch (error) {
      console.error('Error saving time slot settings:', error);
      toast.error('Failed to save time slot settings');
    }
  };

  const resetChanges = () => {
    const slots = getSettingValue('custom_time_slots', []);
    const duration = getSettingValue('default_booking_duration_hours', 2);
    
    setCustomTimeSlots(Array.isArray(slots) ? slots : []);
    setDefaultDuration(duration);
    setHasChanges(false);
  };

  const validateTimeSlot = (slot: TimeSlot): string[] => {
    const errors: string[] = [];
    if (!slot.name.trim()) errors.push('Name is required');
    if (!slot.start_time) errors.push('Start time is required');
    if (!slot.end_time) errors.push('End time is required');
    if (slot.days.length === 0) errors.push('At least one day must be selected');
    if (slot.start_time >= slot.end_time) errors.push('Start time must be before end time');
    return errors;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with save actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Time Slot Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure available booking time slots and default booking duration
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetChanges}
              disabled={isUpdating}
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={saveChanges}
              disabled={isUpdating}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Default Booking Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Default Booking Duration
          </CardTitle>
          <CardDescription>
            Set the default duration for new bookings. Users can still adjust this when creating bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="default-duration" className="text-sm font-medium">
              Default Duration (hours):
            </Label>
            <Input
              id="default-duration"
              type="number"
              min="0.5"
              max="12"
              step="0.5"
              value={defaultDuration}
              onChange={(e) => handleDefaultDurationChange(parseFloat(e.target.value) || 2)}
              className="w-24"
            />
            <span className="text-sm text-gray-500">
              ({defaultDuration} hour{defaultDuration !== 1 ? 's' : ''})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Custom Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Custom Time Slots
          </CardTitle>
          <CardDescription>
            Define specific time slots when bookings are available. Leave empty to allow bookings at any time during business hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customTimeSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarDays className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No custom time slots configured</p>
              <p className="text-xs mt-1">Bookings will be available at any time during business hours</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customTimeSlots.map((slot, index) => (
                <TimeSlotRow
                  key={index}
                  slot={slot}
                  index={index}
                  onUpdate={(updates) => updateTimeSlot(index, updates)}
                  onRemove={() => removeTimeSlot(index)}
                  onToggleDay={(day) => toggleDay(index, day)}
                  errors={validateTimeSlot(slot)}
                />
              ))}
            </div>
          )}

          <Button
            onClick={addTimeSlot}
            variant="outline"
            className="w-full border-dashed border-2 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Time Slot
          </Button>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How Time Slots Work</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Time slots define when bookings are available during the day</li>
          <li>• If no custom time slots are configured, bookings are available at any time</li>
          <li>• Users can only create bookings that fit within the defined time slots</li>
          <li>• Example: &quot;10:30-12:30&quot; and &quot;13:00-15:00&quot; allows bookings only during these periods</li>
          <li>• The default booking duration helps pre-fill the duration when creating new bookings</li>
        </ul>
      </div>
    </div>
  );
}
