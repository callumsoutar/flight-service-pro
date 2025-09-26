"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Send, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { FlightDetailsSection } from './FlightDetailsSection';
import { FuelAndOilSection } from './FuelAndOilSection';
import { PreFlightChecksSection } from './PreFlightChecksSection';
import { PaymentSection } from './PaymentSection';
import { SignatureCanvas } from './SignatureCanvas';
import { InstructorAuthorizationSection } from './InstructorAuthorizationSection';
import {
  flightAuthorizationFormSchema,
  flightAuthorizationEditSchema,
  draftFlightAuthorizationSchema,
  type FlightAuthorizationEditData
} from '@/lib/validations/flight-authorization';
import {
  useCreateFlightAuthorization,
  useUpdateFlightAuthorization,
  useSubmitFlightAuthorization
} from '@/hooks/use-flight-authorization';
import type { FlightAuthorization } from '@/types/flight_authorizations';
import type { Booking } from '@/types/bookings';

interface FlightAuthorizationFormProps {
  booking: Booking;
  existingAuthorization?: FlightAuthorization | null;
  onSuccess?: (authorization: FlightAuthorization) => void;
  onCancel?: () => void;
}

export function FlightAuthorizationForm({
  booking,
  existingAuthorization,
  onSuccess,
  onCancel
}: FlightAuthorizationFormProps) {
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!existingAuthorization;
  const isReadOnly = existingAuthorization?.status === 'approved' || existingAuthorization?.status === 'rejected';
  const canSubmit = existingAuthorization?.status === 'draft' || existingAuthorization?.status === 'rejected';

  // Form setup with default values - use lenient schema for editing
  const form = useForm<FlightAuthorizationEditData>({
    resolver: zodResolver(flightAuthorizationEditSchema),
    defaultValues: {
      purpose_of_flight: existingAuthorization?.purpose_of_flight || 'solo',
      passenger_names: existingAuthorization?.passenger_names || [],
      runway_in_use: existingAuthorization?.runway_in_use || '',
      fuel_level_liters: existingAuthorization?.fuel_level_liters ?? 50, // Default to reasonable value
      oil_level_quarts: existingAuthorization?.oil_level_quarts ?? 8, // Default to reasonable value
      notams_reviewed: existingAuthorization?.notams_reviewed || false,
      weather_briefing_complete: existingAuthorization?.weather_briefing_complete || false,
      payment_method: existingAuthorization?.payment_method || 'account',
      authorizing_instructor_id: existingAuthorization?.authorizing_instructor_id || '',
      student_signature_data: existingAuthorization?.student_signature_data || '',
      instructor_notes: existingAuthorization?.instructor_notes || '',
      instructor_limitations: existingAuthorization?.instructor_limitations || '',
    },
    mode: 'onChange'
  });

  // Mutations
  const createMutation = useCreateFlightAuthorization({
    onSuccess: (authorization) => {
      setLastSavedAt(new Date());
      onSuccess?.(authorization);
    }
  });

  const updateMutation = useUpdateFlightAuthorization({
    onSuccess: (authorization) => {
      setLastSavedAt(new Date());
      onSuccess?.(authorization);
    }
  });

  const submitMutation = useSubmitFlightAuthorization({
    onSuccess: (authorization) => {
      onSuccess?.(authorization);
    }
  });

  // Save draft function
  const saveDraft = useCallback(async (data: FlightAuthorizationEditData, forceStatus?: 'draft') => {
    if (isReadOnly || isDraftSaving || isSubmitting) return;

    setIsDraftSaving(true);
    try {
      // Validate draft data (less strict)
      const draftValidation = draftFlightAuthorizationSchema.safeParse(data);
      if (!draftValidation.success) return;

      if (isEditing && existingAuthorization) {
        // Only set status to draft if explicitly requested or if current status allows it
        const shouldSetDraft = forceStatus === 'draft' || 
          ['draft', 'rejected'].includes(existingAuthorization.status);
        
        const updatePayload = {
          id: existingAuthorization.id,
          ...draftValidation.data,
          ...(shouldSetDraft && { status: 'draft' as const })
        };
        
        await updateMutation.mutateAsync(updatePayload);
      } else {
        // Filter out undefined values for creation
        const createData = Object.fromEntries(
          Object.entries(draftValidation.data).filter(([, value]) => value !== undefined)
        ) as Partial<typeof draftValidation.data>;
        await createMutation.mutateAsync({
          booking_id: booking.id,
          ...createData
        } as Parameters<typeof createMutation.mutateAsync>[0]); // Type assertion needed due to partial data
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsDraftSaving(false);
    }
  }, [isReadOnly, isDraftSaving, isSubmitting, isEditing, existingAuthorization, updateMutation, createMutation, booking.id]);

  // Auto-save draft functionality
  useEffect(() => {
    if (isReadOnly) return;

    const subscription = form.watch((values) => {
      // Auto-save after 2 seconds of inactivity
      const timeoutId = setTimeout(() => {
        saveDraft(values as FlightAuthorizationEditData);
      }, 2000);

      return () => clearTimeout(timeoutId);
    });

    return () => subscription.unsubscribe();
  }, [form, isReadOnly, saveDraft]);

  // Manual save draft
  const handleSaveDraft = async () => {
    const formData = form.getValues();
    await saveDraft(formData, 'draft');
  };

  // Submit for approval - validate with strict schema
  const handleSubmit = async (data: FlightAuthorizationEditData) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    try {
      // First validate with strict schema for submission
      const validationResult = flightAuthorizationFormSchema.safeParse(data);

      if (!validationResult.success) {
        // Show detailed validation errors
        console.error('Form validation failed:', validationResult.error.issues);
        alert('Form validation failed: ' + validationResult.error.issues.map(i => i.message).join(', '));
        return;
      }
      
      const validatedData = validationResult.data;
      let authorizationId: string;

      if (isEditing && existingAuthorization) {
        // Update existing authorization with validated data first, but DO NOT set status
        // The submit endpoint will handle setting the status to pending
        const updatedAuth = await updateMutation.mutateAsync({
          id: existingAuthorization.id,
          ...validatedData
          // Note: Do not include status here - let submit endpoint handle it
        });
        authorizationId = updatedAuth.id;
      } else {
        // Create new authorization
        const newAuth = await createMutation.mutateAsync({
          booking_id: booking.id,
          ...validatedData
        });
        authorizationId = newAuth.id;
      }

      // Submit for approval - this endpoint will set status to 'pending'
      await submitMutation.mutateAsync(authorizationId);
    } catch (error) {
      console.error('Error submitting authorization:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        // If it's a validation error, show more details
        if (error.message.includes('incomplete')) {
          alert('Please fill in all required fields before submitting. Check the form for any missing information.');
        } else {
          alert(`Failed to submit authorization: ${error.message}`);
        }
      }
      
      // Re-throw error so the form can handle it properly
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status badge component
  const StatusBadge = () => {
    if (!existingAuthorization) return null;

    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Save, label: 'Draft' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending Approval' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Cancelled' }
    };

    const config = statusConfig[existingAuthorization.status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || submitMutation.isPending || isSubmitting;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">
                Flight Authorization Form
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Complete all required fields before flight authorization
              </p>
            </div>
            <StatusBadge />
          </div>
        </CardHeader>
        {(existingAuthorization?.status === 'rejected' && existingAuthorization?.rejection_reason) && (
          <CardContent className="pt-0">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Authorization Rejected:</strong> {existingAuthorization.rejection_reason}
                <br />
                <span className="text-sm">Please address the issues above and resubmit.</span>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Main Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

        {/* Flight Details Section */}
        <FlightDetailsSection
          control={form.control}
          disabled={isReadOnly}
        />

        {/* Fuel and Oil Section */}
        <FuelAndOilSection
          control={form.control}
          disabled={isReadOnly}
        />

        {/* Pre-flight Checks Section */}
        <PreFlightChecksSection
          control={form.control}
          disabled={isReadOnly}
        />

        {/* Payment Section */}
        <PaymentSection
          control={form.control}
          disabled={isReadOnly}
          flightDate={booking.start_time}
        />

        {/* Signature Section */}
        {!isReadOnly && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✍️ Student Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignatureCanvas
                onSignatureChange={(signature) => {
                  form.setValue('student_signature_data', signature || '', {
                    shouldValidate: true,
                    shouldDirty: true
                  });
                }}
                value={form.watch('student_signature_data')}
                disabled={isReadOnly}
              />
            </CardContent>
          </Card>
        )}

        {/* Instructor Authorization Section */}
        <InstructorAuthorizationSection
          control={form.control}
          disabled={isReadOnly}
          status={existingAuthorization?.status}
          approvalInfo={{
            approvedAt: existingAuthorization?.approved_at,
            approvedBy: existingAuthorization?.approving_instructor?.user ? 
              `${existingAuthorization.approving_instructor.user.first_name} ${existingAuthorization.approving_instructor.user.last_name}`.trim() : 
              undefined,
            rejectedAt: existingAuthorization?.rejected_at,
            rejectionReason: existingAuthorization?.rejection_reason
          }}
        />

        {/* Form Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {/* Status info */}
              <div className="flex items-center gap-4">
                {lastSavedAt && (
                  <p className="text-sm text-gray-500">
                    Last saved: {lastSavedAt.toLocaleTimeString()}
                  </p>
                )}
                {isDraftSaving && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving draft...
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}

                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isLoading || isDraftSaving}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Draft
                  </Button>
                )}

                {canSubmit && (
                  <Button
                    type="button"
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                    onClick={async () => {
                      // Force call handleSubmit directly
                      try {
                        await handleSubmit(form.getValues());
                      } catch (error) {
                        console.error('Direct handleSubmit error:', error);
                      }
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit for Authorization
                  </Button>
                )}

              </div>
            </div>

            {/* Form validation errors */}
            {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Please fix the following errors:
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field}>
                      • {error?.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
