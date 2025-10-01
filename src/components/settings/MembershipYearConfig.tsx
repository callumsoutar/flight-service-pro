'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MembershipYearConfig as MembershipYearConfigType } from '@/types/settings';
import { useSettingsManager } from '@/hooks/use-settings';
import {
  formatMembershipYear,
  getMembershipYearLabel,
  validateMembershipYearConfig,
  calculateDefaultMembershipExpiry
} from '@/lib/membership-year-utils';

// Form validation schema
const membershipYearSchema = z.object({
  start_month: z.number().min(1).max(12),
  start_day: z.number().min(1).max(31),
  end_month: z.number().min(1).max(12),
  end_day: z.number().min(1).max(31),
  description: z.string().optional(),
}).refine((data) => {
  // Validate that the dates are valid for their months
  // Use a leap year (2024) for validation to ensure February 29th is always valid
  const leapYear = 2024;
  const startDate = new Date(leapYear, data.start_month - 1, data.start_day);
  const endDate = new Date(leapYear, data.end_month - 1, data.end_day);
  
  return startDate.getMonth() === data.start_month - 1 && 
         startDate.getDate() === data.start_day &&
         endDate.getMonth() === data.end_month - 1 && 
         endDate.getDate() === data.end_day;
}, {
  message: "Invalid date - day does not exist in the specified month",
  path: ["start_day"] // This will show the error on the start_day field
});

type MembershipYearFormData = z.infer<typeof membershipYearSchema>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MembershipYearConfigProps {}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function MembershipYearConfig({}: MembershipYearConfigProps) {
  const [previewConfig, setPreviewConfig] = useState<MembershipYearConfigType | null>(null);
  
  // Use the settings manager to fetch and update membership year configuration
  const { 
    getSettingValue, 
    updateSettingValue, 
    isLoading: settingsLoading 
  } = useSettingsManager('memberships');
  
  const initialConfig = getSettingValue('membership_year') as MembershipYearConfigType | undefined;

  const form = useForm<MembershipYearFormData>({
    resolver: zodResolver(membershipYearSchema),
    defaultValues: {
      start_month: initialConfig?.start_month ?? 4,
      start_day: initialConfig?.start_day ?? 1,
      end_month: initialConfig?.end_month ?? 3,
      end_day: initialConfig?.end_day ?? 31,
      description: initialConfig?.description ?? 'Membership year runs from April 1st to March 31st',
    },
  });

  // Watch individual fields to avoid creating new object references on every render
  const startMonth = form.watch('start_month');
  const startDay = form.watch('start_day');
  const endMonth = form.watch('end_month');
  const endDay = form.watch('end_day');
  const description = form.watch('description');

  // Stable watched values object using useMemo
  const watchedValues = useMemo(() => ({
    start_month: startMonth,
    start_day: startDay,
    end_month: endMonth,
    end_day: endDay,
    description: description,
  }), [startMonth, startDay, endMonth, endDay, description]);

  // Update preview when form values change
  useEffect(() => {
    const config: MembershipYearConfigType = {
      start_month: watchedValues.start_month,
      start_day: watchedValues.start_day,
      end_month: watchedValues.end_month,
      end_day: watchedValues.end_day,
      description: watchedValues.description || '',
    };

    const validation = validateMembershipYearConfig(config);
    if (validation.isValid) {
      setPreviewConfig(config);
    } else {
      setPreviewConfig(null);
    }
  }, [watchedValues.start_month, watchedValues.start_day, watchedValues.end_month, watchedValues.end_day, watchedValues.description]);

  // Update form when initial config loads - use ref to track if we've already reset
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (initialConfig && !hasInitialized && !form.formState.isDirty) {
      form.reset({
        start_month: initialConfig.start_month,
        start_day: initialConfig.start_day,
        end_month: initialConfig.end_month,
        end_day: initialConfig.end_day,
        description: initialConfig.description || '',
      });
      setHasInitialized(true);
    }
  }, [initialConfig, hasInitialized, form.formState.isDirty, form]);

  const onSubmit = useCallback(async (data: MembershipYearFormData) => {
    try {
      const config: MembershipYearConfigType = {
        start_month: data.start_month,
        start_day: data.start_day,
        end_month: data.end_month,
        end_day: data.end_day,
        description: data.description || '',
      };

      await updateSettingValue('membership_year', config);
      toast.success('Membership year configuration saved');
    } catch {
      toast.error('Failed to save the membership year settings. Please try again.');
    }
  }, [updateSettingValue]);

  const getDaysInMonth = useCallback((month: number): number[] => {
    // Use a leap year to ensure February has 29 days available
    const leapYear = 2024;
    const daysInMonth = new Date(leapYear, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Membership Year Configuration
          </CardTitle>
          <CardDescription>
            Configure the default membership year period for calculating expiry dates. 
            This will be used as the default when creating new memberships.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <h3 className="text-lg font-medium">Membership Year Start</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Month</label>
                      <Select
                        onValueChange={(value) => form.setValue('start_month', parseInt(value), { shouldValidate: true })}
                        value={startMonth?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.start_month && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.start_month.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Start Day</label>
                      <Select
                        onValueChange={(value) => form.setValue('start_day', parseInt(value), { shouldValidate: true })}
                        value={startDay?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {startMonth ? getDaysInMonth(startMonth).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          )) : []}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.start_day && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.start_day.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* End Date Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <h3 className="text-lg font-medium">Membership Year End</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">End Month</label>
                      <Select
                        onValueChange={(value) => form.setValue('end_month', parseInt(value), { shouldValidate: true })}
                        value={endMonth?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.end_month && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.end_month.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">End Day</label>
                      <Select
                        onValueChange={(value) => form.setValue('end_day', parseInt(value), { shouldValidate: true })}
                        value={endDay?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {endMonth ? getDaysInMonth(endMonth).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          )) : []}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.end_day && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.end_day.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  placeholder="Enter a description for this membership year configuration..."
                  {...form.register('description')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional description to help identify this membership year configuration.
                </p>
                {form.formState.errors.description && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>

              {/* Preview Section */}
              {previewConfig && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" />
                    <h4 className="font-medium">Preview</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {formatMembershipYear(previewConfig)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Current membership year: <strong>{getMembershipYearLabel(previewConfig)}</strong></p>
                      <p>
                        Next membership expires: <strong>
                          {calculateDefaultMembershipExpiry(previewConfig).toLocaleDateString()}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Error */}
              {!previewConfig && startMonth && endMonth && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Please check your date configuration. Some dates may not be valid for the selected months.
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={settingsLoading || !previewConfig}>
                {settingsLoading ? 'Saving...' : 'Save Configuration'}
              </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}
