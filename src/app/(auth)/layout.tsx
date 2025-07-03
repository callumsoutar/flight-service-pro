import React from "react";
import Link from "next/link";
import { UserMenu } from "../../components/UserMenu";
import {
  Home as LucideHome,
  Calendar as LucideCalendar,
  BookOpen as LucideBookOpen,
  Plane as LucidePlane,
  Users as LucideUsers,
  UserCog as LucideUserCog,
  FileText as LucideFileText,
  GraduationCap as LucideGraduationCap,
  Shield as LucideShield,
  Wrench as LucideWrench,
  Settings as LucideSettings,
} from "lucide-react";
import { OrgContextProvider } from "@/components/OrgContextProvider";
import OrgHeaderTitle from "@/components/OrgHeaderTitle";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/SupabaseServerClient";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"


const mainNavOptions = [
  { label: "Dashboard", icon: LucideHome, href: "/dashboard", tab: "dashboard" },
  { label: "Scheduler", icon: LucideCalendar, href: "/scheduler", tab: "scheduler" },
  { label: "Bookings", icon: LucideBookOpen, href: "/dashboard/bookings", tab: "bookings" },
  { label: "Aircraft", icon: LucidePlane, href: "/aircraft", tab: "aircraft" },
  { label: "Members", icon: LucideUsers, href: "/dashboard/members", tab: "members" },
  { label: "Staff", icon: LucideUserCog, href: "/staff", tab: "staff" },
  { label: "Invoicing", icon: LucideFileText, href: "/dashboard/invoices", tab: "invoices" },
  { label: "Training", icon: LucideGraduationCap, href: "/training", tab: "training" },
  { label: "Equipment", icon: LucideWrench, href: "/dashboard/equipment", tab: "equipment" },
  { label: "Safety", icon: LucideShield, href: "/safety", tab: "safety" },
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return (
    <>
      <OrgContextProvider>
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#3b82f6] text-white flex flex-col z-30">
            <div className="flex items-center h-16 px-6 font-extrabold text-2xl tracking-tight border-b border-white/10">
              Flight Desk Pro
            </div>
            <nav className="flex-1 overflow-y-auto py-6 px-2 gap-1 flex flex-col">
              {mainNavOptions.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg text-white/90 font-semibold tracking-wide text-lg shadow-sm transition-all duration-200 sidebar-link"
                  style={{
                    fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
                    textShadow: '0 2px 8px rgba(60,0,120,0.10)',
                    letterSpacing: '0.02em',
                  }}
                >
                  <item.icon className="w-6 h-6" />
                  <span className="sidebar-link-label">
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
            <div className="mt-auto mb-4 px-4">
              <a
                href="/settings"
                className="flex items-center gap-4 px-4 py-3 rounded-lg text-white/90 font-semibold tracking-wide text-[1.18rem] shadow-sm transition-all duration-200 sidebar-link mt-auto mb-2"
                style={{ fontFamily: 'Inter, ui-rounded, system-ui, sans-serif' }}
              >
                <LucideSettings className="w-5 h-5" />
                <span>Settings</span>
              </a>
            </div>
          </aside>
          {/* Main content area */}
          <div className="flex-1 flex flex-col ml-64 min-h-0">
            {/* Top navbar */}
            <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-gray-200 z-20">
              <div className="flex items-center gap-6">
                <OrgHeaderTitle />
              </div>
              <div>
                <UserMenu />
              </div>
            </header>
            {/* Scrollable content */}
            <main className="flex-1 overflow-y-auto p-8 bg-gray-50">{children}</main>
          </div>
        </div>
      </OrgContextProvider>
      <Toaster richColors position="bottom-right" />
    </>
  );
} 