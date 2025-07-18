"use client";
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, X, Mail, MessageCircle } from "lucide-react";
import InstructorCommentsModal from "@/components/bookings/InstructorCommentsModal";
import { CancelBookingModal } from "@/components/bookings/CancelBookingModal";
import { useOrgContext } from "@/components/OrgContextProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BookingStagesOptionsProps {
  bookingId: string;
  instructorCommentsCount?: number;
}

export default function BookingStagesOptions({ bookingId, instructorCommentsCount = 0 }: BookingStagesOptionsProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { currentOrgId } = useOrgContext();
  const [cancellationCategories, setCancellationCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!cancelOpen || !currentOrgId) return;
    setLoadingCategories(true);
    fetch(`/api/cancellation_categories`)
      .then((res) => res.json())
      .then((data) => {
        setCancellationCategories(Array.isArray(data.categories) ? data.categories : []);
        setLoadingCategories(false);
      })
      .catch(() => {
        setCancellationCategories([]);
        setLoadingCategories(false);
      });
  }, [cancelOpen, currentOrgId]);

  const handleCancelSubmit = async (data: { categoryId: string; reason: string }) => {
    setCancelling(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          status: "cancelled",
          cancellation_reason: data.reason,
          cancellation_category_id: data.categoryId,
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-6 text-base font-bold flex items-center gap-2 rounded-xl border border-gray-200 shadow-sm bg-white transition-colors duration-150 hover:bg-gray-100 hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
          >
            Options <ChevronDown className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuItem onClick={() => setCancelOpen(true)} className="text-destructive text-sm py-2 flex items-center gap-2 w-full">
            <X className="w-4 h-4" />
            <span className="flex-1 text-left">Cancel Booking</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => {/* TODO: Email confirmation logic */}} className="text-sm py-2 flex items-center gap-2 w-full">
            <Mail className="w-4 h-4" />
            <span className="flex-1 text-left">Email Confirmation</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCommentsOpen(true)} className="text-sm py-2 flex items-center gap-2 w-full">
            <MessageCircle className="w-4 h-4" />
            <span className="flex-1 text-left">Instructor Comments</span>
            <span className={`ml-2 inline-flex items-center justify-center rounded-full font-bold text-white text-xs h-5 w-5 ${instructorCommentsCount >= 1 ? 'bg-red-600' : 'bg-blue-600'}`}
              aria-label={`Instructor comments count: ${instructorCommentsCount}`}
            >
              {instructorCommentsCount}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CancelBookingModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={handleCancelSubmit}
        categories={cancellationCategories}
        loading={loadingCategories || cancelling}
      />
      <InstructorCommentsModal bookingId={bookingId} open={commentsOpen} onOpenChange={setCommentsOpen} />
    </>
  );
} 