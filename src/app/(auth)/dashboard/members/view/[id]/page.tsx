import { notFound } from "next/navigation";
import { createClient } from "@/lib/SupabaseServerClient";
import { User } from "@/types/users";
import { MembershipStatus } from "@/types/memberships";
import MemberProfileCard from "@/components/members/MemberProfileCard";
import MemberTabs from "@/components/members/MemberTabs";
import { ArrowLeft } from "lucide-react";

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function MemberViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the currently logged-in user
  const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
  if (authUserError || !authUserData?.user) {
    console.log('No logged-in user found or error:', authUserError);
  } else {
    const user = authUserData.user;
    console.log('Logged in user:', {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      metadata: user.user_metadata,
    });
  }

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

  // Add role information to the user object
  const member: User = {
    ...data,
    role: data.user_roles && data.user_roles.length > 0 
      ? data.user_roles[0]?.roles?.name || 'member'
      : 'member'
  };
  
  const joinDate = formatJoinDate(member.created_at);

  // Fetch membership status directly from database
  let membershipStatus: MembershipStatus = "none";
  try {
    const { data: membershipData } = await supabase
      .from("memberships")
      .select("*, membership_types(*)")
      .eq("user_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (membershipData) {
      // Calculate status based on membership data
      const now = new Date();
      const expiryDate = new Date(membershipData.expiry_date);
      const gracePeriodEnd = new Date(expiryDate.getTime() + (membershipData.grace_period_days * 24 * 60 * 60 * 1000));
      
      if (!membershipData.fee_paid) {
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
    // membershipStatus remains "none" as fallback
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