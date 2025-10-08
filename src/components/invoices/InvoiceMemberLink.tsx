"use client";

import React from "react";
import Link from "next/link";

interface InvoiceMemberLinkProps {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  currentUserRole?: string | null; // Pass the current user's role from server component
}

export default function InvoiceMemberLink({
  userId,
  firstName,
  lastName,
  email,
  currentUserRole
}: InvoiceMemberLinkProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ") || email || userId;

  // Check if current user has permission to view member details
  const isPrivileged = currentUserRole && ['admin', 'owner', 'instructor'].includes(currentUserRole);

  // Only link to member view if user is privileged (admin, owner, instructor)
  const canViewMember = isPrivileged;

  return (
    <>
      {canViewMember ? (
        <Link
          href={`/dashboard/members/view/${userId}`}
          className="text-blue-700 underline hover:text-blue-900 transition-colors"
        >
          {name}
        </Link>
      ) : (
        <span className="text-muted-foreground">
          {name}
        </span>
      )}
    </>
  );
}
