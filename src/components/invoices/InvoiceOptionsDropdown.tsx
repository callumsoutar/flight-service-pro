"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

export default function InvoiceOptionsDropdown({
  bookingId,
}: {
  bookingId?: string | null;
}) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 px-6 text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl shadow-sm transition-all flex items-center gap-2">
          Options <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {bookingId && (
          <>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/bookings/view/${bookingId}`)}>
              View Booking
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => alert('Resend invoice')}>Resend</DropdownMenuItem>
        <DropdownMenuItem onClick={() => alert('Mark as Paid')}>Mark as Paid</DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.print()}>Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 