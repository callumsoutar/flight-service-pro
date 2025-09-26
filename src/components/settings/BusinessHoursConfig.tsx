"use client";

import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useBusinessHours, useUpdateBusinessHours } from '@/hooks/use-business-hours';
import { formatTimeForDisplay } from '@/types/business_hours';

// Generate time options for dropdowns (15-minute intervals)
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = formatTimeForDisplay(timeString);
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

export default function BusinessHoursConfig() {
  const { data: businessHours, isLoading, error } = useBusinessHours();
  const updateMutation = useUpdateBusinessHours();

  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('17:00');
  const [isClosed, setIsClosed] = useState(false);
  const [is24Hours, setIs24Hours] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const timeOptions = generateTimeOptions();

  // Initialize state based on current business hours
  useEffect(() => {
    if (businessHours) {
      setOpenTime(businessHours.open_time.substring(0, 5));
      setCloseTime(businessHours.close_time.substring(0, 5));
      setIsClosed(businessHours.is_closed);
      setIs24Hours(businessHours.is_24_hours);
      setHasChanges(false);
    }
  }, [businessHours]);

  const handleTimeChange = (field: string, value: string | boolean) => {
    if (field === 'openTime') setOpenTime(value as string);
    if (field === 'closeTime') setCloseTime(value as string);
    if (field === 'isClosed') setIsClosed(value as boolean);
    if (field === 'is24Hours') setIs24Hours(value as boolean);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        open_time: openTime,
        close_time: closeTime,
        is_24_hours: is24Hours,
        is_closed: isClosed,
      });
      setHasChanges(false);
      toast.success('Business hours updated successfully');
    } catch (error) {
      console.error('Error updating business hours:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update business hours');
    }
  };

  const handleReset = () => {
    if (businessHours) {
      setOpenTime(businessHours.open_time.substring(0, 5));
      setCloseTime(businessHours.close_time.substring(0, 5));
      setIsClosed(businessHours.is_closed);
      setIs24Hours(businessHours.is_24_hours);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading business hours...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>Error loading business hours: {error.message}</span>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Business Hours</h3>
      </div>

      <div className="space-y-6">
        {/* Business Status Options */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Business Status
          </Label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="businessStatus"
                checked={!isClosed && !is24Hours}
                onChange={() => {
                  handleTimeChange('isClosed', false);
                  handleTimeChange('is24Hours', false);
                }}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Regular hours</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="businessStatus"
                checked={is24Hours && !isClosed}
                onChange={() => {
                  handleTimeChange('is24Hours', true);
                  handleTimeChange('isClosed', false);
                }}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">24/7 operations</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="businessStatus"
                checked={isClosed}
                onChange={() => {
                  handleTimeChange('isClosed', true);
                  handleTimeChange('is24Hours', false);
                }}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Closed</span>
            </label>
          </div>
        </div>

        {/* Time Selection - Only show if not closed or 24/7 */}
        {!isClosed && !is24Hours && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="openTime">Opening Time</Label>
              <Select
                value={openTime}
                onValueChange={(value) => handleTimeChange('openTime', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select opening time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="closeTime">Closing Time</Label>
              <Select
                value={closeTime}
                onValueChange={(value) => handleTimeChange('closeTime', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select closing time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Current Selection Display */}
        <div className="p-3 bg-gray-50 rounded-md border">
          <div className="text-sm font-medium text-gray-900 mb-1">Current Selection:</div>
          <div className="text-sm text-gray-600">
            {isClosed ? (
              <span className="text-red-600 font-medium">Business is closed</span>
            ) : is24Hours ? (
              <span className="text-green-600 font-medium">Open 24 hours a day, 7 days a week</span>
            ) : (
              <span>
                Open <span className="font-medium text-blue-600">
                  {formatTimeForDisplay(openTime)} - {formatTimeForDisplay(closeTime)}
                </span> every day
              </span>
            )}
          </div>
        </div>

        {/* Save/Reset Actions */}
        {hasChanges && (
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">You have unsaved changes</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={updateMutation.isPending}
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {!hasChanges && businessHours && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Business hours are up to date</span>
          </div>
        )}
      </div>
    </div>
  );
}