"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface ConfirmBookingButtonProps {
  bookingId: string;
  onConfirmed?: () => void;
}

export default function ConfirmBookingButton({ bookingId, onConfirmed }: ConfirmBookingButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, status: "confirmed" }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error || "Failed to confirm booking");
      } else {
        if (onConfirmed) onConfirmed();
      }
    } catch {
      console.error("Failed to confirm booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleConfirm}
      disabled={loading}
      className="h-10 px-6 text-base font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer hover:ring-2 hover:ring-green-300"
    >
      <CheckCircle2 className="w-5 h-5 mr-1" />
      {loading ? "Confirming..." : "Confirm Booking"}
    </Button>
  );
} 