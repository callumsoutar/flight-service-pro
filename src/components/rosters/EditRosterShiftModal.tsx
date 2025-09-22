'use client';

import React, { useState, useEffect } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit3, Trash2, RotateCcw, Calendar, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ScheduleShift } from "@/types/schedule";
import { UpdateRosterRuleRequest } from "@/types/roster";
import { UpdateShiftOverrideRequest, ShiftOverrideType } from "@/types/shift-overrides";
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

interface ShiftWithDetails extends ScheduleShift {
  effective_from?: string;
  effective_until?: string | null;
  is_active?: boolean;
}

interface EditRosterShiftModalProps {
  open: boolean;
  onClose: () => void;
  shift: ShiftWithDetails | null;
  instructor: Instructor | null;
  selectedDate: string;
  onShiftUpdated: () => void;
  onShiftDeleted: () => void;
}

export function EditRosterShiftModal({
  open,
  onClose,
  shift,
  instructor,
  selectedDate,
  onShiftUpdated,
  onShiftDeleted,
}: EditRosterShiftModalProps) {
  // Form state
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Override-specific state
  const [overrideType, setOverrideType] = useState<ShiftOverrideType>('add');

  // Recurring rule-specific state
  const [isActive, setIsActive] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);

  // Time slot options (15-minute intervals) - HH:MM format only
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeStr);
    }
  }

  // Reset form when modal opens with new shift data
  useEffect(() => {
    if (open && shift) {
      // Ensure we have valid times in HH:MM format only, fallback to defaults if needed
      const cleanStartTime = shift.start_time ? shift.start_time.slice(0, 5) : '09:00';
      const cleanEndTime = shift.end_time ? shift.end_time.slice(0, 5) : '17:00';

      const validStartTime = cleanStartTime.match(/^\d{2}:\d{2}$/) ? cleanStartTime : '09:00';
      const validEndTime = cleanEndTime.match(/^\d{2}:\d{2}$/) ? cleanEndTime : '17:00';

      // Force a small delay to ensure proper state update
      setTimeout(() => {
        setStartTime(validStartTime);
        setEndTime(validEndTime);
        setError(null);

        if (shift.type === 'regular') {
          // Cast shift to include roster rule properties
          const rosterShift = shift as ShiftWithDetails;
          
          setIsActive(rosterShift.is_active ?? true);
          setEffectiveFrom(rosterShift.effective_from || selectedDate);
          
          // Set hasEndDate and effectiveUntil based on existing data
          const hasExistingEndDate = rosterShift.effective_until !== null && rosterShift.effective_until !== undefined;
          setHasEndDate(hasExistingEndDate);
          setEffectiveUntil(hasExistingEndDate ? (rosterShift.effective_until || '') : '');
        } else {
          setOverrideType(shift.type as ShiftOverrideType);
        }
      }, 0);

      console.log('Modal opened with shift:', {
        id: shift.id,
        type: shift.type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        validStartTime,
        validEndTime,
        effective_from: shift.effective_from,
        effective_until: shift.effective_until,
        is_active: shift.is_active,
        hasExistingEndDate: shift.effective_until !== null && shift.effective_until !== undefined
      });
    }
    if (!open) {
      // Reset form
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [open, shift, selectedDate]);

  const validateForm = () => {
    if (!shift || !instructor) return 'Invalid shift or instructor';
    if (shift.type !== 'cancel' && (!startTime || !endTime)) return 'Start and end times are required';
    if (shift.type !== 'cancel' && startTime >= endTime) return 'End time must be after start time';

    if (shift.type === 'regular') {
      if (!effectiveFrom) return 'Effective from date is required';
      if (hasEndDate && !effectiveUntil) return 'Effective until date is required when end date is enabled';
      if (hasEndDate && effectiveUntil && effectiveUntil <= effectiveFrom) {
        return 'Effective until date must be after effective from date';
      }
    }

    return null;
  };

  const handleUpdate = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!shift || !instructor) return;

    setLoading(true);
    setError(null);

    try {
      if (shift.type === 'regular') {
        // Update roster rule
        const updateData: UpdateRosterRuleRequest = {
          start_time: startTime,
          end_time: endTime,
          is_active: isActive,
          effective_from: effectiveFrom,
          effective_until: hasEndDate ? effectiveUntil : null,
          notes: null,
        };

        const response = await fetch(`/api/roster-rules/${shift.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update roster rule');
        }
      } else {
        // Update shift override
        const updateData: UpdateShiftOverrideRequest = {
          override_type: overrideType,
          start_time: overrideType !== 'cancel' ? startTime : null,
          end_time: overrideType !== 'cancel' ? endTime : null,
          notes: null,
        };

        const response = await fetch(`/api/shift-overrides/${shift.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update shift override');
        }
      }

      onShiftUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!shift) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = shift.type === 'regular'
        ? `/api/roster-rules/${shift.id}`
        : `/api/shift-overrides/${shift.id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete shift');
      }

      onShiftDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!shift || !instructor) return null;

  const dayOfWeek = new Date(selectedDate).getDay();
  const dayName = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0" key={shift?.id || 'no-shift'}>
        {/* Header Section */}
        <div className="p-5 pb-3 border-b border-gray-200">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-3 text-lg">
              {shift.type === 'regular' ? (
                <>
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <RotateCcw className="w-4 h-4 text-blue-600" />
                  </div>
                  Edit Recurring Schedule
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  Edit One-off Assignment
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Editing {shift.type === 'regular' ? 'recurring' : 'one-off'} shift for <span className="font-semibold text-gray-900">{instructor.name}</span>
              {shift.type === 'regular' ? ` on ${dayName}s` : ` on ${format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}`}
            </DialogDescription>
          </DialogHeader>

          {/* Enhanced Shift Type Indicator */}
          <div className={`mt-3 p-3 rounded-lg border ${
            shift.type === 'regular'
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200'
              : 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {shift.type === 'regular' ? (
                  <>
                    <RotateCcw className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900 text-sm">Recurring Schedule</p>
                      <p className="text-xs text-blue-700">Every {dayName}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900 text-sm">One-off Assignment</p>
                      <p className="text-xs text-green-700">{format(new Date(selectedDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 space-y-4">
          {/* Override Type Selection (for non-regular shifts) */}
          {shift.type !== 'regular' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Label className="text-sm font-semibold text-gray-900">Assignment Type</Label>
              </div>
              <Select value={overrideType} onValueChange={(value: ShiftOverrideType) => setOverrideType(value)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Extra Shift</SelectItem>
                  <SelectItem value="replace">Replace Existing Shift</SelectItem>
                  <SelectItem value="cancel">Cancel Availability</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Selection */}
          {(shift.type === 'regular' || overrideType !== 'cancel') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <Label className="text-sm font-semibold text-gray-900">Schedule Times</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-xs font-medium text-gray-700">Start Time</Label>
                  <Select value={startTime} onValueChange={setStartTime} key={`start-${shift?.id}`}>
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
                  <Select value={endTime} onValueChange={setEndTime} key={`end-${shift?.id}`}>
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

          {/* Recurring Rule Options */}
          {shift.type === 'regular' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <Label className="text-sm font-semibold text-gray-900">Recurring Settings</Label>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-100">
                    <div className="space-y-0">
                      <Label htmlFor="isActive" className="text-sm font-medium text-gray-900">Active Schedule</Label>
                      <p className="text-xs text-gray-600">Enable or disable this recurring schedule</p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-100">
                      <div className="space-y-0">
                        <Label htmlFor="hasEndDate" className="text-sm font-medium text-gray-900">Set End Date</Label>
                        <p className="text-xs text-gray-600">Optional expiry date</p>
                      </div>
                      <Switch
                        id="hasEndDate"
                        checked={hasEndDate}
                        onCheckedChange={setHasEndDate}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="effectiveFrom" className="text-sm font-medium text-gray-700">Effective From</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={
                                "w-full h-9 justify-start text-left font-normal text-sm " +
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
                        <div className="space-y-2">
                          <Label htmlFor="effectiveUntil" className="text-sm font-medium text-gray-700">Effective Until</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={
                                  "w-full h-9 justify-start text-left font-normal text-sm " +
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

        {/* Footer Section */}
        <div className="p-4 pt-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading} className="h-9 text-sm">
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete {shift.type === 'regular' ? 'Schedule' : 'Assignment'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {shift.type === 'regular' ? 'Recurring Schedule' : 'Assignment'}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the {shift.type === 'regular' ? 'recurring schedule' : 'assignment'} for {instructor.name}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={loading}>
                    {loading ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading} className="h-9 px-4 text-sm">
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={loading} className="h-9 px-6 text-sm">
                <Edit3 className="w-3 h-3 mr-2" />
                {loading ? 'Updating...' : 'Update Schedule'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}