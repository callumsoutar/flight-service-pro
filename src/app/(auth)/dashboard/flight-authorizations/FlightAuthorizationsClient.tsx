"use client";
import React, { useState, useCallback } from 'react';
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
  MessageSquare,
  AlertTriangle,
  Fuel,
  CloudSun,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import {
  useApproveFlightAuthorization,
  useRejectFlightAuthorization
} from '@/hooks/use-flight-authorization';
import type { FlightAuthorization } from '@/types/flight_authorizations';
import { toast } from 'sonner';
import FlightAuthorizationSearch from '@/components/flight-authorizations/FlightAuthorizationSearch';
import FlightAuthorizationTable from '@/components/flight-authorizations/FlightAuthorizationTable';

interface FlightAuthorizationsClientProps {
  pendingAuthorizations: FlightAuthorization[];
  recentAuthorizations: FlightAuthorization[];
  students: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  userRole: string;
}

export function FlightAuthorizationsClient({
  pendingAuthorizations,
  recentAuthorizations,
  students,
  aircraftList,
  userRole
}: FlightAuthorizationsClientProps) {
  const [selectedAuth, setSelectedAuth] = useState<FlightAuthorization | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [limitations, setLimitations] = useState('');
  const [actionMode, setActionMode] = useState<'approval' | 'rejection' | null>(null);

  // Search state
  const [searchResults, setSearchResults] = useState<FlightAuthorization[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showingSearch, setShowingSearch] = useState(false);

  const approveMutation = useApproveFlightAuthorization({
    onSuccess: () => {
      setSelectedAuth(null);
      setApprovalNotes('');
      setLimitations('');
      setActionMode(null);
      toast.success("Flight authorization approved successfully");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    }
  });

  const rejectMutation = useRejectFlightAuthorization({
    onSuccess: () => {
      setSelectedAuth(null);
      setRejectionReason('');
      setActionMode(null);
      toast.success("Flight authorization rejected");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
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

  // Search handlers
  const handleSearch = useCallback(async (filters: {
    student_id: string;
    aircraft_id: string;
    start_date: string;
    end_date: string;
    status: string;
  }) => {
    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          searchParams.append(key, value);
        }
      });

      searchParams.append('limit', '50');

      const response = await fetch(`/api/flight-authorizations?${searchParams}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result = await response.json();
      setSearchResults(result.authorizations);
      setShowingSearch(true);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchResults(null);
    setShowingSearch(false);
  }, []);

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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getPriorityLevel = (auth: FlightAuthorization) => {
    if (!auth.submitted_at) return 'low';

    const hoursAgo = (new Date().getTime() - new Date(auth.submitted_at).getTime()) / (1000 * 60 * 60);
    if (hoursAgo > 24) return 'high';
    if (hoursAgo > 12) return 'medium';
    return 'low';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm">
                <FileSignature className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Flight Authorizations</h1>
                <p className="text-sm text-gray-600">Review and manage solo flight requests</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1.5 text-sm px-3 py-1.5 border-gray-200">
                <User className="w-4 h-4" />
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </Badge>
              {pendingAuthorizations.length > 0 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 px-3 py-1.5 shadow-sm">
                  {pendingAuthorizations.length} pending
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
          {/* Left Panel - Authorization List */}
          <div className="lg:col-span-5 space-y-6 overflow-y-auto pr-2">
            {/* Pending Authorizations */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span>Pending Authorizations</span>
                  </div>
                  {pendingAuthorizations.length > 0 && (
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-sm">
                      {pendingAuthorizations.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {pendingAuthorizations.length === 0 ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      No pending flight authorizations. All caught up!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-10 gap-3 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200 bg-gray-50">
                      <div className="col-span-4">Student</div>
                      <div className="col-span-3">Aircraft</div>
                      <div className="col-span-3 text-right">Submitted</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-gray-100">
                      {pendingAuthorizations.map((auth) => {
                        const priority = getPriorityLevel(auth);
                        const isSelected = selectedAuth?.id === auth.id;

                        return (
                          <div
                            key={auth.id}
                            className={`relative grid grid-cols-10 gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                            }`}
                            onClick={() => setSelectedAuth(auth)}
                          >
                            {/* Priority indicator */}
                            {!isSelected && (
                              <div className={`absolute left-0 top-0 w-1 h-full ${
                                priority === 'high' ? 'bg-red-500' :
                                priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`} />
                            )}

                            {/* Student Name + Date */}
                            <div className="col-span-4 flex flex-col min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 text-sm truncate">
                                  {formatStudentName(auth.student)}
                                </span>
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{new Date(auth.flight_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                <span className="mx-2">•</span>
                                <span className="text-blue-600 font-medium">{auth.purpose_of_flight}</span>
                              </div>
                            </div>

                            {/* Aircraft */}
                            <div className="col-span-3 flex items-center text-sm text-gray-600 min-w-0">
                              <Plane className="w-4 h-4 mr-1.5 flex-shrink-0" />
                              <span className="font-medium">{auth.aircraft?.registration}</span>
                            </div>

                            {/* Time Ago + Urgent Badge */}
                            <div className="col-span-3 flex flex-col items-end min-w-0">
                              {priority === 'high' && (
                                <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded whitespace-nowrap mb-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Urgent
                                </span>
                              )}
                              <span className="text-sm text-gray-500">
                                {auth.submitted_at && formatTimeAgo(auth.submitted_at)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Section */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSignature className="w-4 h-4 text-blue-600" />
                  Search Flight Authorizations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <FlightAuthorizationSearch
                  students={students}
                  aircraftList={aircraftList}
                  onSearch={handleSearch}
                  onClear={handleClearSearch}
                  isLoading={isSearching}
                />
              </CardContent>
            </Card>

            {/* Search Results or Recent Activity */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {showingSearch ? 'Search Results' : 'Recent Activity'}
                  </div>
                  {showingSearch && searchResults && (
                    <span className="text-sm text-gray-500">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {showingSearch ? (
                  searchResults && searchResults.length > 0 ? (
                    <FlightAuthorizationTable
                      authorizations={searchResults}
                      onAuthorizationClick={setSelectedAuth}
                      compact={true}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <FileSignature className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-base font-medium text-gray-900 mb-2">No Results Found</h3>
                      <p className="text-gray-600">No flight authorizations match your search criteria.</p>
                    </div>
                  )
                ) : (
                  recentAuthorizations.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
                  ) : (
                    <div className="space-y-2">
                      {recentAuthorizations.slice(0, 5).map((auth) => (
                        <div
                          key={auth.id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedAuth(auth)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              auth.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <p className="font-medium text-sm text-gray-900">
                                {formatStudentName(auth.student)}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{auth.aircraft?.registration}</span>
                                <span>•</span>
                                <span>{formatTimeAgo(auth.updated_at)}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            auth.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {auth.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Authorization Details & Actions */}
          <div className="lg:col-span-7 overflow-y-auto">
            {selectedAuth ? (
              <div className="space-y-6">
                {/* Authorization Details */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">Authorization Details</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.open(`/dashboard/bookings/authorize/${selectedAuth.booking_id}`, '_blank')}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <FileSignature className="w-4 h-4 mr-2" />
                          View Full Authorization
                        </Button>
                        {selectedAuth.booking_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/dashboard/bookings/view/${selectedAuth.booking_id}`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Booking
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Student */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Student</h4>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{formatStudentName(selectedAuth.student)}</div>
                        <div className="text-gray-600">{selectedAuth.student?.email}</div>
                      </div>
                    </div>

                    {/* Flight Information */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Plane className="w-4 h-4 text-purple-600" />
                        Flight Information
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                        <div>
                          <span className="text-gray-600">Purpose: </span>
                          <span className="font-medium capitalize">{selectedAuth.purpose_of_flight}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Aircraft: </span>
                          <span className="font-medium">{selectedAuth.aircraft?.registration}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Date: </span>
                          <span className="font-medium">{formatDateTime(selectedAuth.flight_date)}</span>
                        </div>
                        {selectedAuth.runway_in_use && (
                          <div>
                            <span className="text-gray-600">Runway: </span>
                            <span className="font-medium">{selectedAuth.runway_in_use}</span>
                          </div>
                        )}
                        {selectedAuth.passenger_names && selectedAuth.passenger_names.length > 0 && (
                          <div>
                            <span className="text-gray-600">Passengers: </span>
                            <span className="font-medium">{selectedAuth.passenger_names.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pre-flight Checks */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CloudSun className="w-4 h-4 text-blue-600" />
                        Pre-flight Checks
                      </h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {selectedAuth.notams_reviewed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm">NOTAMs Reviewed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedAuth.weather_briefing_complete ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm">Weather Briefing Complete</span>
                        </div>
                      </div>
                    </div>

                    {/* Aircraft Status */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Fuel className="w-4 h-4 text-amber-600" />
                        Aircraft Status
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fuel:</span>
                          <span className="font-medium">{selectedAuth.fuel_level_liters} liters</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Oil:</span>
                          <span className="font-medium">{selectedAuth.oil_level_quarts} quarts</span>
                        </div>
                      </div>
                    </div>

                    {/* Student Notes */}
                    {selectedAuth.instructor_notes && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-600" />
                          Student Notes
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-700">{selectedAuth.instructor_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructor Decision Panel */}
                {selectedAuth.status === 'pending' && (
                  <Card className="border-purple-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-purple-900">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        Instructor Decision
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {!actionMode ? (
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            onClick={() => setActionMode('approval')}
                            className="h-16 bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-2"
                          >
                            <ThumbsUp className="w-5 h-5" />
                            <span className="font-semibold">Approve</span>
                          </Button>
                          <Button
                            onClick={() => setActionMode('rejection')}
                            variant="destructive"
                            className="h-16 flex flex-col items-center gap-2"
                          >
                            <ThumbsDown className="w-5 h-5" />
                            <span className="font-semibold">Reject</span>
                          </Button>
                        </div>
                      ) : actionMode === 'approval' ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-green-700 mb-4">
                            <ThumbsUp className="w-5 h-5" />
                            <span className="font-semibold">Approving Authorization</span>
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="approval_notes">Approval Notes (Optional)</Label>
                            <Textarea
                              id="approval_notes"
                              placeholder="Add any notes, observations, or conditions..."
                              value={approvalNotes}
                              onChange={(e) => setApprovalNotes(e.target.value)}
                              rows={3}
                              className="resize-none"
                            />
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="limitations">Flight Limitations (Optional)</Label>
                            <Textarea
                              id="limitations"
                              placeholder="Any specific limitations or restrictions for this flight..."
                              value={limitations}
                              onChange={(e) => setLimitations(e.target.value)}
                              rows={3}
                              className="resize-none"
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={() => setActionMode(null)}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleApprove}
                              disabled={approveMutation.isPending}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {approveMutation.isPending ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Confirm Approval
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-red-700 mb-4">
                            <ThumbsDown className="w-5 h-5" />
                            <span className="font-semibold">Rejecting Authorization</span>
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="rejection_reason" className="flex items-center gap-2">
                              Rejection Reason <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              id="rejection_reason"
                              placeholder="Please provide a clear reason for rejection to help the student understand what needs to be corrected..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={4}
                              className="resize-none"
                              required
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button
                              onClick={() => setActionMode(null)}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleReject}
                              disabled={rejectMutation.isPending || !rejectionReason.trim()}
                              variant="destructive"
                              className="flex-1"
                            >
                              {rejectMutation.isPending ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 mr-2" />
                                  Confirm Rejection
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center border-gray-200 shadow-sm">
                <CardContent className="text-center p-12">
                  <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mx-auto mb-6 shadow-sm">
                    <FileSignature className="w-10 h-10 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Select an Authorization</h3>
                  <p className="text-gray-600 max-w-sm leading-relaxed">
                    Choose a pending authorization from the left panel to review details and take action.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}