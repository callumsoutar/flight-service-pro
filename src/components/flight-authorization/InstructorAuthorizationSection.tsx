"use client";
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserCheck, FileText, AlertCircle } from "lucide-react";
import { FlightAuthorizationFormData } from '@/lib/validations/flight-authorization';
import InstructorSelect from "@/components/invoices/InstructorSelect";

interface InstructorAuthorizationSectionProps {
  control: Control<FlightAuthorizationFormData>;
  disabled?: boolean;
  status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvalInfo?: {
    approvedAt?: string | null;
    approvedBy?: string | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
  };
}

export function InstructorAuthorizationSection({ 
  control, 
  disabled = false, 
  status,
  approvalInfo 
}: InstructorAuthorizationSectionProps) {
  const isReadOnly = status === 'approved' || status === 'rejected';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  return (
    <Card className={`${isApproved ? 'border-green-200 bg-green-50' : isRejected ? 'border-red-200 bg-red-50' : 'border-purple-200 bg-purple-50'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className={`w-5 h-5 ${isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-purple-600'}`} />
          Instructor Authorization
          {isApproved && (
            <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              Approved
            </span>
          )}
          {isRejected && (
            <span className="ml-auto px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
              Rejected
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status-specific content */}
        {isApproved && approvalInfo?.approvedAt && (
          <div className="bg-green-100 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-900 mb-2">
              Authorization Approved
            </h4>
            <p className="text-sm text-green-800">
              Approved on {new Date(approvalInfo.approvedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
              {approvalInfo.approvedBy && ` by ${approvalInfo.approvedBy}`}
            </p>
          </div>
        )}

        {isRejected && approvalInfo?.rejectedAt && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Authorization Rejected
            </h4>
            <p className="text-sm text-red-800 mb-2">
              Rejected on {new Date(approvalInfo.rejectedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            {approvalInfo.rejectionReason && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-900">Reason:</p>
                <p className="text-sm text-red-800 mt-1">{approvalInfo.rejectionReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Authorizing Instructor Selection */}
        {!isReadOnly && (
          <div className="space-y-2">
            <Label htmlFor="authorizing_instructor_id" className="text-sm font-medium">
              Authorizing Instructor *
            </Label>
            <Controller
              name="authorizing_instructor_id"
              control={control}
              render={({ field, fieldState }) => (
                <div className="space-y-1">
                  <InstructorSelect
                    value={field.value ? {
                      id: field.value,
                      user_id: '',
                      first_name: '',
                      last_name: '',
                      email: ''
                    } : null}
                    onSelect={(instructor) => {
                      field.onChange(instructor ? instructor.id : '');
                    }}
                    disabled={disabled || isReadOnly}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Select the instructor who will authorize this solo flight
                  </p>
                </div>
              )}
            />
          </div>
        )}

        {/* Instructor Notes */}
        <div className="space-y-2">
          <Label htmlFor="instructor_notes" className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Instructor Notes
          </Label>
          <Controller
            name="instructor_notes"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <Textarea
                  placeholder="Additional notes from the authorizing instructor..."
                  disabled={disabled || isReadOnly}
                  rows={3}
                  {...field}
                  className={fieldState.error ? 'border-red-500' : ''}
                />
                {fieldState.error && (
                  <p className="text-xs text-red-600">{fieldState.error.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Optional notes or observations from the instructor
                </p>
              </div>
            )}
          />
        </div>

        {/* Instructor Limitations */}
        <div className="space-y-2">
          <Label htmlFor="instructor_limitations" className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Flight Limitations
          </Label>
          <Controller
            name="instructor_limitations"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <Textarea
                  placeholder="Any specific limitations or restrictions for this flight..."
                  disabled={disabled || isReadOnly}
                  rows={3}
                  {...field}
                  className={fieldState.error ? 'border-red-500' : ''}
                />
                {fieldState.error && (
                  <p className="text-xs text-red-600">{fieldState.error.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Any specific limitations or restrictions for this solo flight
                </p>
              </div>
            )}
          />
        </div>

        {/* Authorization Requirements */}
        {!isReadOnly && (
          <div className="bg-purple-100 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">
              Authorization Requirements
            </h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Student must demonstrate current solo flight endorsements</li>
              <li>• All pre-flight requirements must be completed</li>
              <li>• Weather conditions must be within student limitations</li>
              <li>• Aircraft must be approved for solo operations</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
