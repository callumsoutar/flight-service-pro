"use client";

import * as React from "react";
import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plane,
  FileCheck,
  ExternalLink,
  User,
  Clock,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import BookingsTable from "@/app/(auth)/dashboard/bookings/BookingsTable";
import {
  useFlightAuthorizations,
  useApproveFlightAuthorization,
  useRejectFlightAuthorization,
} from "@/hooks/use-flight-authorization";
import type { Booking } from "@/types/bookings";
import type { FlightAuthorization } from "@/types/flight_authorizations";

interface DashboardTabbedSectionProps {
  bookings: Booking[];
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraftList: { id: string; registration: string; type: string }[];
  userRole: string;
}

export default function DashboardTabbedSection({
  bookings,
  members,
  instructors,
  aircraftList,
  userRole
}: DashboardTabbedSectionProps) {
  const [selectedAuth, setSelectedAuth] = useState<FlightAuthorization | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Flight Authorization logic
  const isPrivilegedUser = ['instructor', 'admin', 'owner'].includes(userRole);
  const { data: authorizationsData, isLoading } = useFlightAuthorizations({
    status: 'pending',
    limit: 10
  });

  const approveMutation = useApproveFlightAuthorization({
    onSuccess: () => {
      toast.success("Flight authorization approved");
      setApprovalDialogOpen(false);
      setSelectedAuth(null);
      setApprovalNotes("");
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    }
  });

  const rejectMutation = useRejectFlightAuthorization({
    onSuccess: () => {
      toast.success("Flight authorization rejected");
      setRejectionDialogOpen(false);
      setSelectedAuth(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    }
  });

  const authorizations = authorizationsData?.authorizations || [];

  const handleApprove = (auth: FlightAuthorization) => {
    setSelectedAuth(auth);
    setApprovalDialogOpen(true);
  };

  const handleReject = (auth: FlightAuthorization) => {
    setSelectedAuth(auth);
    setRejectionDialogOpen(true);
  };

  const confirmApproval = () => {
    if (!selectedAuth) return;
    approveMutation.mutate({
      id: selectedAuth.id,
      approval_notes: approvalNotes || undefined,
    });
  };

  const confirmRejection = () => {
    if (!selectedAuth || !rejectionReason.trim()) return;
    rejectMutation.mutate({
      id: selectedAuth.id,
      rejection_reason: rejectionReason,
    });
  };

  // Bookings logic
  const { todaysBookings, currentlyFlying } = React.useMemo(() => {
    const today = new Date();
    const localToday = today.getFullYear() + '-' +
                      String(today.getMonth() + 1).padStart(2, '0') + '-' +
                      String(today.getDate()).padStart(2, '0');

    const todaysBookings = bookings.filter(booking => {
      const startDate = new Date(booking.start_time);
      const endDate = new Date(booking.end_time);

      const localStartDate = startDate.getFullYear() + '-' +
                            String(startDate.getMonth() + 1).padStart(2, '0') + '-' +
                            String(startDate.getDate()).padStart(2, '0');

      const localEndDate = endDate.getFullYear() + '-' +
                          String(endDate.getMonth() + 1).padStart(2, '0') + '-' +
                          String(endDate.getDate()).padStart(2, '0');

      const isToday = localStartDate === localToday ||
                     (localStartDate < localToday && localEndDate >= localToday);

      return isToday && booking.status === 'confirmed';
    });

    const currentlyFlying = bookings.filter(booking => booking.status === 'flying');

    return { todaysBookings, currentlyFlying };
  }, [bookings]);

  const formatDate = () => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  };

  const totalTodayActivity = todaysBookings.length + currentlyFlying.length;
  const authorizationCount = authorizations.length;

  return (
    <>
      <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between mb-6">
            <CardTitle className="text-lg">Flight Operations</CardTitle>
            <div className="flex items-center gap-2">
              {totalTodayActivity > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {totalTodayActivity} today
                </Badge>
              )}
              {isPrivilegedUser && authorizationCount > 0 && (
                <Badge variant="default" className="bg-orange-100 text-orange-800">
                  {authorizationCount} pending
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <Tabs defaultValue="today" className="w-full">
          <div className="border-b border-gray-200">
            <TabsList className="inline-flex bg-transparent border-0 rounded-none p-0 h-auto space-x-8 px-6">
              <TabsTrigger
                value="today"
                className="inline-flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=inactive]:text-gray-500 hover:text-gray-700 whitespace-nowrap bg-transparent"
                style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
              >
                <Calendar className="w-4 h-4 text-green-600" />
                <span>Today&apos;s Activity</span>
                {totalTodayActivity > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full bg-green-100 text-green-700">
                    {totalTodayActivity}
                  </span>
                )}
              </TabsTrigger>
              {isPrivilegedUser && (
                <TabsTrigger
                  value="authorizations"
                  className="inline-flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=inactive]:text-gray-500 hover:text-gray-700 whitespace-nowrap bg-transparent"
                  style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                >
                  <FileCheck className="w-4 h-4 text-orange-600" />
                  <span>Pending Authorizations</span>
                  {authorizationCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full bg-orange-100 text-orange-700">
                      {authorizationCount}
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <CardContent className="pt-6">
            <TabsContent value="today" className="h-full flex flex-col m-0">
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {/* Today's Bookings */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-gray-900">Today&apos;s Bookings</h4>
                    <span className="text-sm text-gray-500">{formatDate()}</span>
                  </div>

                  {todaysBookings.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <Calendar className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No bookings scheduled for today</p>
                    </div>
                  ) : (
                    <BookingsTable
                      bookings={todaysBookings}
                      members={members}
                      instructors={instructors}
                      aircraftList={aircraftList}
                      compact={true}
                    />
                  )}
                </div>

                {/* Currently Flying */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Plane className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Currently Flying</h4>
                  </div>

                  {currentlyFlying.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <Plane className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No aircraft currently in flight</p>
                    </div>
                  ) : (
                    <BookingsTable
                      bookings={currentlyFlying}
                      members={members}
                      instructors={instructors}
                      aircraftList={aircraftList}
                      compact={true}
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            {isPrivilegedUser && (
              <TabsContent value="authorizations" className="h-full flex flex-col m-0">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">Solo flight requests awaiting approval</p>
                  <Link href="/dashboard/flight-authorizations">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View All
                    </Button>
                  </Link>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4 h-16"></div>
                    ))}
                  </div>
                ) : authorizations.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <FileCheck className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                      <h4 className="text-base font-medium text-gray-900 mb-1">No Pending Authorizations</h4>
                      <p className="text-sm text-gray-600">All flight authorizations are up to date.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {authorizations.map((auth) => (
                      <div
                        key={auth.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => window.open(`/dashboard/bookings/authorize/${auth.booking_id}`, '_blank')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="font-medium text-gray-900 truncate">
                                {auth.student?.first_name} {auth.student?.last_name}
                              </span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-600 truncate">
                                {auth.aircraft?.registration}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(auth.flight_date), 'MMM dd')}</span>
                              </div>
                              <div className="truncate">
                                {auth.purpose_of_flight}
                              </div>
                              {auth.submitted_at && (
                                <div className="text-xs text-gray-500">
                                  Submitted {format(new Date(auth.submitted_at), 'HH:mm')}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(auth);
                              }}
                              className="border-green-200 text-green-700 hover:bg-green-50"
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(auth);
                              }}
                              className="border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </CardContent>
        </Tabs>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Flight Authorization</DialogTitle>
            <DialogDescription>
              Approve {selectedAuth?.student?.first_name} {selectedAuth?.student?.last_name}&apos;s
              solo flight request for {selectedAuth?.aircraft?.registration}.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium text-gray-700">Approval Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes or conditions..."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Flight Authorization</DialogTitle>
            <DialogDescription>
              Reject {selectedAuth?.student?.first_name} {selectedAuth?.student?.last_name}&apos;s
              solo flight request. Please provide a reason.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium text-gray-700">Rejection Reason</label>
            <Textarea
              placeholder="Explain why this authorization is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-1"
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}