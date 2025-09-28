"use client";
import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, X, MessageCircle, Send, Plane, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import Link from "next/link";
import InstructorCommentsModal from "@/components/bookings/InstructorCommentsModal";
import { CancelBookingModal } from "@/components/bookings/CancelBookingModal";
import { UncancelBookingWrapper } from "@/components/bookings/UncancelBookingWrapper";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BookingStatus } from "@/types/bookings";
import { useIsRestrictedUser } from "@/hooks/use-role-protection";
import { useCancellationCategories } from "@/hooks/use-cancellation-categories";

interface BookingStagesOptionsProps {
  bookingId: string;
  bookingStatus?: BookingStatus;
  instructorCommentsCount?: number;
  hasLessonProgress?: boolean;
}

export default function BookingStagesOptions({ bookingId, bookingStatus, instructorCommentsCount = 0, hasLessonProgress = false }: BookingStagesOptionsProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [navigatingAircraft, setNavigatingAircraft] = useState(false);
  const router = useRouter();

  // Track component mounting to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user has restricted access (member/student)
  const { isRestricted: isRestrictedUser } = useIsRestrictedUser();
  
  // Use the hook for cancellation categories
  const { data: categoriesData, isLoading: loadingCategories, error: categoriesError } = useCancellationCategories();
  const cancellationCategories = categoriesData?.categories || [];

  const handleCancelSubmit = async (data: { reason: string; notes?: string; cancellation_category_id?: string }) => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellation_category_id: data.cancellation_category_id,
          reason: data.reason,
          notes: data.notes,
        }),
      });
      if (res.ok) {
        toast.success("Booking cancelled successfully");
        setCancelOpen(false);
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel booking");
      }
    } catch {
      toast.error("Failed to cancel booking");
      setCancelOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  const handleSendConfirmation = async () => {
    if (sendingConfirmation) return;
    setSendingConfirmation(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/send-confirmation`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to send confirmation");
        return;
      }
      toast.success("Confirmation email sent");
    } catch {
      toast.error("Failed to send confirmation");
    } finally {
      setSendingConfirmation(false);
    }
  };

  const handleViewAircraft = async () => {
    if (navigatingAircraft) return;
    setNavigatingAircraft(true);
    try {
      const res = await fetch(`/api/bookings?id=${bookingId}`);
      const data = await res.json();
      const aircraftId = data?.booking?.aircraft?.id || data?.booking?.aircraft_id;
      if (!aircraftId) {
        toast.error("No aircraft linked to this booking");
        return;
      }
      router.push(`/dashboard/aircraft/view/${aircraftId}`);
    } catch {
      toast.error("Failed to open aircraft");
    } finally {
      setNavigatingAircraft(false);
    }
  };

  const handleViewDebrief = () => {
    router.push(`/dashboard/bookings/debrief/view/${bookingId}`);
  };

  // Helper function to render instructor comments indicator badge
  const renderCommentsIndicator = () => {
    // Don't render until component is mounted to prevent hydration mismatch
    if (!mounted) return null;

    // Only show indicator if there are comments and user is not restricted
    if (instructorCommentsCount === 0 || isRestrictedUser) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-white cursor-help">
              <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                <MessageCircle className="w-2 h-2 text-white" strokeWidth={3} />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{instructorCommentsCount} Instructor Comment{instructorCommentsCount !== 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button variant="outline" className="h-10 px-6 text-base font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-gray-300">
        Options <ChevronDown className="w-4 h-4" />
      </Button>
    );
  }

  // Hide options button for restricted users viewing completed bookings (no options would be available)
  if (isRestrictedUser && bookingStatus === 'complete') {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <Button variant="outline" className="h-10 px-6 text-base font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-gray-300">
              Options <ChevronDown className="w-4 h-4" />
            </Button>
            {renderCommentsIndicator()}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56">
          {!isRestrictedUser && (
            <>
              <DropdownMenuItem onClick={() => setCommentsOpen(true)}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Instructor Comments
                {instructorCommentsCount > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {instructorCommentsCount}
                  </span>
                )}
              </DropdownMenuItem>
              {bookingStatus !== 'complete' && (
                <DropdownMenuItem onClick={handleSendConfirmation}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Confirmation
                </DropdownMenuItem>
              )}
              {bookingStatus !== 'complete' && (
                <DropdownMenuItem onClick={handleViewAircraft}>
                  <Plane className="w-4 h-4 mr-2" />
                  View Aircraft
                </DropdownMenuItem>
              )}
              {hasLessonProgress && (
                <DropdownMenuItem onClick={handleViewDebrief}>
                  <FileText className="w-4 h-4 mr-2" />
                  View Debrief
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          {bookingStatus === 'cancelled' ? (
            <DropdownMenuItem asChild>
              <UncancelBookingWrapper
                bookingId={bookingId}
                variant="ghost"
                size="sm"
              />
            </DropdownMenuItem>
          ) : bookingStatus !== 'complete' && (
            <DropdownMenuItem onClick={() => setCancelOpen(true)} className="text-red-600">
              <X className="w-4 h-4 mr-2" />
              Cancel Booking
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <InstructorCommentsModal
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        bookingId={bookingId}
      />

      <CancelBookingModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={handleCancelSubmit}
        categories={cancellationCategories}
        loading={loadingCategories || cancelling}
        error={categoriesError ? "Failed to load cancellation categories" : undefined}
      />
    </>
  );
} 