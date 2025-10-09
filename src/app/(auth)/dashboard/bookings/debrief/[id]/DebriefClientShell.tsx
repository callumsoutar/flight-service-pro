"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import DebriefFormClient, { DebriefFormClientHandle } from "./DebriefFormClient";
import { StatusBadge } from "@/components/bookings/StatusBadge";
import { Booking, BookingStatus } from "@/types/bookings";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";

interface DebriefClientShellProps {
  booking: Booking;
  member: { id: string; first_name?: string; last_name?: string };
  status: string;
  BookingStages: React.ReactNode;
}

const DebriefClientShell: React.FC<DebriefClientShellProps> = ({ booking, member, status, BookingStages }) => {
  const debriefFormRef = useRef<DebriefFormClientHandle>(null);
  const router = useRouter();
  const [hasInvoice, setHasInvoice] = useState<boolean | null>(null);

  // Check if invoice exists when component mounts for button text
  useEffect(() => {
    const checkInvoice = async () => {
      try {
        const res = await fetch(`/api/invoices?booking_id=${booking.id}`);
        const data = await res.json();
        setHasInvoice(data.invoices && data.invoices.length > 0);
      } catch {
        setHasInvoice(false);
      }
    };
    if (booking.id) {
      checkInvoice();
    }
  }, [booking.id]);

  const handleSaveAndReview = async () => {
    if (debriefFormRef.current) {
      await debriefFormRef.current.saveAllFormData();
      // Navigate to the debrief view page
      router.push(`/dashboard/bookings/debrief/view/${booking.id}`);
    }
  };

  const handleSaveAndInvoice = async () => {
    if (debriefFormRef.current) {
      await debriefFormRef.current.saveAllFormData();
      const invoiceId = debriefFormRef.current.getInvoiceId();
      if (invoiceId) {
        router.push(`/dashboard/invoices/view/${invoiceId}`);
      } else {
        // If no invoice exists, navigate to booking complete to create one
        router.push(`/dashboard/bookings/complete/${booking.id}`);
      }
    }
  };

  return (
    <>
      {/* Title and actions row */}
      <div className="flex flex-row items-center w-full mb-2 gap-4">
        <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
          <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Debrief Booking</h1>
          {booking.user_id && (
            <BookingMemberLink
              userId={booking.user_id}
              firstName={member.first_name}
              lastName={member.last_name}
            />
          )}
        </div>
                  <StatusBadge status={status as BookingStatus} className="text-lg px-4 py-2 font-semibold" />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 px-6 text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl shadow-sm transition-all"
            onClick={handleSaveAndReview}
          >
            Save & Review
          </Button>
          <Button
            className="h-10 px-6 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-indigo-300"
            onClick={handleSaveAndInvoice}
            title={hasInvoice ? "Save debrief and continue to payment" : "Save debrief and create invoice"}
          >
            Continue to Payment
            <Receipt className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {BookingStages}
      <DebriefFormClient ref={debriefFormRef} booking={booking} member={member} />
    </>
  );
};

export default DebriefClientShell; 