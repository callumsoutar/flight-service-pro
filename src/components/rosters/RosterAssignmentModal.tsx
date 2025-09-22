'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Repeat, Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { CreateRosterRuleRequest } from "@/types/roster";
import { CreateShiftOverrideRequest, ShiftOverrideType } from "@/types/shift-overrides";
import { DAYS_OF_WEEK } from "@/types/roster";

interface Instructor {
  id: string;
  user_id: string;
  name: string;
  endorsements: string;
  instructor_category?: {
    id: string;
    name: string;
    description: string | null;
    country: string;
  } | null;
}

interface RosterAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  instructor: Instructor | null;
  selectedDay: string;
  selectedTimeSlot: string | null;
  onAssignmentCreated: () => void;
}

type AssignmentType = 'one-off' | 'recurring';

export function RosterAssignmentModal({
  open,
  onClose,
  instructor,
  selectedDay,
  selectedTimeSlot,
  onAssignmentCreated,
}: RosterAssignmentModalProps) {
  // Form state
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('one-off');
  const [overrideType, setOverrideType] = useState<ShiftOverrideType>('add');
  const [startTime, setStartTime] = useState(selectedTimeSlot || '09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recurring schedule state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState(selectedDay || format(new Date(), 'yyyy-MM-dd'));
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open && selectedTimeSlot) {
      setStartTime(selectedTimeSlot);
      // Auto-set end time to 8 hours later
      const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
      const endHour = Math.min(hours + 8, 22); // Don't go past 10 PM
      setEndTime(`${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
    if (open && selectedDay) {
      setEffectiveFrom(selectedDay);
      // Set the day of week for recurring assignments
      const dayOfWeek = new Date(selectedDay).getDay();
      setSelectedDays([dayOfWeek]);
    }
    if (!open) {
      // Reset form
      setAssignmentType('one-off');
      setOverrideType('add');
      setError(null);
      setSelectedDays([]);
      setEffectiveUntil('');
      setHasEndDate(false);
    }
  }, [open, selectedTimeSlot, selectedDay]);

  // Time slot options (15-minute intervals)
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeStr);
    }
  }

  const handleDayToggle = (dayValue: number) => {
    setSelectedDays(prev =>
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const validateForm = () => {
    if (!instructor) return 'No instructor selected';
    if (!startTime || !endTime) return 'Start and end times are required';
    if (startTime >= endTime) return 'End time must be after start time';

    if (assignmentType === 'one-off') {
      if (!selectedDay) return 'Date is required for one-off assignments';
    } else {
      if (selectedDays.length === 0) return 'At least one day must be selected for recurring assignments';
      if (!effectiveFrom) return 'Effective from date is required';
      if (hasEndDate && !effectiveUntil) return 'Effective until date is required when end date is enabled';
      if (hasEndDate && effectiveUntil && effectiveUntil <= effectiveFrom) {
        return 'Effective until date must be after effective from date';
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!instructor) return;

    setLoading(true);
    setError(null);

    try {
      if (assignmentType === 'one-off') {
        // Create shift override
        const overrideData: CreateShiftOverrideRequest = {
          instructor_id: instructor.id,
          override_date: selectedDay,
          override_type: overrideType,
          start_time: overrideType !== 'cancel' ? startTime : null,
          end_time: overrideType !== 'cancel' ? endTime : null,
          notes: null,
        };

        const response = await fetch('/api/shift-overrides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(overrideData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create shift override');
        }
      } else {
        // Create roster rules for each selected day
        const rulePromises = selectedDays.map(dayOfWeek => {
          const ruleData: CreateRosterRuleRequest = {
            instructor_id: instructor.id,
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            effective_from: effectiveFrom,
            effective_until: hasEndDate ? effectiveUntil || null : null,
            notes: null,
          };

          return fetch('/api/roster-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ruleData),
          });
        });

        const responses = await Promise.all(rulePromises);

        // Check if any failed
        for (const response of responses) {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create roster rule');
          }
        }
      }

      onAssignmentCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!instructor) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col p-0">
        {/* Header Section - Fixed */}
        <div className="flex-shrink-0 p-5 pb-3 border-b border-gray-200">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                <Plus className="w-4 h-4 text-green-600" />
              </div>
              Create Roster Assignment
            </DialogTitle>
            <DialogDescription className="text-sm">
              Creating assignment for <span className="font-semibold text-gray-900">{instructor.name}</span> on {format(new Date(selectedDay), 'EEEE, MMMM dd, yyyy')}
              {selectedTimeSlot && ` starting at ${selectedTimeSlot}`}
            </DialogDescription>
          </DialogHeader>

          {/* Assignment Type Indicator */}
          <div className={`mt-3 p-3 rounded-lg border ${
            assignmentType === 'one-off'
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200'
              : 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {assignmentType === 'one-off' ? (
                  <>
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900 text-sm">One-off Assignment</p>
                      <p className="text-xs text-blue-700">{format(new Date(selectedDay), 'MMM dd, yyyy')}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Repeat className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900 text-sm">Recurring Schedule</p>
                      <p className="text-xs text-green-700">Multiple days</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {/* Assignment Type Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <Label className="text-sm font-semibold text-gray-900">Assignment Type</Label>
            </div>
            <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="one-off"
                    checked={assignmentType === 'one-off'}
                    onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">One-off Assignment</span>
                  </div>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="recurring"
                    checked={assignmentType === 'recurring'}
                    onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    <span className="text-sm font-medium">Recurring Schedule</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* One-off Assignment Options */}
          {assignmentType === 'one-off' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Label className="text-sm font-semibold text-gray-900">Assignment Options</Label>
              </div>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Override Type</Label>
                  <Select value={overrideType} onValueChange={(value: ShiftOverrideType) => setOverrideType(value)}>
                    <SelectTrigger className="h-11 text-sm bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add Extra Shift</SelectItem>
                      <SelectItem value="replace">Replace Existing Shift</SelectItem>
                      <SelectItem value="cancel">Cancel Availability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Recurring Assignment Options */}
          {assignmentType === 'recurring' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <Label className="text-sm font-semibold text-gray-900">Recurring Settings</Label>
              </div>
              
              {/* Days of Week */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">Days of Week</Label>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { value: 1, label: 'MON' },
                    { value: 2, label: 'TUE' },
                    { value: 3, label: 'WED' },
                    { value: 4, label: 'THU' },
                    { value: 5, label: 'FRI' },
                    { value: 6, label: 'SAT' },
                    { value: 0, label: 'SUN' }
                  ].map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayToggle(day.value)}
                      className={`px-3 py-2 rounded-md text-xs font-medium transition-colors border ${
                        selectedDays.includes(day.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Times */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">Schedule Times</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="startTime" className="text-xs font-medium text-gray-600">Start Time</Label>
                    <Select value={startTime} onValueChange={setStartTime} key={`start-recurring`}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue>{startTime}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="endTime" className="text-xs font-medium text-gray-600">End Time</Label>
                    <Select value={endTime} onValueChange={setEndTime} key={`end-recurring`}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue>{endTime}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-900">Date Range</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Set end date</span>
                    <Switch
                      id="hasEndDate"
                      checked={hasEndDate}
                      onCheckedChange={setHasEndDate}
                    />
                  </div>
                </div>

                <div className={`grid gap-3 ${hasEndDate ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="space-y-1">
                    <Label htmlFor="effectiveFrom" className="text-xs font-medium text-gray-600">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={
                            "w-full h-10 justify-start text-left font-normal text-sm " +
                            (!effectiveFrom ? "text-muted-foreground" : "")
                          }
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {effectiveFrom ? format(new Date(effectiveFrom), "dd MMM yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={effectiveFrom ? new Date(effectiveFrom) : undefined}
                          onSelect={(date) => setEffectiveFrom(date ? format(date, 'yyyy-MM-dd') : '')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {hasEndDate && (
                    <div className="space-y-1">
                      <Label htmlFor="effectiveUntil" className="text-xs font-medium text-gray-600">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={
                              "w-full h-10 justify-start text-left font-normal text-sm " +
                              (!effectiveUntil ? "text-muted-foreground" : "")
                            }
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {effectiveUntil ? format(new Date(effectiveUntil), "dd MMM yyyy") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={effectiveUntil ? new Date(effectiveUntil) : undefined}
                            onSelect={(date) => setEffectiveUntil(date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Time Selection for One-off */}
          {assignmentType === 'one-off' && overrideType !== 'cancel' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <Label className="text-sm font-semibold text-gray-900">Schedule Times</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-xs font-medium text-gray-700">Start Time</Label>
                  <Select value={startTime} onValueChange={setStartTime} key={`start-oneoff`}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue>{startTime}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-xs font-medium text-gray-700">End Time</Label>
                  <Select value={endTime} onValueChange={setEndTime} key={`end-oneoff`}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue>{endTime}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}


          {/* Selected Days Preview for Recurring */}
          {assignmentType === 'recurring' && selectedDays.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <Label className="text-sm font-semibold text-gray-900">Preview</Label>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-2 mb-3">
                  {selectedDays.map((dayValue) => {
                    const day = DAYS_OF_WEEK.find(d => d.value === dayValue);
                    return (
                      <div key={dayValue} className="flex items-center justify-between p-2 bg-white rounded text-xs">
                        <span className="font-medium text-blue-900">{day?.label}</span>
                        <span className="text-blue-700">{startTime} - {endTime}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-600 border-t border-blue-200 pt-2">
                  From {format(new Date(effectiveFrom), 'MMM dd, yyyy')}
                  {hasEndDate && effectiveUntil && ` until ${format(new Date(effectiveUntil), 'MMM dd, yyyy')}`}
                  {!hasEndDate && ' (ongoing)'}
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <p className="text-red-800 font-medium text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Section - Fixed */}
        <div className="flex-shrink-0 p-4 pt-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className="h-9 px-4 text-sm">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-9 px-6 text-sm">
              <Plus className="w-3 h-3 mr-2" />
              {loading ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}