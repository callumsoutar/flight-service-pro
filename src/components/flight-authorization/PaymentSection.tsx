"use client";
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CreditCard, Calendar } from "lucide-react";
import { FlightAuthorizationFormData } from '@/lib/validations/flight-authorization';
import { paymentMethodOptions } from '@/lib/validations/flight-authorization';

interface PaymentSectionProps {
  control: Control<FlightAuthorizationFormData>;
  disabled?: boolean;
  flightDate?: string;
}

export function PaymentSection({ control, disabled = false, flightDate }: PaymentSectionProps) {
  // Format payment method labels
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'account':
        return 'Account Balance';
      case 'credit':
        return 'Credit Card';
      case 'debit':
        return 'Debit Card';
      case 'cash':
        return 'Cash';
      case 'eftpos':
        return 'EFTPOS';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment_method" className="text-sm font-medium">
              Payment Method *
            </Label>
            <Controller
              name="payment_method"
              control={control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger className={fieldState.error ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((method) => (
                        <SelectItem key={method} value={method}>
                          {formatPaymentMethod(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Select your preferred payment method for this flight
                  </p>
                </div>
              )}
            />
          </div>

          {/* Flight Date (Read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <div className="p-3 bg-gray-50 border rounded-md">
              <p className="text-sm font-medium text-gray-900">
                {flightDate ? new Date(flightDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'TBD'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Information Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            Payment Processing
          </h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              Payment will be processed after the flight is completed and logged.
            </p>
            <ul className="space-y-1 ml-4">
              <li>• Charges will be calculated based on actual flight time</li>
              <li>• Account balance payments are processed automatically</li>
              <li>• Card payments require approval at check-in</li>
              <li>• Cash payments must be made at the front desk</li>
            </ul>
          </div>
        </div>

        {/* Account Balance Info (if applicable) */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 mb-2">
            Account Balance Payment
          </h4>
          <p className="text-sm text-green-800">
            If you select &quot;Account Balance&quot;, charges will be automatically deducted from your 
            account after the flight. Please ensure you have sufficient funds available.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
