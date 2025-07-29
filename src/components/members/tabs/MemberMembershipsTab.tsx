import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CalendarCheck2, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { MembershipSummary, MembershipType } from "@/types/memberships";
import { 
  calculateMembershipStatus, 
  getDaysUntilExpiry, 
  getGracePeriodRemaining,
  getStatusBadgeClasses,
  getStatusText,
  isMembershipExpiringSoon
} from "@/lib/membership-utils";
import RenewMembershipModal from "../RenewMembershipModal";
import CreateMembershipModal from "../CreateMembershipModal";

interface MemberMembershipsTabProps {
  memberId: string;
}

export default function MemberMembershipsTab({ memberId }: MemberMembershipsTabProps) {
  const [membershipSummary, setMembershipSummary] = useState<MembershipSummary | null>(null);
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadMembershipData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/memberships?user_id=${memberId}&summary=true`);
      const data = await response.json();
      
      if (response.ok) {
        setMembershipSummary(data.summary);
        setError(null);
      } else {
        setError(data.error || "Failed to load membership data");
      }
    } catch {
      setError("Failed to load membership data");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadMembershipData();
    loadMembershipTypes();
  }, [loadMembershipData]);

  const loadMembershipTypes = async () => {
    try {
      const response = await fetch("/api/membership_types?active_only=true");
      const data = await response.json();
      
      if (response.ok) {
        setMembershipTypes(data.membership_types || []);
      }
    } catch (_err) {
      console.error("Failed to load membership types:", _err);
    }
  };

  const handleOpenRenewalModal = () => {
    setShowRenewalModal(true);
  };

  const handleRenewMembership = async (renewalData: {
    membership_type_id?: string;
    auto_renew: boolean;
    notes?: string;
    create_invoice: boolean;
  }) => {
    if (!membershipSummary?.current_membership) return;
    
    setIsRenewing(true);
    try {
      const response = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "renew",
          membership_id: membershipSummary.current_membership.id,
          ...renewalData,
        }),
      });
      
      if (response.ok) {
        await loadMembershipData(); // Refresh data
        setShowRenewalModal(false);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to renew membership");
      }
    } catch {
      setError("Failed to renew membership");
    } finally {
      setIsRenewing(false);
    }
  };

  const handleCreateMembership = async (membershipData: {
    user_id: string;
    membership_type_id: string;
    auto_renew: boolean;
    notes?: string;
    create_invoice: boolean;
  }) => {
    setIsRenewing(true);
    try {
      const response = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...membershipData,
        }),
      });
      
      if (response.ok) {
        await loadMembershipData(); // Refresh data
        setShowCreateModal(false);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create membership");
      }
    } catch {
      setError("Failed to create membership");
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading membership data...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadMembershipData} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : membershipSummary ? (
        <div className="space-y-6">
          {/* Current Membership or Create New */}
          {membershipSummary?.current_membership ? (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold">Current Membership</h3>
                  </div>
                  <Badge className={getStatusBadgeClasses(membershipSummary.status || "none")}>
                    {getStatusText(membershipSummary.status || "none")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium">{membershipSummary.current_membership.membership_type?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Annual Fee</p>
                    <p className="font-medium">
                      {membershipSummary.current_membership.membership_type?.price === 0 
                        ? 'Free' 
                        : `$${membershipSummary.current_membership.membership_type?.price}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Started</p>
                    <p className="font-medium">{format(new Date(membershipSummary.current_membership.start_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expires</p>
                    <p className={
                      isMembershipExpiringSoon(membershipSummary.current_membership) ? 'text-orange-600 font-medium' : 'font-medium'
                    }>
                      {format(new Date(membershipSummary.current_membership.expiry_date), 'MMM dd, yyyy')}
                    </p>
                    {membershipSummary.status === 'active' && (
                      <p className="text-xs text-gray-500">
                        {getDaysUntilExpiry(membershipSummary.current_membership)} days remaining
                      </p>
                    )}
                    {membershipSummary.status === 'grace' && (
                      <p className="text-xs text-orange-600">
                        Grace period: {getGracePeriodRemaining(membershipSummary.current_membership)} days left
                      </p>
                    )}
                  </div>
                </div>

                {isMembershipExpiringSoon(membershipSummary.current_membership) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800">
                        Membership expires soon! Consider renewing to maintain benefits.
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleOpenRenewalModal}
                    disabled={isRenewing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRenewing ? 'animate-spin' : ''}`} />
                    {isRenewing ? 'Processing...' : 'Renew Membership'}
                  </Button>
                  <Button variant="outline" onClick={() => {}}>
                    View Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Membership</h3>
                <p className="text-gray-600 mb-4">This member doesn&apos;t have an active membership.</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Membership
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Membership History */}
          {membershipSummary?.membership_history && membershipSummary.membership_history.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarCheck2 className="w-5 h-5 text-gray-500" />
                  Membership History
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {membershipSummary.membership_history.map((membership) => {
                    const membershipStatus = calculateMembershipStatus(membership);
                    const statusClasses = getStatusBadgeClasses(membershipStatus);
                    
                    return (
                      <div key={membership.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{membership.membership_type?.name}</span>
                            <Badge className={statusClasses}>
                              {getStatusText(membershipStatus)}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {format(new Date(membership.start_date), 'MMM dd, yyyy')} - {format(new Date(membership.expiry_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Fee: </span>
                            <span className="font-medium">
                              {membership.membership_type?.price === 0 ? 'Free' : `$${membership.membership_type?.price}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Payment: </span>
                            <Badge variant={membership.fee_paid ? "default" : "secondary"} className="text-xs">
                              {membership.fee_paid ? "Paid" : "Unpaid"}
                            </Badge>
                          </div>
                        </div>

                        {membership.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Notes: </span>
                            {membership.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-6">
          <div className="text-center text-gray-600">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No membership data available for this member.</p>
          </div>
        </Card>
      )}

      {/* Renewal Modal */}
      {membershipSummary?.current_membership && (
        <RenewMembershipModal
          open={showRenewalModal}
          onClose={() => setShowRenewalModal(false)}
          currentMembership={membershipSummary.current_membership}
          membershipTypes={membershipTypes}
          onRenew={handleRenewMembership}
        />
      )}

      {/* Create Membership Modal */}
      {membershipTypes.length > 0 && (
        <CreateMembershipModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          memberId={memberId}
          membershipTypes={membershipTypes}
          onCreateMembership={handleCreateMembership}
        />
      )}
    </div>
  );
} 