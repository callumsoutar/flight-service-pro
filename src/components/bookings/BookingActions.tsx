
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
import { Plane, ClipboardCheck, FileSignature, CheckCircle, ShieldCheck, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFlightAuthorizationByBooking } from '@/hooks/use-flight-authorization';
import type { Booking } from '@/types/bookings';

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
    if (!authorization) return "Start Authorization Form";
    switch (authorization.status) {
      case 'draft': return "Complete Authorization";
      case 'pending': return "View Authorization";
      case 'approved': return "View Authorization";
      case 'rejected': return "Resubmit Authorization";
      default: return "View Authorization";
    }
  };

  // Helper function to get authorization status badge
  const getAuthorizationStatusBadge = () => {
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
    router.push(`/dashboard/bookings/authorize/${actualBookingId}`);
  };

  return (
    <div className="flex items-center justify-end gap-3">
      {/* Check Flight Out Button - With dropdown for solo flights, simple button for non-solo */}
      {actualStatus === "confirmed" && !hideCheckOutButton && (!mode || mode === 'check-out') && (
        <>
          {isSoloFlight ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
                  <Plane className="w-5 h-5 mr-1" />
                  Check Flight Out
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/bookings/check-out/${actualBookingId}`}>
                      <Plane className="w-4 h-4 mr-2" />
                      Check Flight Out
                    </Link>
                  </DropdownMenuItem>
                  {/* Show flight authorization for solo flights or any flight that has an authorization */}
                  {(isSoloFlight || authorization) && (
                    <DropdownMenuItem onClick={handleAuthorizationNavigation} className="flex items-center">
                      {React.createElement(getAuthorizationStatusIcon(), { className: "w-4 h-4 mr-2" })}
                      <span className="flex-1">{getAuthorizationStatusText()}</span>
                      {getAuthorizationStatusBadge()}
                    </DropdownMenuItem>
                  )}
                  {booking.authorization_override && (
                    <DropdownMenuItem disabled>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Authorization Overridden
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Non-solo flight: show dropdown if authorization exists, otherwise simple button
            authorization ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
                    <Plane className="w-5 h-5 mr-1" />
                    Check Flight Out
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
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
                    {booking.authorization_override && (
                      <DropdownMenuItem disabled>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Authorization Overridden
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
                <Link href={`/dashboard/bookings/check-out/${actualBookingId}`}>
                  <Plane className="w-5 h-5 mr-1" />
                  Check Flight Out
                </Link>
              </Button>
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