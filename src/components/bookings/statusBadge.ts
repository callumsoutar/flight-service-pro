import type { Booking } from "@/types/bookings";

export const STATUS_BADGE: Record<Booking["status"], { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800" },
  unconfirmed: { label: "Unconfirmed", color: "bg-orange-100 text-orange-700" },
  briefing: { label: "Briefing", color: "bg-yellow-100 text-yellow-800" },
  flying: { label: "Flying", color: "bg-blue-100 text-blue-800" },
  complete: { label: "Complete", color: "bg-violet-100 text-violet-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
}; 