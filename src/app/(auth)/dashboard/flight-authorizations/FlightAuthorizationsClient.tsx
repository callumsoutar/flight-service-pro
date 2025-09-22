"use client";
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileSignature, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Plane, 
  Calendar,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from "lucide-react";
import { 
  useApproveFlightAuthorization, 
  useRejectFlightAuthorization 
} from '@/hooks/use-flight-authorization';
import type { FlightAuthorization } from '@/types/flight_authorizations';

interface FlightAuthorizationsClientProps {
  pendingAuthorizations: FlightAuthorization[];
  recentAuthorizations: FlightAuthorization[];
  userRole: string;
}

export function FlightAuthorizationsClient({
  pendingAuthorizations,
  recentAuthorizations,
  userRole
}: FlightAuthorizationsClientProps) {
  const [selectedAuth, setSelectedAuth] = useState<FlightAuthorization | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [limitations, setLimitations] = useState('');

  const approveMutation = useApproveFlightAuthorization({
    onSuccess: () => {
      setSelectedAuth(null);
      setApprovalNotes('');
      setLimitations('');
      window.location.reload(); // Refresh to get updated data
    }
  });

  const rejectMutation = useRejectFlightAuthorization({
    onSuccess: () => {
      setSelectedAuth(null);
      setRejectionReason('');
      window.location.reload(); // Refresh to get updated data
    }
  });

  const handleApprove = async () => {
    if (!selectedAuth) return;
    
    await approveMutation.mutateAsync({
      id: selectedAuth.id,
      approval_notes: approvalNotes || undefined,
      instructor_limitations: limitations || undefined,
    });
  };

  const handleReject = async () => {
    if (!selectedAuth || !rejectionReason.trim()) return;
    
    await rejectMutation.mutateAsync({
      id: selectedAuth.id,
      rejection_reason: rejectionReason.trim(),
    });
  };

  const formatStudentName = (student: { first_name?: string; last_name?: string; email?: string; id: string } | null | undefined) => {
    if (!student) return 'Unknown Student';
    return `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email || student.id;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <FileSignature className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Flight Authorizations
              </h1>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Authorizations */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Pending Authorizations ({pendingAuthorizations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingAuthorizations.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      No pending flight authorizations. All caught up!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {pendingAuthorizations.map((auth) => (
                      <Card 
                        key={auth.id} 
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedAuth?.id === auth.id ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                        }`}
                        onClick={() => setSelectedAuth(auth)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">
                                  {formatStudentName(auth.student)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {auth.purpose_of_flight}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Plane className="w-3 h-3" />
                                  {auth.aircraft?.registration || 'Unknown Aircraft'}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDateTime(auth.flight_date)}
                                </div>
                              </div>
                              
                              {auth.submitted_at && (
                                <p className="text-xs text-gray-500">
                                  Submitted: {formatDateTime(auth.submitted_at)}
                                </p>
                              )}
                            </div>
                            
                            <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Authorizations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAuthorizations.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {recentAuthorizations.map((auth) => (
                      <div key={auth.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {formatStudentName(auth.student)}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span>{auth.aircraft?.registration}</span>
                            <span>{formatDateTime(auth.flight_date)}</span>
                          </div>
                        </div>
                        <Badge className={
                          auth.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }>
                          {auth.status === 'approved' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {auth.status.charAt(0).toUpperCase() + auth.status.slice(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Authorization Details & Actions */}
          <div className="space-y-6">
            {selectedAuth ? (
              <>
                {/* Authorization Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Authorization Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Student</h4>
                      <p className="text-sm">{formatStudentName(selectedAuth.student)}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Flight Details</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Purpose:</strong> {selectedAuth.purpose_of_flight}</p>
                        <p><strong>Aircraft:</strong> {selectedAuth.aircraft?.registration} ({selectedAuth.aircraft?.type})</p>
                        <p><strong>Date:</strong> {formatDateTime(selectedAuth.flight_date)}</p>
                        {selectedAuth.passenger_names && selectedAuth.passenger_names.length > 0 && (
                          <p><strong>Passengers:</strong> {selectedAuth.passenger_names.join(', ')}</p>
                        )}
                        {selectedAuth.runway_in_use && (
                          <p><strong>Runway:</strong> {selectedAuth.runway_in_use}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Pre-flight Checks</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          {selectedAuth.notams_reviewed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>NOTAMs Reviewed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedAuth.weather_briefing_complete ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span>Weather Briefing Complete</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Fuel & Oil</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Fuel:</strong> {selectedAuth.fuel_level_liters} liters</p>
                        <p><strong>Oil:</strong> {selectedAuth.oil_level_quarts} quarts</p>
                      </div>
                    </div>

                    {selectedAuth.instructor_notes && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Student Notes</h4>
                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedAuth.instructor_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Approval Actions */}
                {selectedAuth.status === 'pending' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Instructor Decision
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Approval Section */}
                      <div className="space-y-3">
                        <Label htmlFor="approval_notes">Approval Notes (Optional)</Label>
                        <Textarea
                          id="approval_notes"
                          placeholder="Additional notes or observations..."
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="limitations">Flight Limitations (Optional)</Label>
                        <Textarea
                          id="limitations"
                          placeholder="Any specific limitations for this flight..."
                          value={limitations}
                          onChange={(e) => setLimitations(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={handleApprove}
                          disabled={approveMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </div>

                      <hr />

                      {/* Rejection Section */}
                      <div className="space-y-3">
                        <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                        <Textarea
                          id="rejection_reason"
                          placeholder="Please provide a reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={handleReject}
                        disabled={rejectMutation.isPending || !rejectionReason.trim()}
                        variant="destructive"
                        className="w-full"
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Reject Authorization
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <FileSignature className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a pending authorization to review details and take action.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
