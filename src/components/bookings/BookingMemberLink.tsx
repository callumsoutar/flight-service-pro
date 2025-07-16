import React from "react";
import Link from "next/link";

interface BookingMemberLinkProps {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  roleLabel?: string; // Optional, defaults to 'Student'
}

export default function BookingMemberLink({ userId, firstName, lastName, roleLabel = "Member" }: BookingMemberLinkProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ") || userId;
  return (
    <div className="mt-2 mb-4 flex items-center gap-2">
      <Link
        href={`/dashboard/members/view/${userId}`}
        className="text-blue-700 underline font-semibold text-lg hover:text-blue-900 transition-colors"
      >
        {name}
      </Link>
      <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600 border border-gray-200 align-middle select-none">
        {roleLabel}
      </span>
    </div>
  );
} 