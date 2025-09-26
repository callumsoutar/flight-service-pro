"use client";

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettingsManager } from '@/hooks/use-settings';
import { Shield, Info } from 'lucide-react';

export default function FlightAuthorizationSettings() {
  const {
    getSettingValue,
    updateSettingValue,
    isUpdating,
    isLoading
  } = useSettingsManager('bookings');

  // Get current setting value with fallback to true (enabled by default)
  const requireFlightAuthorization = getSettingValue('require_flight_authorization_for_solo', true);
  
  const [localValue, setLocalValue] = useState(requireFlightAuthorization);

  const handleToggleChange = (checked: boolean) => {
    setLocalValue(checked);
  };

  const handleSave = async () => {
    try {
      await updateSettingValue('require_flight_authorization_for_solo', localValue);
    } catch (error) {
      console.error('Failed to update flight authorization setting:', error);
      // Reset to previous value on error
      setLocalValue(requireFlightAuthorization);
    }
  };

  const hasChanges = localValue !== requireFlightAuthorization;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading flight authorization settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Flight Authorization for Solo Flights
          </CardTitle>
          <CardDescription>
            Configure whether solo flights require flight authorization before checkout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="flight-auth-toggle" className="text-base font-medium">
                Require Flight Authorization for Solo Bookings
              </Label>
              <p className="text-sm text-gray-600">
                When enabled, solo flights must complete the flight authorization process before checkout
              </p>
            </div>
            <Switch
              id="flight-auth-toggle"
              checked={localValue}
              onCheckedChange={handleToggleChange}
              disabled={isUpdating}
            />
          </div>

          <div className="border-t border-gray-200"></div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">How this works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>When enabled:</strong> Solo flights will show flight authorization options in the &quot;Check Flight Out&quot; button</li>
                  <li>• <strong>When disabled:</strong> Solo flights behave like regular flights with no authorization requirements</li>
                  <li>• This setting only affects solo flights (dual flights are unaffected)</li>
                  <li>• Instructors and admins can always override authorization requirements if needed</li>
                </ul>
              </div>
            </div>
          </div>

          {hasChanges && (
            <>
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setLocalValue(requireFlightAuthorization)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
