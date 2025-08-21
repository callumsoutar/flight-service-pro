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
import { ChevronDown, X, MessageCircle, Send, Plane } from "lucide-react";
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
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [navigatingAircraft, setNavigatingAircraft] = useState(false);
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 px-6 text-base font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-gray-300">
            Options <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56">
          <DropdownMenuItem onClick={() => setCommentsOpen(true)}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Instructor Comments
            {instructorCommentsCount > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {instructorCommentsCount}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSendConfirmation}>
            <Send className="w-4 h-4 mr-2" />
            Send Confirmation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewAircraft}>
            <Plane className="w-4 h-4 mr-2" />
            View Aircraft
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