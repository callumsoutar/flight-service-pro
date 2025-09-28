"use client";
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import { FlightAuthorizationEditData } from '@/lib/validations/flight-authorization';
import { paymentMethodOptions } from '@/lib/validations/flight-authorization';

interface PaymentSectionProps {
  control: Control<FlightAuthorizationEditData>;
  disabled?: boolean;
  flightDate?: string;
}

export function PaymentSection({ control, disabled = false }: PaymentSectionProps) {
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
      <CardContent className="space-y-4">
        <div className="w-1/2">
          <Label htmlFor="payment_method" className="text-sm font-medium">
            Payment Method *
          </Label>
          <Controller
            name="payment_method"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-1 mt-2">
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger className={`h-10 w-full ${fieldState.error ? 'border-red-500' : 'border-gray-300'}`}>
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
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
