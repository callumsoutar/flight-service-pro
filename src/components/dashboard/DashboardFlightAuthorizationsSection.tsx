"use client";

import * as React from "react";
import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  User,
  ThumbsUp,
  ThumbsDown,
  FileCheck,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import {
  useFlightAuthorizations,
  useApproveFlightAuthorization,
  useRejectFlightAuthorization,
} from "@/hooks/use-flight-authorization";
import type { FlightAuthorization } from "@/types/flight_authorizations";

interface DashboardFlightAuthorizationsSectionProps {
  userRole: string;
}

export default function DashboardFlightAuthorizationsSection({
  userRole
}: DashboardFlightAuthorizationsSectionProps) {
  const [selectedAuth, setSelectedAuth] = useState<FlightAuthorization | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Only show for instructors and admins
  const isPrivilegedUser = ['instructor', 'admin', 'owner'].includes(userRole);

  // Fetch pending authorizations
  const { data: authorizationsData, isLoading } = useFlightAuthorizations({
    status: 'pending',
    limit: 5 // Show only 5 most recent on dashboard
  });

  // Mutations
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

  // Don't render for non-privileged users
  if (!isPrivilegedUser) {
    return null;
  }

  return (
    <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-orange-600" />
            <div>
              <CardTitle className="text-lg">Pending Flight Authorizations</CardTitle>
              <p className="text-sm text-gray-600">Solo flight requests awaiting approval</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {authorizations.length > 0 && (
              <Badge variant="default" className="bg-orange-100 text-orange-800">
                {authorizations.length} pending
              </Badge>
            )}
            <Link href="/dashboard/flight-authorizations">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 overflow-hidden flex flex-col">
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
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {authorizations.map((auth) => (
                <div
                  key={auth.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.open(`/dashboard/flight-authorizations?highlight=${auth.id}`, '_blank')}
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
          </>
        )}
      </CardContent>

      {/* Quick Approval Dialog */}
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

      {/* Quick Rejection Dialog */}
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
    </Card>
  );
}