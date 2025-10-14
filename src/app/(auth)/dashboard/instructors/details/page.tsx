import { createClient } from "@/lib/SupabaseServerClient";
import { Users, UserCog, UserCheck, Award, Clock } from "lucide-react";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

async function InstructorDetailsPage({}: ProtectedPageProps) {
  const supabase = await createClient();

  // Fetch detailed instructor stats and information
  const { data: instructorsRaw, error } = await supabase
    .from("instructors")
    .select(`
      id,
      user_id,
      first_name,
      last_name,
      expires_at,
      created_at,
      instructor_categories (
        id,
        category
      ),
      user:user_id (
        id,
        email,
        created_at
      )
    `);

  if (error) {
    return <div className="p-8 text-red-500">Error loading instructor details: {error.message}</div>;
  }

  // Process instructors data
  const instructors = instructorsRaw || [];
  const total = instructors.length;
  const activeInstructors = instructors.filter((i) => 
    !i.expires_at || new Date(i.expires_at) > new Date()
  ).length;
  const expiredInstructors = total - activeInstructors;
  
  // Calculate categories
  const categoryCount = instructors.reduce((acc, instructor) => {
    if (instructor.instructor_categories?.length) {
      instructor.instructor_categories.forEach((cat: { category: string }) => {
        acc[cat.category] = (acc[cat.category] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  // Recent additions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentInstructors = instructors.filter((i) => 
    new Date(i.created_at) > thirtyDaysAgo
  ).length;

  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructor Details</h1>
          <p className="text-muted-foreground mt-2">
            Detailed overview of instructor metrics and performance
          </p>
        </div>
      </div>

      {/* Overview Stats */}
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
          <span className="mb-2"><Clock className="w-6 h-6 text-yellow-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Recent Additions</h3>
          <p className="text-3xl font-bold text-yellow-600">{recentInstructors}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-semibold">Instructor Categories</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(categoryCount).map(([category, count]) => (
            <div key={category} className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 font-medium">{category}</div>
              <div className="text-2xl font-bold text-indigo-600">{count}</div>
            </div>
          ))}
          {Object.keys(categoryCount).length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              No category data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Instructor Activity</h2>
        <div className="space-y-3">
          {instructors
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map((instructor) => (
              <div key={instructor.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <div className="font-medium">
                    {instructor.first_name} {instructor.last_name}
                  </div>
                  <div className="text-sm text-gray-500">{(instructor.user as { email?: string })?.email || 'No email'}</div>
                </div>
                <div className="text-sm text-gray-500">
                  Added {new Date(instructor.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          {instructors.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No instructor data available
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Export the protected component using the standardized HOC
export default withRoleProtection(InstructorDetailsPage, ROLE_CONFIGS.INSTRUCTOR_AND_UP);
