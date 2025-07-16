import StaffTable from "@/components/members/StaffTable";
import { createClient } from "@/lib/SupabaseServerClient";
import type { Member } from "@/components/members/columns";
import { cookies } from "next/headers";
import { Users, UserCog, UserCheck, MailPlus } from "lucide-react";

export default async function InstructorsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const currentOrgId = cookieStore.get("current_org_id")?.value;
  if (!currentOrgId) return null;

  // Fetch all instructors for the org, join user for display
  const { data: instructorsRaw, error } = await supabase
    .from("instructors")
    .select(`
      id,
      user_id,
      expires_at,
      user:user_id (
        id,
        email,
        first_name,
        last_name,
        profile_image_url
      )
    `)
    .eq("organization_id", currentOrgId);

  if (error) {
    return <div className="p-8 text-red-500">Error loading instructors: {error.message}</div>;
  }

  // Map to Member type for table
  type InstructorJoin = {
    id: string;
    user_id: string;
    expires_at?: string;
    user: {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    } | {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    }[] | null;
  };

  const formattedInstructors: Member[] = (instructorsRaw as InstructorJoin[] || [])
    .map((instructor) => {
      const user = Array.isArray(instructor.user) ? instructor.user[0] : instructor.user;
      if (!user) return null;
      return {
        id: user.id,
        instructor_id: instructor.id,
        user_id: user.id,
        email: user.email,
        first_name: user.first_name ?? undefined,
        last_name: user.last_name ?? undefined,
        profile_image_url: user.profile_image_url ?? undefined,
        role: "instructor",
        status: instructor.expires_at && new Date(instructor.expires_at) < new Date() ? "expired" : "active",
      };
    })
    .filter(Boolean) as Member[];

  const initialData = {
    members: formattedInstructors,
    page: 1,
    limit: formattedInstructors.length,
    total: formattedInstructors.length,
  };

  // Stats
  const total = formattedInstructors.length;
  const activeInstructors = formattedInstructors.filter((m) => m.status === "active").length;
  const expiredInstructors = formattedInstructors.filter((m) => m.status === "expired").length;
  const pendingInvites = 0; // Placeholder for now

  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructors</h1>
          <p className="text-muted-foreground mt-2">
            Manage your flight school&apos;s instructors and their status
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><Users className="w-6 h-6 text-indigo-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Total Instructors</h3>
          <p className="text-3xl font-bold text-indigo-600">{total}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><UserCog className="w-6 h-6 text-green-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Active Instructors</h3>
          <p className="text-3xl font-bold text-green-600">{activeInstructors}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><UserCheck className="w-6 h-6 text-blue-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Expired Instructors</h3>
          <p className="text-3xl font-bold text-blue-600">{expiredInstructors}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><MailPlus className="w-6 h-6 text-yellow-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Pending Invites</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingInvites}</p>
        </div>
      </div>
      <StaffTable initialData={initialData} />
    </main>
  );
} 