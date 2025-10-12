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

export default function BookingMemberLink({ userId, firstName, lastName, currentUserRole }: BookingMemberLinkProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ") || userId;

  // Check if current user has permission to view member details
  const isPrivileged = currentUserRole && ['admin', 'owner', 'instructor'].includes(currentUserRole);

  // Only link to member view if user is privileged (admin, owner, instructor)
  // Members and students cannot access member view pages, even their own
  const canViewMember = isPrivileged;

  return canViewMember ? (
    <Link
      href={`/dashboard/members/view/${userId}`}
      className="text-3xl font-bold text-gray-900 hover:text-[#6564db] transition-colors"
    >
      {name}
    </Link>
  ) : (
    <h1 className="text-3xl font-bold text-gray-900">
      {name}
    </h1>
  );
} 