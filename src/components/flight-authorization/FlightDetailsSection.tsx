"use client";
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Navigation } from "lucide-react";
import { FlightAuthorizationEditData } from '@/lib/validations/flight-authorization';
import { purposeOfFlightOptions } from '@/lib/validations/flight-authorization';
import { PassengerNamesInput } from './PassengerNamesInput';

interface FlightDetailsSectionProps {
  control: Control<FlightAuthorizationEditData>;
  disabled?: boolean;
}

export function FlightDetailsSection({ 
  control, 
  disabled = false
}: FlightDetailsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-blue-600" />
          Flight Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Row 1: Purpose of Flight and Runway in Use */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Purpose of Flight */}
          <div className="space-y-2">
            <Label htmlFor="purpose_of_flight" className="text-sm font-medium">
              Purpose of Flight *
            </Label>
            <Controller
              name="purpose_of_flight"
              control={control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger className={`w-full ${fieldState.error ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select purpose of flight" />
                    </SelectTrigger>
                    <SelectContent>
                      {purposeOfFlightOptions.map((purpose) => (
                        <SelectItem key={purpose} value={purpose}>
                          {purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>

          {/* Runway in Use */}
          <div className="space-y-2">
            <Label htmlFor="runway_in_use" className="text-sm font-medium flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Runway in Use *
            </Label>
            <Controller
              name="runway_in_use"
              control={control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <Input
                    placeholder="e.g., 16L/34R"
                    disabled={disabled}
                    {...field}
                    className={fieldState.error ? 'border-red-500' : ''}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {/* Row 2: Passenger Names (dynamic list) */}
        <PassengerNamesInput
          control={control}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}
