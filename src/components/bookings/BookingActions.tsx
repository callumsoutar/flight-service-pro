// This file has been moved to src/components/bookings/BookingActions.tsx

"use client";
import { Button } from "@/components/ui/button";
import { Plane, ClipboardCheck } from "lucide-react";
import Link from "next/link";

interface BookingActionsProps {
  status: string;
  bookingId: string;
  hideCheckOutButton?: boolean;
}

export default function BookingActions({ status, bookingId, hideCheckOutButton = false }: BookingActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3">
      {status === "confirmed" && !hideCheckOutButton && (
        <Button asChild className="h-10 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-300">
          <Link href={`/dashboard/bookings/check-out/${bookingId}`}>
            <Plane className="w-5 h-5 mr-1" />
            Check Flight Out
          </Link>
        </Button>
      )}
      {status === "flying" && (
        <Button asChild className="h-10 px-6 text-base font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-green-300">
          <Link href={`/dashboard/bookings/check-in/${bookingId}`}>
            <ClipboardCheck className="w-5 h-5 mr-1" />
            Check Flight In
          </Link>
        </Button>
      )}
    </div>
  );
} 