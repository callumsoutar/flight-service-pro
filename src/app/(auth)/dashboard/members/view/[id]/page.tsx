import React from "react";
import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/SupabaseServerClient";
import { User } from "@/types/users";
import { MembershipStatus } from "@/types/memberships";
import MemberProfileCard from "@/components/members/MemberProfileCard";
import MemberTabs from "@/components/members/MemberTabs";
import { ArrowLeft } from "lucide-react";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface MemberViewPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function MemberViewPage({ params, user: _user, userRole: _userRole }: MemberViewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch user with roles - specify the exact relationship
  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      user_roles!user_roles_user_id_fkey (
        roles (
          name
        )
      )
    `)
    .eq("id", id)
    .limit(1)
    .single();

  if (error || !data) {
    notFound();
  }

  // Check if user has auth account using service client
  const serviceSupabase = createServiceClient();
  const { data: authUser } = await serviceSupabase
    .from("auth.users")
    .select("id")
    .eq("id", id)
    .single();

  // Add role information to the user object
  const member: User = {
    ...data,
    role: data.user_roles && data.user_roles.length > 0 
      ? data.user_roles[0]?.roles?.name || 'member'
      : 'member',
    has_auth_account: !!authUser
  };
  
  // Fetch membership data and status
  let membershipStatus: MembershipStatus = "none";
  let joinDate = formatJoinDate(member.created_at); // Fallback to account creation date
  
  try {
    const { data: membershipData } = await supabase
      .from("memberships")
      .select(`
        *,
        membership_types(*),
        invoices!memberships_invoice_id_fkey (
          id, status, invoice_number
        )
      `)
      .eq("user_id", id)
      .order("created_at", { ascending: true }) // Get oldest membership first
      .limit(1)
      .single();

    if (membershipData) {
      // Use the oldest membership's start_date for "Member since"
      joinDate = formatJoinDate(membershipData.start_date);
      
      // Calculate status based on membership data and invoice status
      const now = new Date();
      const expiryDate = new Date(membershipData.expiry_date);
      const gracePeriodEnd = new Date(expiryDate.getTime() + (membershipData.grace_period_days * 24 * 60 * 60 * 1000));
      
      // Check if fee is paid via invoice status (replacing deprecated fee_paid field)
      const feePaid = membershipData.invoices?.status === 'paid';
      
      if (!feePaid) {
        membershipStatus = "unpaid";
      } else if (now <= expiryDate) {
        membershipStatus = "active";
      } else if (now <= gracePeriodEnd) {
        membershipStatus = "grace";
      } else {
        membershipStatus = "expired";
      }
    }
  } catch (error) {
    console.error('Failed to fetch membership status:', error);
    // membershipStatus remains "none" as fallback, joinDate uses account creation date
  }

  return (
    <main className="w-full min-h-screen flex flex-col p-6 gap-8">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
        {/* Back link */}
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-2">
          <a href="/dashboard/members" className="text-indigo-600 hover:underline text-base flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Members
          </a>
        </div>
        {/* Member header and actions */}
        <MemberProfileCard member={member} joinDate={joinDate} membershipStatus={membershipStatus} />
        {/* Tabs area: fixed height so parent never grows taller than viewport */}
        <div className="w-full">
          <MemberTabs member={member} />
        </div>
      </div>
    </main>
  );
}

// Export protected component with role restriction for instructors and above
export default withRoleProtection(MemberViewPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);