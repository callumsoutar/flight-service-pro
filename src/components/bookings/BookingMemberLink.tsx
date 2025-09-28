"use client";

import React from "react";
import Link from "next/link";

interface BookingMemberLinkProps {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  roleLabel?: string; // Optional, defaults to 'Student'
  currentUserRole?: string | null; // Pass the current user's role from server component
}

export default function BookingMemberLink({ userId, firstName, lastName, roleLabel = "Member", currentUserRole }: BookingMemberLinkProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ") || userId;

  // Check if current user has permission to view member details
  const isPrivileged = currentUserRole && ['admin', 'owner', 'instructor'].includes(currentUserRole);

  // Only link to member view if user is privileged (admin, owner, instructor)
  // Members and students cannot access member view pages, even their own
  const canViewMember = isPrivileged;

  return (
    <div className="mt-2 mb-4 flex items-center gap-2">
      {canViewMember ? (
        <Link
          href={`/dashboard/members/view/${userId}`}
          className="text-blue-700 underline font-semibold text-lg hover:text-blue-900 transition-colors"
        >
          {name}
        </Link>
      ) : (
        <span className="text-gray-700 font-semibold text-lg">
          {name}
        </span>
      )}
      <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600 border border-gray-200 align-middle select-none">
        {roleLabel}
      </span>
    </div>
  );
} 