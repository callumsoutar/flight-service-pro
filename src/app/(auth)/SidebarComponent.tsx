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
  BarChart3 as LucideBarChart3,
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
  { label: "Reports", icon: LucideBarChart3, href: "/dashboard/reports", tab: "reports" },
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
  const restrictedTabs = ['aircraft', 'invoices', 'staff', 'training', 'equipment', 'tasks', 'reports'];

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
      <aside className="fixed left-0 top-0 h-full w-56 bg-[#F7F5F2] border-r border-gray-200 text-gray-900 flex flex-col z-30 overflow-visible">
        <div className="flex items-center h-14 px-6 font-bold text-xl tracking-tight border-b border-gray-200">
          Flight Desk Pro
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-visible py-4 px-3 gap-0.5 flex flex-col">
          {/* Skeleton loading for navigation items */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="px-3 py-2 rounded-lg mb-1">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 bg-gray-200 rounded animate-pulse flex-1 max-w-32" />
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto mb-4 px-4">
          <div className="w-full h-px mb-3 bg-gray-200" />
          {/* Settings skeleton */}
          <div className="px-3 py-2 rounded-lg mb-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#F7F5F2] border-r border-gray-200 text-gray-900 flex flex-col z-30 overflow-visible">
      <div className="flex items-center h-14 px-6 font-bold text-xl tracking-tight border-b border-gray-200">
        Flight Desk Pro
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-visible py-4 px-3 gap-0.5 flex flex-col">
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
                className="flex items-center justify-between px-3 py-2.5 rounded-md text-gray-700 hover:text-gray-900 font-medium text-base transition-all duration-150 sidebar-link"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span className="sidebar-link-label">
                    {item.label}
                  </span>
                </div>
                {item.hasSubmenu && (
                  <LucideChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                )}
              </Link>
              
            </div>
          );
        })}
      </nav>
      <div className="mt-auto mb-4 px-3">
        <div className="w-full h-px mb-3 bg-gray-200" />
        {/* Show Settings for all users - different destinations based on role */}
        {!rolesLoading && (
          <Link
            href={userRole === 'admin' || userRole === 'owner' ? "/settings" : "/dashboard/profile"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-700 hover:text-gray-900 font-medium text-base transition-all duration-150 sidebar-link mb-2"
          >
            <LucideSettings className="w-5 h-5" />
            <span className="sidebar-link-label">
              Settings
            </span>
          </Link>
        )}
      </div>
      
      {/* Portal-based Submenu */}
      {showStaffSubmenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed w-48 rounded-lg shadow-xl submenu-container bg-[#F7F5F2] border border-gray-200"
          style={{
            zIndex: 10000,
            top: submenuPosition.top,
            left: submenuPosition.left,
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
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-all duration-200 font-medium tracking-wide rounded-md"
                style={{
                  fontFamily: 'Inter, ui-rounded, system-ui, sans-serif',
                  fontSize: '1.089rem',
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
