
"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plane, ClipboardCheck, FileSignature, CheckCircle, ShieldCheck, ChevronDown, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFlightAuthorizationByBooking } from '@/hooks/use-flight-authorization';
import { useFlightAuthorizationSetting } from '@/hooks/use-flight-authorization-setting';
import type { Booking } from '@/types/bookings';
import { useIsRestrictedUser } from '@/hooks/use-role-protection';

interface BookingActionsProps {
  booking?: Booking;
  hideCheckOutButton?: boolean;
  mode?: 'check-in' | 'check-out';
  // Legacy props for backward compatibility
  status?: string;
  bookingId?: string;
}

export default function BookingActions({ 
  booking,
  hideCheckOutButton = false, 
  mode,
  // Legacy props - extract from booking if not provided
  status,
  bookingId
}: BookingActionsProps) {
  // Support legacy usage
  const actualStatus = status || booking?.status;
  const actualBookingId = bookingId || booking?.id;
  const router = useRouter();

  // React hooks must be called before any early returns
  const { data: authorization } = useFlightAuthorizationByBooking(actualBookingId || '');

  // Get flight authorization setting
  const { requireFlightAuthorization } = useFlightAuthorizationSetting();

  // Check if user has restricted access (member/student)
  const { isRestricted: isRestrictedUser } = useIsRestrictedUser();

  // Handle missing booking data gracefully
  if (!booking) {
    return null;
  }
  
  // Only check for solo flights if we have complete flight type data
  // If flight_type is not joined to the booking data, we won't show authorization buttons
  // This is safer and avoids errors
  const isSoloFlight = Boolean(
    booking.flight_type && 
    booking.flight_type.instruction_type === 'solo' && 
    !booking.instructor_id
  );

  // Helper function to get authorization status display
  const getAuthorizationStatusText = () => {
    // Standard authorization status text (override status shown in badge instead)
    if (!authorization) return "Start Flight Authorization";
    switch (authorization.status) {
      case 'draft': return "Solo Authorization";
      case 'pending': return "View Flight Authorization";
      case 'approved': return "View Flight Authorization";
      case 'rejected': return "Resubmit Authorization";
      default: return "View Flight Authorization";
    }
  };

  // Helper function to get authorization status badge
  const getAuthorizationStatusBadge = () => {
    // Show override badge if authorization is overridden
    if (booking.authorization_override) {
      return (
        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
          Authorized
        </span>
      );
    }
    
    // Show authorization status if no override
    if (!authorization) return null;
    const statusColors = {
      'approved': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'rejected': 'bg-red-100 text-red-800',
      'draft': 'bg-gray-100 text-gray-800'
    };
    const colorClass = statusColors[authorization.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`ml-auto text-xs px-2 py-1 rounded-full ${colorClass}`}>
        {authorization.status}
      </span>
    );
  };

  // Helper function to get authorization status icon
  const getAuthorizationStatusIcon = () => {
    // If override is applied, show shield check icon
    if (booking.authorization_override) {
      return ShieldCheck;
    }
    
    // Standard authorization status icons
    if (!authorization) return FileSignature;
    switch (authorization.status) {
      case 'draft': return FileSignature;
      case 'pending': return FileSignature;
      case 'approved': return CheckCircle;
      case 'rejected': return FileSignature;
      default: return FileSignature;
    }
  };

  // Helper function to navigate to authorization
  const handleAuthorizationNavigation = () => {
    // If authorization is overridden, still navigate to the authorization page 
    // which can show the override information
    router.push(`/dashboard/bookings/authorize/${actualBookingId}`);
  };

  // Helper function to render authorization indicator badge
  const renderAuthorizationIndicator = () => {
    // Only show indicator if there's an authorization record or override
    if (!authorization && !booking.authorization_override) return null;

    // Determine the indicator color, icon, and tooltip text based on status
    let badgeColor = "bg-gray-500";
    let badgeIcon = FileText;
    let tooltipText = "";
    
    if (booking.authorization_override) {
      badgeColor = "bg-blue-500";
      badgeIcon = ShieldCheck;
      tooltipText = "Flight Authorization Overridden";
    } else if (authorization) {
      switch (authorization.status) {
        case 'approved':
          badgeColor = "bg-green-500";
          badgeIcon = CheckCircle;
          tooltipText = "Flight Authorization Approved";
          break;
        case 'pending':
          badgeColor = "bg-yellow-500";
          badgeIcon = FileSignature;
          tooltipText = "Flight Authorization Pending Review";
          break;
        case 'rejected':
          badgeColor = "bg-red-500";
          badgeIcon = FileSignature;
          tooltipText = "Flight Authorization Rejected";
          break;
        case 'draft':
          badgeColor = "bg-gray-500";
          badgeIcon = FileText;
          tooltipText = "Flight Authorization Draft";
          break;
        default:
          badgeColor = "bg-gray-500";
          badgeIcon = FileText;
          tooltipText = "Flight Authorization Exists";
      }
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-white cursor-help">
              <div className={`w-3 h-3 rounded-full ${badgeColor} flex items-center justify-center`}>
                {React.createElement(badgeIcon, { 
                  className: "w-2 h-2 text-white", 
                  strokeWidth: 3 
                })}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex items-center justify-end gap-3">
      {/* Check Flight Out Button - With dropdown for solo flights, simple button for non-solo */}
      {actualStatus === "confirmed" && !hideCheckOutButton && (!mode || mode === 'check-out') && !isRestrictedUser && (
        <>
          {isSoloFlight ? (
            // Solo flight: show dropdown if flight authorization is required OR authorization exists OR is overridden, otherwise simple button
            (requireFlightAuthorization || authorization || booking.authorization_override) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="relative">
                    <Button className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
                      <Plane className="w-5 h-5 mr-1" />
                      Check Flight Out
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                    {renderAuthorizationIndicator()}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/bookings/check-out/${actualBookingId}`}>
                        <Plane className="w-4 h-4 mr-2" />
                        Check Flight Out
                      </Link>
                    </DropdownMenuItem>
                    {/* Show flight authorization for solo flights when setting is enabled, any flight that has an authorization, or when overridden */}
                    {((isSoloFlight && requireFlightAuthorization) || authorization || booking.authorization_override) && (
                      <DropdownMenuItem onClick={handleAuthorizationNavigation} className="flex items-center">
                        {React.createElement(getAuthorizationStatusIcon(), { className: "w-4 h-4 mr-2" })}
                        <span className="flex-1">{getAuthorizationStatusText()}</span>
                        {getAuthorizationStatusBadge()}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Simple button for solo flights when authorization is not required and no existing authorization
              <div className="relative">
                <Button asChild className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
                  <Link href={`/dashboard/bookings/check-out/${actualBookingId}`}>
                    <Plane className="w-5 h-5 mr-1" />
                    Check Flight Out
                  </Link>
                </Button>
                {renderAuthorizationIndicator()}
              </div>
            )
          ) : (
            // Non-solo flight: show dropdown if authorization exists or is overridden, otherwise simple button
            (authorization || booking.authorization_override) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="relative">
                    <Button className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
                      <Plane className="w-5 h-5 mr-1" />
                      Check Flight Out
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                    {renderAuthorizationIndicator()}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/bookings/check-out/${actualBookingId}`}>
                        <Plane className="w-4 h-4 mr-2" />
                        Check Flight Out
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAuthorizationNavigation} className="flex items-center">
                      {React.createElement(getAuthorizationStatusIcon(), { className: "w-4 h-4 mr-2" })}
                      <span className="flex-1">{getAuthorizationStatusText()}</span>
                      {getAuthorizationStatusBadge()}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="relative">
                <Button asChild className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
                  <Link href={`/dashboard/bookings/check-out/${actualBookingId}`}>
                    <Plane className="w-5 h-5 mr-1" />
                    Check Flight Out
                  </Link>
                </Button>
                {renderAuthorizationIndicator()}
              </div>
            )
          )}
        </>
      )}

      {/* Check In Button */}
      {actualStatus === "flying" && (!mode || mode === 'check-out') && (
        <Button asChild className="h-10 px-6 text-base font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-green-300">
          <Link href={`/dashboard/bookings/check-in/${actualBookingId}`}>
            <ClipboardCheck className="w-4 h-4 mr-1" />
            Check Flight In
          </Link>
        </Button>
      )}

      {/* Debrief Button */}
      {mode === 'check-in' && actualStatus === 'flying' && (
        <Button asChild className="h-10 px-6 text-base font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-green-300">
          <Link href={`/dashboard/bookings/debrief/${actualBookingId}`}>
            Debrief
          </Link>
        </Button>
      )}
    </div>
  );
} 