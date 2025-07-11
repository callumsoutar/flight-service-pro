import { notFound } from "next/navigation";
import { createClient } from "@/lib/SupabaseServerClient";
import { User } from "@/types/users";
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
      organization_id: user.user_metadata?.organization_id,
    });
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const member: User = data;
  const joinDate = formatJoinDate(member.created_at);

  return (
    <main className="w-full p-6 flex flex-col gap-8">
      {/* Back link */}
      <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-2">
        <a href="/dashboard/members" className="text-indigo-600 hover:underline text-base flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </a>
      </div>
      {/* Member header and actions */}
      <MemberProfileCard member={member} joinDate={joinDate} />
      <div className="flex-1">
        <MemberTabs member={member} />
      </div>
    </main>
  );
} 