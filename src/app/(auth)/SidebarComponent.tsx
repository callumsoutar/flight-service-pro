"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Home as LucideHome,
  Calendar as LucideCalendar,
  BookOpen as LucideBookOpen,
  Plane as LucidePlane,
  Users as LucideUsers,
  UserCog as LucideUserCog,
  FileText as LucideFileText,
  GraduationCap as LucideGraduationCap,
  Wrench as LucideWrench,
  CheckSquare as LucideCheckSquare,
  Settings as LucideSettings,
  ChevronRight as LucideChevronRight,
} from "lucide-react";
import { useCurrentUserRoles } from "@/hooks/use-user-roles";

interface NavOption {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tab: string;
  dynamicHref?: boolean;
  hasSubmenu?: boolean;
}

const mainNavOptions: NavOption[] = [
  { label: "Dashboard", icon: LucideHome, href: "/dashboard", tab: "dashboard" },
  { label: "Scheduler", icon: LucideCalendar, href: "/dashboard/scheduler", tab: "scheduler" },
  { label: "Bookings", icon: LucideBookOpen, href: "/dashboard/bookings", tab: "bookings" },
  { label: "Aircraft", icon: LucidePlane, href: "/dashboard/aircraft", tab: "aircraft" },
  { label: "Members", icon: LucideUsers, href: "/dashboard/members", tab: "members", dynamicHref: true },
  { label: "Staff", icon: LucideUserCog, href: "/dashboard/instructors", tab: "staff", hasSubmenu: true },
  { label: "Invoicing", icon: LucideFileText, href: "/dashboard/invoices", tab: "invoices" },
  { label: "Training", icon: LucideGraduationCap, href: "/dashboard/training", tab: "training" },
  { label: "Equipment", icon: LucideWrench, href: "/dashboard/equipment", tab: "equipment" },
  { label: "Tasks", icon: LucideCheckSquare, href: "/dashboard/tasks", tab: "tasks" },
];

const staffSubmenuOptions = [
  { label: "Rosters", href: "/dashboard/rosters" },
  { label: "Instructors", href: "/dashboard/instructors" },
];

export function SidebarComponent() {
  const [showStaffSubmenu, setShowStaffSubmenu] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get current user role using the secure endpoint
  const { data: userRoleData, isLoading: rolesLoading, error: rolesError } = useCurrentUserRoles();

  // Get user's role name
  const userRole = userRoleData?.role?.toLowerCase() || '';

  // Debug logging (only show errors or during development)
  if (rolesError) {
    console.error('SidebarComponent Role Error:', rolesError);
  }

  // Define restricted items for member and student roles
  const restrictedTabs = ['aircraft', 'invoices', 'staff', 'training', 'equipment', 'tasks'];

  // Filter navigation items based on user role
  const filteredNavOptions = mainNavOptions.filter(item => {
    // If user is member or student, hide restricted items
    if (userRole === 'member' || userRole === 'student') {
      return !restrictedTabs.includes(item.tab);
    }

    // For all other roles (owner, admin, instructor), show all items
    return true;
  });

  // Render skeleton loading state while role data is loading
  if (rolesLoading) {
    return (
      <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#3b82f6] text-white flex flex-col z-30 overflow-visible">
        <div className="flex items-center h-16 px-6 font-extrabold text-2xl tracking-tight border-b border-white/10">
          Flight Desk Pro
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-visible py-6 px-2 gap-1 flex flex-col">
          {/* Skeleton loading for navigation items */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="px-3 py-2 rounded-lg mb-1">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white/20 rounded animate-pulse" />
                <div className="h-5 bg-white/20 rounded animate-pulse flex-1 max-w-32" />
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto mb-4 px-4">
          <div className="w-full h-px mb-3" style={{ background: 'rgba(255,255,255,0.10)' }} />
          {/* Settings skeleton */}
          <div className="px-3 py-2 rounded-lg mb-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-white/20 rounded animate-pulse" />
              <div className="h-5 bg-white/20 rounded animate-pulse w-20" />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#3b82f6] text-white flex flex-col z-30 overflow-visible">
      <div className="flex items-center h-16 px-6 font-extrabold text-2xl tracking-tight border-b border-white/10">
        Flight Desk Pro
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-visible py-6 px-2 gap-1 flex flex-col">
        {filteredNavOptions.map((item) => {
          // Determine the correct href based on user role and item configuration
          let href = item.href;
          if (item.dynamicHref && item.tab === 'members') {
            // For members tab, route based on user role
            if (userRole === 'member' || userRole === 'student') {
              href = '/dashboard/directory'; // Public directory for members/students
            } else {
              href = '/dashboard/members'; // Full members management for instructors+
            }
          }

          return (
            <div
              key={item.label}
              className="relative group"
              onMouseEnter={(e) => {
                if (item.hasSubmenu) {
                  if (hideTimeout) {
                    clearTimeout(hideTimeout);
                    setHideTimeout(null);
                  }
                  const rect = e.currentTarget.getBoundingClientRect();
                  setSubmenuPosition({
                    top: rect.top,
                    left: rect.right + 16
                  });
                  setShowStaffSubmenu(true);
                }
              }}
              onMouseLeave={() => {
                if (item.hasSubmenu) {
                  const timeout = setTimeout(() => setShowStaffSubmenu(false), 150);
                  setHideTimeout(timeout);
                }
              }}
            >
              <Link
                href={href}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-white/90 font-medium tracking-wide text-lg shadow-sm transition-all duration-200 sidebar-link"
                style={{
                  fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
                  textShadow: '0 2px 8px rgba(60,0,120,0.10)',
                  letterSpacing: '0.02em',
                }}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span className="sidebar-link-label" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                    {item.label}
                  </span>
                </div>
                {item.hasSubmenu && (
                  <LucideChevronRight className="w-4 h-4 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </Link>
              
            </div>
          );
        })}
      </nav>
      <div className="mt-auto mb-4 px-4">
        <div className="w-full h-px mb-3" style={{ background: 'rgba(255,255,255,0.10)' }} />
        {/* Show Settings for all users - different destinations based on role */}
        {!rolesLoading && (
          <Link
            href={userRole === 'admin' || userRole === 'owner' ? "/settings" : "/dashboard/profile"}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 font-medium tracking-wide text-lg shadow-sm transition-all duration-200 sidebar-link mb-2"
            style={{
              fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
              textShadow: '0 2px 8px rgba(60,0,120,0.10)',
              letterSpacing: '0.02em',
            }}
          >
            <LucideSettings className="w-5 h-5" />
            <span className="sidebar-link-label" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
              Settings
            </span>
          </Link>
        )}
      </div>
      
      {/* Portal-based Submenu */}
      {showStaffSubmenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed w-48 rounded-lg shadow-xl submenu-container"
          style={{
            zIndex: 10000,
            top: submenuPosition.top,
            left: submenuPosition.left,
            background: 'linear-gradient(to bottom, #a855f7, #8b5cf6, #6366f1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onMouseEnter={() => {
            if (hideTimeout) {
              clearTimeout(hideTimeout);
              setHideTimeout(null);
            }
            setShowStaffSubmenu(true);
          }}
          onMouseLeave={() => {
            const timeout = setTimeout(() => setShowStaffSubmenu(false), 150);
            setHideTimeout(timeout);
          }}
        >
          <div className="p-2">
            {staffSubmenuOptions.map((subItem) => (
              <Link
                key={subItem.label}
                href={subItem.href}
                className="block px-4 py-2 text-white/90 hover:bg-white/10 transition-all duration-200 font-medium tracking-wide rounded-md"
                style={{
                  fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                {subItem.label}
              </Link>
            ))}
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
