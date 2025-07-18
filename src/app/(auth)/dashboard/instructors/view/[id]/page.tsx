import InstructorDetailsClient from "./InstructorDetailsClient";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/SupabaseServerClient";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";

export default async function InstructorViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const currentOrgId = cookieStore.get("current_org_id")?.value;
  if (!currentOrgId) return notFound();

  // Fetch instructor with joined user fields
  const { data: instructor, error } = await supabase
    .from("instructors")
    .select(`*, user:user_id(id, email, first_name, last_name, profile_image_url)`)
    .eq("id", id)
    .eq("organization_id", currentOrgId)
    .single();

  if (error || !instructor) return notFound();

  // Flatten user fields for client component
  const user = Array.isArray(instructor.user) ? instructor.user[0] : instructor.user;
  const instructorWithUser = {
    ...instructor,
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    email: user?.email ?? "",
    profile_image_url: user?.profile_image_url ?? "/public/file.svg",
    // Optionally, add status logic if needed
    status: instructor.status,
  };

  return (
    <main className="w-full min-h-screen flex flex-col p-6 gap-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
        {/* Back link */}
        <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground mb-2">
          <a href="/dashboard/instructors" className="text-indigo-600 hover:underline text-base flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Instructors
          </a>
        </div>
        {/* Details Card and Tabs */}
        <InstructorDetailsClient instructor={instructorWithUser} />
      </div>
    </main>
  );
} 