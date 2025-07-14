import MembersTable from "@/components/members/MembersTable";
import { createClient } from "@/lib/SupabaseServerClient";
import type { Member } from "@/components/members/columns";
import { cookies } from "next/headers";
import { Users, UserCog, UserCheck, MailPlus } from "lucide-react";

interface SupabaseUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
}

export default async function MembersPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get current org from cookie
  const cookieStore = await cookies();
  const currentOrgId = cookieStore.get("current_org_id")?.value;
  if (!currentOrgId) return null;

  // Fetch org info
  // const { data: orgRow } = await supabase
  //   .from("organizations")
  //   .select("*")
  //   .eq("id", currentOrgId)
  //   .single();

  // Fetch members for the organization
  const { data: orgMembersRaw } = await supabase
    .from("user_organizations")
    .select(`
      user:users(
        id,
        email,
        first_name,
        last_name,
        profile_image_url
      ),
      role
    `)
    .eq("organization_id", currentOrgId);

  // Type-safe mapping for orgMembers
  type OrgMemberRaw = { user: SupabaseUser | SupabaseUser[] | null; role: string };
  const orgMembers: OrgMemberRaw[] = (orgMembersRaw || []) as OrgMemberRaw[];

  // Format members for the table
  const formattedMembers: Member[] = orgMembers
    .map((member) => {
      let user: SupabaseUser | null = null;
      if (Array.isArray(member.user)) {
        user = member.user[0] ?? null;
      } else {
        user = member.user;
      }
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name ?? undefined,
        last_name: user.last_name ?? undefined,
        profile_image_url: user.profile_image_url ?? undefined,
        role: member.role,
        status: "active",
      };
    })
    .filter(Boolean) as Member[];

  const initialData = {
    members: formattedMembers,
    page: 1,
    limit: 20,
    total: formattedMembers.length,
  };

  // Calculate role counts
  const total = formattedMembers.length;
  const instructors = formattedMembers.filter((m) => m.role === "instructor").length;
  // const admins = formattedMembers.filter((m) => m.role === "admin" || m.role === "owner").length;
  // const students = formattedMembers.filter((m) => m.role === "student").length;
  const activeStudents = 12; // hardcoded for now
  const pendingInvites = 3; // hardcoded for now

  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-2">
            Manage your flight school&apos;s members and their roles
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><Users className="w-6 h-6 text-indigo-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Total Members</h3>
          <p className="text-3xl font-bold text-indigo-600">{total}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><UserCog className="w-6 h-6 text-green-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Instructors</h3>
          <p className="text-3xl font-bold text-green-600">{instructors}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><UserCheck className="w-6 h-6 text-blue-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Active Students</h3>
          <p className="text-3xl font-bold text-blue-600">{activeStudents}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><MailPlus className="w-6 h-6 text-yellow-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Pending Invites</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingInvites}</p>
        </div>
      </div>
      <MembersTable initialData={initialData} />
    </main>
  );
} 