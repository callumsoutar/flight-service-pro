"use client";
import { Plane, CalendarIcon, UserIcon, BadgeCheck, ClipboardList as ClipboardListIcon, StickyNote, AlignLeft, ClipboardList, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { Booking } from "@/types/bookings";
import { BookingDetails } from "@/types/booking_details";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Helper to generate 30-min interval times
const TIME_OPTIONS = Array.from({ length: ((23 - 7) * 2) + 3 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

interface CheckOutFormData {
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  member: string;
  lesson: string;
  remarks: string;
  purpose: string;
  flight_type: string;
  booking_type: string;
  checked_out_aircraft_id: string;
  checked_out_instructor_id: string;
  eta_date: string;
  eta_time: string;
  fuel_on_board: string;
  passengers: string;
  route: string;
  remarks_flight_out: string;
}

interface CheckOutFormProps {
  booking: Booking;
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraft: { id: string; registration: string; type: string }[];
  lessons: { id: string; name: string }[];
  flightTypes: { id: string; name: string }[];
  bookingDetails: BookingDetails | null;
}

export default function CheckOutForm({ booking, members, instructors, aircraft, lessons, flightTypes, bookingDetails }: CheckOutFormProps) {
  // Parse eta into date and time for default values
  let etaDateDefault = "";
  let etaTimeDefault = "";
  if (bookingDetails?.eta) {
    try {
      const etaDateObj = parseISO(bookingDetails.eta);
      etaDateDefault = format(etaDateObj, "yyyy-MM-dd");
      etaTimeDefault = format(etaDateObj, "HH:mm");
    } catch {}
  }
  const checkedOutAircraftDefault = booking?.checked_out_aircraft_id || booking?.aircraft_id || "";
  const checkedOutInstructorDefault = booking?.checked_out_instructor_id || booking?.instructor_id || "";
  const { control, handleSubmit } = useForm<CheckOutFormData>({
    defaultValues: {
      start_date: booking?.start_time ? format(parseISO(booking.start_time), "yyyy-MM-dd") : "",
      start_time: booking?.start_time ? format(parseISO(booking.start_time), "HH:mm") : "",
      end_date: booking?.end_time ? format(parseISO(booking.end_time), "yyyy-MM-dd") : "",
      end_time: booking?.end_time ? format(parseISO(booking.end_time), "HH:mm") : "",
      member: booking?.user_id || "",
      lesson: booking?.lesson_id ?? "",
      remarks: booking?.remarks || "",
      purpose: booking?.purpose || "",
      flight_type: booking?.flight_type_id ?? "",
      booking_type: booking?.booking_type || "flight",
      checked_out_aircraft_id: checkedOutAircraftDefault,
      checked_out_instructor_id: checkedOutInstructorDefault,
      eta_date: etaDateDefault,
      eta_time: etaTimeDefault,
      fuel_on_board: bookingDetails?.fuel_on_board?.toString() || "",
      passengers: bookingDetails?.passengers || "",
      route: bookingDetails?.route || "",
      remarks_flight_out: bookingDetails?.remarks || "",
    },
  });

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Store initial values for comparison
  const initialBooking = {
    checked_out_aircraft_id: booking?.checked_out_aircraft_id || booking?.aircraft_id || "",
    checked_out_instructor_id: booking?.checked_out_instructor_id || booking?.instructor_id || "",
    start_date: booking?.start_time ? format(parseISO(booking.start_time), "yyyy-MM-dd") : "",
    start_time: booking?.start_time ? format(parseISO(booking.start_time), "HH:mm") : "",
    end_date: booking?.end_time ? format(parseISO(booking.end_time), "yyyy-MM-dd") : "",
    end_time: booking?.end_time ? format(parseISO(booking.end_time), "HH:mm") : "",
    member: booking?.user_id || "",
    lesson: booking?.lesson_id ?? "",
    remarks: booking?.remarks || "",
    purpose: booking?.purpose || "",
    flight_type: booking?.flight_type_id ?? "",
    booking_type: booking?.booking_type || "flight",
  };
  const initialDetails = {
    eta_date: bookingDetails?.eta ? format(parseISO(bookingDetails.eta), "yyyy-MM-dd") : "",
    eta_time: bookingDetails?.eta ? format(parseISO(bookingDetails.eta), "HH:mm") : "",
    fuel_on_board: bookingDetails?.fuel_on_board?.toString() || "",
    passengers: bookingDetails?.passengers || "",
    route: bookingDetails?.route || "",
    remarks_flight_out: bookingDetails?.remarks || "",
  };

  const onSubmit = async (data: CheckOutFormData) => {
    setLoading(true);
    const bookingPatch: Record<string, unknown> = {};
    const detailsPatch: Record<string, unknown> = {};
    // Compare and add changed fields for bookings
    if (data.checked_out_aircraft_id !== initialBooking.checked_out_aircraft_id) bookingPatch.checked_out_aircraft_id = data.checked_out_aircraft_id;
    if (data.checked_out_instructor_id !== initialBooking.checked_out_instructor_id) bookingPatch.checked_out_instructor_id = data.checked_out_instructor_id;
    if (data.start_date !== initialBooking.start_date || data.start_time !== initialBooking.start_time) {
      const start = data.start_date && data.start_time ? `${data.start_date}T${data.start_time}:00Z` : null;
      if (start && start !== booking.start_time) bookingPatch.start_time = start;
    }
    if (data.end_date !== initialBooking.end_date || data.end_time !== initialBooking.end_time) {
      const end = data.end_date && data.end_time ? `${data.end_date}T${data.end_time}:00Z` : null;
      if (end && end !== booking.end_time) bookingPatch.end_time = end;
    }
    if (data.member !== initialBooking.member) bookingPatch.user_id = data.member;
    if (data.lesson !== initialBooking.lesson) bookingPatch.lesson_id = data.lesson;
    if (data.remarks !== initialBooking.remarks) bookingPatch.remarks = data.remarks;
    if (data.purpose !== initialBooking.purpose) bookingPatch.purpose = data.purpose;
    if (data.flight_type !== initialBooking.flight_type) bookingPatch.flight_type_id = data.flight_type;
    if (data.booking_type !== initialBooking.booking_type) bookingPatch.booking_type = data.booking_type;
    // Always set status to 'flying' if not already
    if (booking.status !== 'flying') bookingPatch.status = 'flying';

    // Compare and add changed fields for booking_details
    if (data.eta_date !== initialDetails.eta_date || data.eta_time !== initialDetails.eta_time) {
      if (data.eta_date && data.eta_time) {
        detailsPatch.eta = `${data.eta_date}T${data.eta_time}:00Z`;
      }
    }
    if (data.fuel_on_board !== initialDetails.fuel_on_board) detailsPatch.fuel_on_board = data.fuel_on_board;
    if (data.passengers !== initialDetails.passengers) detailsPatch.passengers = data.passengers;
    if (data.route !== initialDetails.route) detailsPatch.route = data.route;
    if (data.remarks_flight_out !== initialDetails.remarks_flight_out) detailsPatch.remarks = data.remarks_flight_out;

    try {
      if (Object.keys(bookingPatch).length > 0) {
        const bookingRes = await fetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: booking.id, ...bookingPatch }),
        });
        if (!bookingRes.ok) throw new Error("Failed to update booking");
      }
      if (Object.keys(detailsPatch).length > 0) {
        const detailsRes = await fetch("/api/booking_details", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: booking.id, ...detailsPatch }),
        });
        if (!detailsRes.ok) throw new Error("Failed to update booking details");
      }
      toast.success("Check-Out details saved successfully!");
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to save check-out details");
      } else {
        toast.error("Failed to save check-out details");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-6xl mx-auto gap-4 mt-8">
      <div className="flex-[2] bg-white border rounded-xl p-8 min-h-[300px] shadow-sm">
        {/* Check-Out Details form content (excluding Flight Information) */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Plane className="w-6 h-6 text-primary" /> Check-Out Details
          </div>
          {/* Scheduled Times */}
          <div className="border rounded-xl p-6 bg-muted/50 mb-8">
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" /> SCHEDULED TIMES
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-semibold mb-2">START TIME</label>
                <div className="flex flex-col gap-2 items-start">
                  <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => {
                      const value = field.value ? new Date(field.value) : undefined;
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-44 justify-start text-left font-normal overflow-hidden text-ellipsis whitespace-nowrap",
                                !value && "text-muted-foreground"
                              )}
                              type="button"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {value ? format(value, "dd MMM yyyy") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={value}
                              onSelect={date => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      );
                    }}
                  />
                  <Controller
                    name="start_time"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {booking?.start_time ? format(parseISO(booking.start_time), "dd MMM yyyy") : ""}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2">END TIME</label>
                <div className="flex flex-col gap-2 items-start">
                  <Controller
                    name="end_date"
                    control={control}
                    render={({ field }) => {
                      const value = field.value ? new Date(field.value) : undefined;
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-44 justify-start text-left font-normal overflow-hidden text-ellipsis whitespace-nowrap",
                                !value && "text-muted-foreground"
                              )}
                              type="button"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {value ? format(value, "dd MMM yyyy") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={value}
                              onSelect={date => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      );
                    }}
                  />
                  <Controller
                    name="end_time"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {booking?.end_time ? format(parseISO(booking.end_time), "dd MMM yyyy") : ""}
                </div>
              </div>
            </div>
          </div>
          {/* Member/Instructor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Member</label>
              <Controller name="member" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Instructor</label>
              <Controller name="checked_out_instructor_id" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          {/* Aircraft, Flight Type, Lesson, Booking Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Plane className="w-4 h-4" /> Aircraft</label>
              <Controller name="checked_out_aircraft_id" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select aircraft" />
                  </SelectTrigger>
                  <SelectContent>
                    {aircraft.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.registration} ({a.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> Flight Type</label>
              <Controller name="flight_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select flight type" />
                  </SelectTrigger>
                  <SelectContent>
                    {flightTypes.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><BookOpen className="w-4 h-4" /> Lesson</label>
              <Controller name="lesson" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><ClipboardListIcon className="w-4 h-4" /> Booking Type</label>
              <Controller name="booking_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select booking type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["flight", "groundwork", "maintenance", "other"].map((type) => (
                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          {/* Remarks & Purpose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><StickyNote className="w-4 h-4" /> Booking Remarks</label>
              <Controller name="remarks" control={control} render={({ field }) => (
                <textarea
                  {...field}
                  className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top"
                  rows={4}
                />
              )} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><AlignLeft className="w-4 h-4" /> Description</label>
              <Controller name="purpose" control={control} render={({ field }) => (
                <textarea
                  {...field}
                  className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top"
                  rows={4}
                />
              )} />
            </div>
          </div>
        </form>
      </div>
      <div className="flex-[1] bg-white border rounded-xl p-8 min-h-[300px] shadow-sm">
        {/* Flight Information content from Check-OutDetailsForm */}
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" /> Flight Information
        </div>
        {/* TODO: Map these fields to booking/flight data as needed */}
        {/* ETA */}
        <div className="mb-6">
          <label className="block text-xs font-semibold mb-2">ETA</label>
          <div className="flex flex-col gap-2 items-start">
            <Controller
              name="eta_date"
              control={control}
              render={({ field }) => {
                const value = field.value ? new Date(field.value) : undefined;
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-44 justify-start text-left font-normal overflow-hidden text-ellipsis whitespace-nowrap",
                          !value && "text-muted-foreground"
                        )}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? format(value, "dd MMM yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={value}
                        onSelect={date => {
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                );
              }}
            />
            <Controller
              name="eta_time"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        {/* Fuel on Board */}
        <div className="mb-6">
          <label className="block text-xs font-semibold mb-2">FUEL ON BOARD</label>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">L</span>
            <Controller
              name="fuel_on_board"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  {...field}
                  className="w-20 rounded-md border border-input bg-transparent px-2 py-1 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                />
              )}
            />
            <span className="ml-4 text-sm text-muted-foreground">Total: -- (<span className="text-blue-600 cursor-pointer hover:underline">-- safe endurance</span>)</span>
          </div>
        </div>
        {/* Passengers */}
        <div className="mb-6">
          <label className="block text-xs font-semibold mb-2">PASSENGERS</label>
          <Controller
            name="passengers"
            control={control}
            render={({ field }) => (
              <input
                type="text"
                {...field}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              />
            )}
          />
        </div>
        {/* Route */}
        <div className="mb-6">
          <label className="block text-xs font-semibold mb-2">ROUTE</label>
          <Controller
            name="route"
            control={control}
            render={({ field }) => (
              <input
                type="text"
                {...field}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              />
            )}
          />
        </div>
        {/* Remarks (Flight Out) */}
        <div className="mb-2">
          <label className="block text-xs font-semibold mb-2">REMARKS (FLIGHT OUT)</label>
          <Controller
            name="remarks_flight_out"
            control={control}
            render={({ field }) => (
              <input
                type="text"
                {...field}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              />
            )}
          />
        </div>
        {/* Save Check-Out button: full width, green, at bottom of right column */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white mt-8" disabled={loading}>
            {loading ? "Saving..." : "Save Check-Out"}
          </Button>
        </form>
      </div>
    </div>
  );
} 