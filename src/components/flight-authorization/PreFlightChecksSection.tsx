"use client";
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle, CloudSun, AlertTriangle } from "lucide-react";
import { FlightAuthorizationEditData } from '@/lib/validations/flight-authorization';

interface PreFlightChecksSectionProps {
  control: Control<FlightAuthorizationEditData>;
  disabled?: boolean;
}

export function PreFlightChecksSection({ control, disabled = false }: PreFlightChecksSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Pre-flight Checks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Checks */}
        <div className="space-y-4">
          {/* NOTAMs Reviewed */}
          <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Controller
              name="notams_reviewed"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex items-start space-x-3 w-full">
                  <Checkbox
                    id="notams_reviewed"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                    className={fieldState.error ? 'border-red-500' : ''}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="notams_reviewed"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      NOTAMs Reviewed *
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      I have reviewed all current NOTAMs (Notice to Airmen) relevant to this flight
                    </p>
                    {fieldState.error && (
                      <p className="text-xs text-red-600 mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                </div>
              )}
            />
          </div>

          {/* Weather Briefing Complete */}
          <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Controller
              name="weather_briefing_complete"
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex items-start space-x-3 w-full">
                  <Checkbox
                    id="weather_briefing_complete"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                    className={fieldState.error ? 'border-red-500' : ''}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="weather_briefing_complete"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <CloudSun className="w-4 h-4 text-blue-600" />
                      Weather Briefing Complete *
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      I have obtained and reviewed a complete weather briefing for this flight
                    </p>
                    {fieldState.error && (
                      <p className="text-xs text-red-600 mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
