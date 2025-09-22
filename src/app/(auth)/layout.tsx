import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/SupabaseServerClient";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { SidebarComponent } from "./SidebarComponent";
import { UserMenu } from "../../components/UserMenu";

// Force dynamic rendering since this layout requires authentication
export const dynamic = 'force-dynamic';


export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return (
    <>
    <Analytics/>
    <SpeedInsights/>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <SidebarComponent />
        {/* Main content area */}
        <div className="flex-1 flex flex-col ml-64 min-h-0">
          {/* Top navbar */}
          <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-gray-200 z-20">
            <div className="flex items-center gap-6">
              {/* Organization title removed - single tenant */}
            </div>
            <div>
              <UserMenu />
            </div>
          </header>
          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto p-8 bg-gray-50">{children}</main>
        </div>
      </div>
      <Toaster richColors position="bottom-right" />
    </>
  );
} 