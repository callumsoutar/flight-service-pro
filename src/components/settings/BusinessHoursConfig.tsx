"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useGeneralSettings } from '@/contexts/SettingsContext';
import { useUpdateSetting } from '@/hooks/use-settings';
import { formatTimeForDisplay } from '@/types/business_hours';

// Generate time options for dropdowns (30-minute intervals)
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = formatTimeForDisplay(timeString);
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

export default function BusinessHoursConfig() {
  const generalSettings = useGeneralSettings();
  const updateMutation = useUpdateSetting();

  // Extract business hours from general settings
  const businessHours = React.useMemo(() => ({
    open_time: generalSettings.business_open_time || '09:00:00',
    close_time: generalSettings.business_close_time || '17:00:00',
    is_24_hours: generalSettings.business_is_24_hours || false,
    is_closed: generalSettings.business_is_closed || false,
  }), [generalSettings]);

  const isLoading = !generalSettings;
  const error = null; // Settings context handles errors

  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('17:00');
  const [isClosed, setIsClosed] = useState(false);
  const [is24Hours, setIs24Hours] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const timeOptions = generateTimeOptions();

  // Initialize state based on current business hours
  useEffect(() => {
    setOpenTime(businessHours.open_time.substring(0, 5));
    setCloseTime(businessHours.close_time.substring(0, 5));
    setIsClosed(businessHours.is_closed);
    setIs24Hours(businessHours.is_24_hours);
    setHasChanges(false);
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
      await Promise.all([
        updateMutation.mutateAsync({
          category: 'general',
          key: 'business_open_time',
          setting_value: openTime.length === 5 ? `${openTime}:00` : openTime,
        }),
        updateMutation.mutateAsync({
          category: 'general',
          key: 'business_close_time',
          setting_value: closeTime.length === 5 ? `${closeTime}:00` : closeTime,
        }),
        updateMutation.mutateAsync({
          category: 'general',
          key: 'business_is_24_hours',
          setting_value: is24Hours,
        }),
        updateMutation.mutateAsync({
          category: 'general',
          key: 'business_is_closed',
          setting_value: isClosed,
        }),
      ]);
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
        <span>Error loading business hours</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Business Hours</h3>

      {/* Business Status Options */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="businessStatus"
            checked={!isClosed && !is24Hours}
            onChange={() => {
              handleTimeChange('isClosed', false);
              handleTimeChange('is24Hours', false);
            }}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">Regular hours</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="businessStatus"
            checked={is24Hours && !isClosed}
            onChange={() => {
              handleTimeChange('is24Hours', true);
              handleTimeChange('isClosed', false);
            }}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">24/7 operations</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="businessStatus"
            checked={isClosed}
            onChange={() => {
              handleTimeChange('isClosed', true);
              handleTimeChange('is24Hours', false);
            }}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">Closed</span>
        </label>
      </div>

      {/* Time Selection - Only show if not closed or 24/7 */}
      {!isClosed && !is24Hours && (
        <div className="flex gap-4">
          <div className="w-56">
            <Label htmlFor="openTime">Opening Time</Label>
            <Select
              value={openTime}
              onValueChange={(value) => handleTimeChange('openTime', value)}
            >
              <SelectTrigger>
                <SelectValue />
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

          <div className="w-56">
            <Label htmlFor="closeTime">Closing Time</Label>
            <Select
              value={closeTime}
              onValueChange={(value) => handleTimeChange('closeTime', value)}
            >
              <SelectTrigger>
                <SelectValue />
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

      {/* Save Button */}
      {hasChanges && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}