"use client";
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fuel } from "lucide-react";
import { FlightAuthorizationFormData } from '@/lib/validations/flight-authorization';

interface FuelAndOilSectionProps {
  control: Control<FlightAuthorizationFormData>;
  disabled?: boolean;
}

export function FuelAndOilSection({ control, disabled = false }: FuelAndOilSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-orange-600" />
          Fuel and Oil Levels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fuel Level */}
          <div className="space-y-2">
            <Label htmlFor="fuel_level_liters" className="text-sm font-medium">
              Fuel Level *
            </Label>
            <Controller
              name="fuel_level_liters"
              control={control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      placeholder="Amount"
                      disabled={disabled}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className={`pr-16 ${fieldState.error ? 'border-red-500' : ''}`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-sm text-gray-500 font-medium">Liters</span>
                    </div>
                  </div>
                  {fieldState.error && (
                    <p className="text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Enter current fuel level in liters
                  </p>
                </div>
              )}
            />
          </div>

          {/* Oil Level */}
          <div className="space-y-2">
            <Label htmlFor="oil_level_quarts" className="text-sm font-medium">
              Oil Level *
            </Label>
            <Controller
              name="oil_level_quarts"
              control={control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      placeholder="Amount"
                      disabled={disabled}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className={`pr-16 ${fieldState.error ? 'border-red-500' : ''}`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-sm text-gray-500 font-medium">Quarts</span>
                    </div>
                  </div>
                  {fieldState.error && (
                    <p className="text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Enter current oil level in quarts
                  </p>
                </div>
              )}
            />
          </div>
        </div>

        {/* Fuel and Oil Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            Pre-flight Guidelines
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Check fuel quantity and quality during pre-flight inspection</li>
            <li>• Verify oil level is within operating limits</li>
            <li>• Ensure fuel caps are secure and properly sealed</li>
            <li>• Document any discrepancies or concerns</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
