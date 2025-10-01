"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plane, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlightAuthorizationForm } from '@/components/flight-authorization/FlightAuthorizationForm';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import BookingMemberLink from '@/components/bookings/BookingMemberLink';
import { useApproveFlightAuthorization, useRejectFlightAuthorization } from '@/hooks/use-flight-authorization';
import type { Booking } from '@/types/bookings';
import type { FlightAuthorization } from '@/types/flight_authorizations';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface FlightAuthorizationClientProps {
  booking: Booking;
  existingAuthorization: FlightAuthorization | null;
  instructors: Array<{
    id: string;
    user_id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
  user: SupabaseUser;
  userRole: string | null;
}

export function FlightAuthorizationClient({
  booking,
  existingAuthorization,
  userRole
}: FlightAuthorizationClientProps) {
  const router = useRouter();

  // Check if user is instructor/admin who can approve
  const canApprove = userRole && ['instructor', 'admin', 'owner'].includes(userRole);
  const showApprovalActions = canApprove && existingAuthorization?.status === 'pending';

  // Approval mutations
  const approveMutation = useApproveFlightAuthorization({
    onSuccess: () => {
      toast.success('Flight authorization approved successfully!', {
        description: 'Redirecting to booking details...',
      });
      // Small delay to show the success message before redirect
      setTimeout(() => {
        router.push(`/dashboard/bookings/view/${booking.id}?authorized=approved`);
      }, 1000);
    },
    onError: (error) => {
      console.error('Error approving authorization:', error);
      toast.error('Failed to approve authorization', {
        description: error.message,
      });
    },
  });

  const rejectMutation = useRejectFlightAuthorization({
    onSuccess: () => {
      toast.success('Flight authorization rejected', {
        description: 'The student has been notified of the rejection.',
      });
      router.refresh();
    },
    onError: (error) => {
      console.error('Error rejecting authorization:', error);
      toast.error('Failed to reject authorization', {
        description: error.message,
      });
    },
  });

  const handleApprove = () => {
    if (!existingAuthorization?.id) return;

    approveMutation.mutate({
      id: existingAuthorization.id,
      approval_notes: "Approved via instructor review",
    });
  };

  const handleReject = () => {
    if (!existingAuthorization?.id) return;

    const reason = prompt("Please provide a reason for rejection:");
    if (reason && reason.trim()) {
      rejectMutation.mutate({
        id: existingAuthorization.id,
        rejection_reason: reason.trim(),
      });
    }
  };

  const handleSuccess = (authorization: FlightAuthorization) => {
    // Show success message and redirect based on status and user role
    if (authorization.status === 'pending') {
      // Only redirect students away after submitting for approval
      // Instructors/admins/owners should stay to review and approve
      if (!canApprove) {
        // Student submitted for approval - redirect to booking view
        router.push(`/dashboard/bookings/view/${booking.id}?authorized=pending`);
      } else {
        // Instructor/admin/owner stays on page to review the pending authorization
        router.refresh();
      }
    } else if (authorization.status === 'approved') {
      // If already approved, go to checkout
      router.push(`/dashboard/bookings/check-out/${booking.id}`);
    } else {
      // Stay on current page for drafts
      router.refresh();
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/bookings/view/${booking.id}`);
  };

  return (
    <div className={`bg-gray-50 ${(approveMutation.isPending || rejectMutation.isPending) ? 'relative' : ''}`}>
      {/* Loading Overlay */}
      {(approveMutation.isPending || rejectMutation.isPending) && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-4 max-w-sm mx-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">
                {approveMutation.isPending ? 'Approving Authorization' : 'Processing Rejection'}
              </h3>
              <p className="text-sm text-gray-600">Please wait while we process your request...</p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/bookings/view/${booking.id}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Booking
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">
                Flight Authorization
              </h1>
            </div>
            <StatusBadge status={booking.status} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
        {/* Booking Summary */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-600" />
              Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Student */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Student</h4>
                {booking.user_id && (
                  <BookingMemberLink
                    userId={booking.user_id}
                    firstName={booking.user?.first_name}
                    lastName={booking.user?.last_name}
                  />
                )}
              </div>

              {/* Aircraft */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Aircraft</h4>
                <p className="text-sm font-medium text-gray-900">
                  {booking.aircraft ? `${booking.aircraft.registration} (${booking.aircraft.type})` : 'Not assigned'}
                </p>
              </div>

              {/* Flight Date */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Flight Date</h4>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(booking.start_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-4 border-t">
              {/* Flight Type */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Flight Type</h4>
                <p className="text-sm font-medium text-gray-900">
                  {booking.flight_type?.name || 'Not specified'}
                  {booking.flight_type?.instruction_type && (
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                      {booking.flight_type.instruction_type.toUpperCase()}
                    </span>
                  )}
                </p>
              </div>

              {/* Time */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Time</h4>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(booking.start_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(booking.end_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Purpose */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Purpose</h4>
                <p className="text-sm font-medium text-gray-900">
                  {booking.purpose || 'Not specified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authorization Form */}
        <FlightAuthorizationForm
          booking={booking}
          existingAuthorization={existingAuthorization}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />

        {/* Instructor Approval Actions */}
        {showApprovalActions && (
          <Card className={`mt-4 transition-all duration-300 ${
            approveMutation.isPending || rejectMutation.isPending
              ? 'border-blue-200 bg-blue-50'
              : 'border-orange-200 bg-orange-50'
          }`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 transition-colors duration-300 ${
                approveMutation.isPending || rejectMutation.isPending
                  ? 'text-blue-800'
                  : 'text-orange-800'
              }`}>
                {approveMutation.isPending || rejectMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Instructor Review & Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approveMutation.isPending ? (
                  <Alert className="border-blue-200 bg-blue-100">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription className="text-blue-800">
                      <strong>Processing approval...</strong> This may take a few moments. Please do not refresh the page.
                    </AlertDescription>
                  </Alert>
                ) : rejectMutation.isPending ? (
                  <Alert className="border-red-200 bg-red-100">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription className="text-red-800">
                      <strong>Processing rejection...</strong> This may take a few moments. Please do not refresh the page.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This flight authorization is pending your review. Please review all sections carefully before making a decision.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white h-12 text-lg font-semibold transition-all duration-200"
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Approving Authorization...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Approve Authorization
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleReject}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    variant="destructive"
                    className="flex-1 h-12 text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {rejectMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Rejecting Authorization...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 mr-2" />
                        Reject Authorization
                      </>
                    )}
                  </Button>
                </div>

                {(approveMutation.error || rejectMutation.error) && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error:</strong> {approveMutation.error?.message || rejectMutation.error?.message}
                      <br />
                      <span className="text-sm">Please try again or contact support if the problem persists.</span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
