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
import { ChevronDown, X, MessageCircle } from "lucide-react";
import InstructorCommentsModal from "@/components/bookings/InstructorCommentsModal";
import { CancelBookingModal } from "@/components/bookings/CancelBookingModal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BookingStagesOptionsProps {
  bookingId: string;
  instructorCommentsCount?: number;
}

export default function BookingStagesOptions({ bookingId, instructorCommentsCount = 0 }: BookingStagesOptionsProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancellationCategories, setCancellationCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!cancelOpen) return;
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
  }, [cancelOpen]);

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
          <Button variant="outline" className="h-10 px-6 text-base font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-gray-300">
            Options <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setCommentsOpen(true)}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Instructor Comments
            {instructorCommentsCount > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {instructorCommentsCount}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCancelOpen(true)} className="text-red-600">
            <X className="w-4 h-4 mr-2" />
            Cancel Booking
          </DropdownMenuItem>
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
      />
    </>
  );
} 