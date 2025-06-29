import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, CalendarCheck2 } from "lucide-react";
import { format } from "date-fns";

const membershipTypeLabels: Record<string, string> = {
  flying_member: "Flying Member",
  non_flying_member: "Non-Flying Member",
  staff_membership: "Staff Member",
  junior_member: "Junior Member",
  life_member: "Life Member",
};

interface Membership {
  id: string;
  membership_type: string;
  start_date: string;
  expiry_date: string;
  purchased_date: string;
  fee_paid: boolean;
  amount_paid: number | null;
  organization_id: string;
  organization?: { name?: string };
}

interface MemberMembershipsTabProps {
  memberId: string;
}

export default function MemberMembershipsTab({ memberId }: MemberMembershipsTabProps) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/memberships?user_id=${memberId}`)
      .then((res) => res.json())
      .then((data) => {
        setMemberships(data.memberships || []);
        setError(null);
      })
      .catch(() => setError("Failed to load memberships"))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <div>Loading memberships...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  if (!memberships.length) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <span className="text-lg font-semibold">No memberships found.</span>
          <Button variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Renew Membership
          </Button>
        </div>
      </Card>
    );
  }

  // Sort memberships by start_date descending
  const sorted = [...memberships].sort((a, b) => b.start_date.localeCompare(a.start_date));
  const current = sorted.find(m => new Date(m.expiry_date) >= new Date());
  const history = sorted.filter(m => m !== current);

  return (
    <Card className="p-6">
      <CardHeader className="text-xl font-semibold px-0 pt-0 pb-4">Memberships</CardHeader>
      <CardContent className="space-y-6 p-0">
        {current && (
          <div className="p-6 border rounded-xl bg-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-base px-3 py-1">Active</Badge>
                <span className="text-lg font-bold">
                  {membershipTypeLabels[current.membership_type] || current.membership_type.replace(/_/g, ' ')}
                </span>
                <span className="text-gray-500 text-sm ml-2">{current.organization?.name || ''}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mt-1 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  Valid: {format(new Date(current.start_date), 'PPP')} - {format(new Date(current.expiry_date), 'PPP')}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-4 min-w-[100px]">
              <Badge variant={current.fee_paid ? "default" : "secondary"} className={current.fee_paid ? "bg-green-600" : ""}>
                {current.fee_paid ? "Paid" : "Unpaid"}
              </Badge>
              {typeof current.amount_paid === 'number' && (
                <span className="text-xs text-gray-600 mt-1">
                  Amount Paid: ${current.amount_paid.toFixed(2)}
                </span>
              )}
              <Button variant="default" className="gap-2 mt-4 w-full">
                <RefreshCw className="w-4 h-4" /> Renew Membership
              </Button>
            </div>
          </div>
        )}
        {history.length > 0 && (
          <div>
            <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-gray-500" /> Membership History
            </h4>
            <div className="flex flex-col gap-4">
              {history.map(m => (
                <div key={m.id} className="p-6 border rounded-xl bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {membershipTypeLabels[m.membership_type] || m.membership_type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-gray-500 text-xs">{m.organization?.name || ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 mt-1 text-xs">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(m.start_date), 'PPP')} - {format(new Date(m.expiry_date), 'PPP')}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-4 min-w-[80px]">
                    <Badge variant={m.fee_paid ? "default" : "secondary"} className={m.fee_paid ? "bg-green-600" : ""}>
                      {m.fee_paid ? "Paid" : "Unpaid"}
                    </Badge>
                    {typeof m.amount_paid === 'number' && (
                      <span className="text-xs text-gray-600 mt-1">
                        Amount Paid: ${m.amount_paid.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 