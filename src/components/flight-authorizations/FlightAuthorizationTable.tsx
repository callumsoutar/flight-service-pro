"use client";
import * as React from "react";
import type { FlightAuthorization } from "@/types/flight_authorizations";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Clock, Plane, CheckCircle, XCircle, AlertCircle, FileSignature } from "lucide-react";
import { format } from "date-fns";

interface FlightAuthorizationTableProps {
  authorizations: FlightAuthorization[];
  onAuthorizationClick?: (authorization: FlightAuthorization) => void;
  compact?: boolean;
}

const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-700", icon: FileSignature, label: "Draft" },
  pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Pending" },
  approved: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Approved" },
  rejected: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Rejected" },
  cancelled: { color: "bg-gray-100 text-gray-700", icon: AlertCircle, label: "Cancelled" }
};

export default function FlightAuthorizationTable({
  authorizations,
  onAuthorizationClick,
  compact = false
}: FlightAuthorizationTableProps) {
  const formatStudentName = (student: { first_name?: string; last_name?: string; email?: string; id: string } | null | undefined) => {
    if (!student) return 'Unknown Student';
    return `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email || student.id;
  };


  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (authorizations.length === 0) {
    return (
      <div className={`text-center ${compact ? 'py-8' : 'py-12'}`}>
        <FileSignature className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-gray-400 mx-auto mb-4`} />
        <h3 className={`${compact ? 'text-base' : 'text-lg'} font-medium text-gray-900 mb-2`}>No Authorizations Found</h3>
        <p className="text-gray-600">No flight authorizations match your criteria.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop/Laptop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full table-fixed min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-24`}>Date</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-32`}>Student</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20`}>Aircraft</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-24`}>Purpose</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-20`}>Status</th>
              <th className={`text-left ${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm w-24`}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {authorizations.map((auth) => {
              const statusInfo = statusConfig[auth.status];
              const StatusIcon = statusInfo.icon;

              return (
                <tr
                  key={auth.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                  role="button"
                  tabIndex={0}
                  onClick={() => onAuthorizationClick?.(auth)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onAuthorizationClick?.(auth);
                    }
                  }}
                >
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="font-medium truncate">
                        {format(new Date(auth.flight_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm`}>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 truncate">
                        {formatStudentName(auth.student)}
                      </span>
                    </div>
                  </td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 font-medium text-gray-900 text-xs sm:text-sm`}>
                    <div className="flex items-center gap-1">
                      <Plane className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="truncate">
                        {auth.aircraft?.registration || "--"}
                      </span>
                    </div>
                  </td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm text-gray-600`}>
                    <span className="truncate block capitalize" title={auth.purpose_of_flight || ""}>
                      {auth.purpose_of_flight || "--"}
                    </span>
                  </td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2`}>
                    <Badge className={`${statusInfo.color} font-semibold px-2 py-1 text-xs sm:text-sm flex items-center gap-1 w-fit`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </Badge>
                  </td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-2 text-xs sm:text-sm text-gray-500`}>
                    {formatTimeAgo(auth.updated_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {authorizations.map((auth) => {
          const statusInfo = statusConfig[auth.status];
          const StatusIcon = statusInfo.icon;

          return (
            <div
              key={auth.id}
              className="bg-white border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition shadow-sm"
              role="button"
              tabIndex={0}
              onClick={() => onAuthorizationClick?.(auth)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onAuthorizationClick?.(auth);
                }
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm">
                    {format(new Date(auth.flight_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                <Badge className={`${statusInfo.color} text-xs px-2 py-1 flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="font-medium text-gray-900 truncate">
                    {formatStudentName(auth.student)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Plane className="w-3 h-3 text-gray-500" />
                  <span className="font-medium text-gray-900">
                    {auth.aircraft?.registration || "--"}
                  </span>
                </div>

                {auth.purpose_of_flight && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Purpose:</span> <span className="capitalize">{auth.purpose_of_flight}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2">
                  Updated {formatTimeAgo(auth.updated_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}