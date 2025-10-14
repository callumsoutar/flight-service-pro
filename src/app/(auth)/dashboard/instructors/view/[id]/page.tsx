import InstructorDetailsClient from "./InstructorDetailsClient";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/SupabaseServerClient";
import { ArrowLeft } from "lucide-react";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

interface InstructorViewPageProps extends ProtectedPageProps {
  params: Promise<{ id: string }>;
}

async function InstructorViewPage({ params }: InstructorViewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch instructor with joined user fields
  const { data: instructor, error } = await supabase
    .from("instructors")
    .select(`*, user:user_id(id, email, first_name, last_name)`)
    .eq("id", id)
    .single();

  if (error || !instructor) return notFound();

  // Flatten user fields for client component
  const instructorUser = Array.isArray(instructor.user) ? instructor.user[0] : instructor.user;
  const instructorWithUser = {
    ...instructor,
    user_id: instructor.user_id, // Make sure user_id is included
    first_name: instructorUser?.first_name ?? "",
    last_name: instructorUser?.last_name ?? "",
    email: instructorUser?.email ?? "",
    profile_image_url: "/public/file.svg", // Default placeholder since profile_image_url doesn't exist
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

// Export the protected component using the standardized HOC
export default withRoleProtection(InstructorViewPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP); 