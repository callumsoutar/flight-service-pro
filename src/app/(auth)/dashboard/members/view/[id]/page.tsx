import { notFound } from "next/navigation";
import { createClient } from "@/lib/SupabaseServerClient";
import { User } from "@/types/users";
import MemberProfileCard from "@/components/members/MemberProfileCard";
import MemberTabs from "@/components/members/MemberTabs";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function MemberViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current org from cookie
  const cookieStore = await cookies();
  const currentOrgId = cookieStore.get("current_org_id")?.value;
  if (!currentOrgId) {
    notFound();
  }

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
      organization_id: user.user_metadata?.organization_id,
    });
  }

  // Enforce org membership: join user_organizations and filter by org and user id
  const { data, error } = await supabase
    .from("user_organizations")
    .select(`user:users(*)`)
    .eq("user_id", id)
    .eq("organization_id", currentOrgId)
    .limit(1)
    .single();

  if (error || !data?.user) {
    notFound();
  }

  // Defensive: if data.user is an array, take the first element
  const member: User = Array.isArray(data.user) ? data.user[0] : data.user;
  const joinDate = formatJoinDate(member.created_at);

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
        <MemberProfileCard member={member} joinDate={joinDate} />
        {/* Tabs area: fixed height so parent never grows taller than viewport */}
        <div className="w-full">
          <MemberTabs member={member} />
        </div>
      </div>
    </main>
  );
} 