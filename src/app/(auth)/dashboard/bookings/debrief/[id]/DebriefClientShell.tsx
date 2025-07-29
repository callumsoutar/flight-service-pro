"use client";
import React, { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BookingMemberLink from "@/components/bookings/BookingMemberLink";
import DebriefFormClient, { DebriefFormClientHandle } from "./DebriefFormClient";
import { STATUS_BADGE } from "@/components/bookings/statusBadge";
import { Booking, BookingStatus } from "@/types/bookings";

interface DebriefClientShellProps {
  booking: Booking;
  member: { id: string; first_name?: string; last_name?: string };
  status: string;
  BookingStages: React.ReactNode;
}

const DebriefClientShell: React.FC<DebriefClientShellProps> = ({ booking, member, status, BookingStages }) => {
  const debriefFormRef = useRef<DebriefFormClientHandle>(null);

  const handleSaveAndContinue = () => {
    if (debriefFormRef.current) {
      debriefFormRef.current.saveAllFormData();
    }
  };

  return (
    <>
      {/* Title and actions row */}
      <div className="flex flex-row items-center w-full mb-2 gap-4">
        <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
          <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Debrief Booking</h1>
          <BookingMemberLink
            userId={booking.user_id}
            firstName={member.first_name}
            lastName={member.last_name}
          />
        </div>
        <Badge className={STATUS_BADGE[status as BookingStatus].color + " text-lg px-4 py-2 font-semibold"}>{STATUS_BADGE[status as BookingStatus].label}</Badge>
        <Button
          className="h-10 px-6 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-indigo-300"
          onClick={handleSaveAndContinue}
        >
          Save and Continue
        </Button>
      </div>
      {BookingStages}
      <DebriefFormClient ref={debriefFormRef} booking={booking} member={member} />
    </>
  );
};

export default DebriefClientShell; 