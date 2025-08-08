"use client";
import { Plane, CalendarIcon, UserIcon, BadgeCheck, ClipboardList as ClipboardListIcon, StickyNote, AlignLeft, ClipboardList, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import React from "react";
import { useForm, Controller } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { Booking } from "@/types/bookings";
import { BookingDetails } from "@/types/booking_details";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";
import InstructorSelect from "@/components/invoices/InstructorSelect";
import { useCheckOutSave, useAircraftMeters, useInstructorValue } from "@/hooks/use-checkout";



// Type for booking details data (matches CheckOutParams.bookingDetailsData)
type BookingDetailsData = {
  id?: string;
  eta?: string | null;
  fuel_on_board?: number;
  passengers?: string;
  route?: string;
  remarks?: string;
  booking_id: string;
};

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

// Helper to combine date and time strings into a UTC ISO string
function getUtcIsoString(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // JS Date months are 0-based
  const local = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return local.toISOString();
}

export default function CheckOutForm({ booking, members, instructors, aircraft, lessons, flightTypes, bookingDetails }: CheckOutFormProps) {
  // Check if booking is read-only (completed bookings cannot be edited)
  const isReadOnly = booking.status === 'complete';
  
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
  // Proper fallback logic: checked_out_instructor_id first, then instructor_id, then empty
  const checkedOutInstructorDefault = booking?.checked_out_instructor_id || booking?.instructor_id || "";
  
  const { control, handleSubmit, watch } = useForm<CheckOutFormData>({
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

  const router = useRouter();
  
  // Watch form fields
  const watchedAircraftId = watch("checked_out_aircraft_id");
  const watchedInstructorId = watch("checked_out_instructor_id");
  
  // Use optimized hooks for data fetching
  const { data: selectedAircraftMeters, isLoading: isLoadingAircraftMeters } = useAircraftMeters(watchedAircraftId);
  const instructorValue = useInstructorValue(
    watchedInstructorId,
    instructors,
    booking?.instructor ? {
      id: booking.instructor.id,
      user_id: booking.instructor.id, // User ID is the same as instructor ID in the users table
      users: {
        first_name: booking.instructor.first_name || '',
        last_name: booking.instructor.last_name || '',
        email: booking.instructor.email || ''
      }
    } : null
  );
  
  // Use optimized mutation for save operations
  const { mutate: saveCheckOut, isPending: saving } = useCheckOutSave();



  const onSubmit = async (data: CheckOutFormData) => {
    // Use robust UTC ISO string logic for start_time and end_time
    const start_time = getUtcIsoString(data.start_date, data.start_time);
    const end_time = getUtcIsoString(data.end_date, data.end_time);
    
    // Prepare booking data
    const bookingData: Record<string, unknown> = {};
    
    // Only include fields that have valid values (empty strings will be sanitized in the hook)
    if (data.checked_out_aircraft_id) bookingData.checked_out_aircraft_id = data.checked_out_aircraft_id;
    if (data.checked_out_instructor_id) bookingData.checked_out_instructor_id = data.checked_out_instructor_id;
    if (start_time) bookingData.start_time = start_time;
    if (end_time) bookingData.end_time = end_time;
    if (data.member) bookingData.user_id = data.member;
    if (data.lesson) bookingData.lesson_id = data.lesson;
    if (data.remarks && data.remarks.trim() !== '') bookingData.remarks = data.remarks;
    if (data.purpose && data.purpose.trim() !== '') bookingData.purpose = data.purpose;
    if (data.flight_type) bookingData.flight_type_id = data.flight_type;
    if (data.booking_type) bookingData.booking_type = data.booking_type;
    
    // Always set status to 'flying' if not already
    bookingData.status = booking.status !== 'flying' ? 'flying' : booking.status;
    
    // Include aircraft meter readings as start values
    if (selectedAircraftMeters?.current_hobbs != null) {
      bookingData.hobbs_start = Number(selectedAircraftMeters.current_hobbs);
    }
    if (selectedAircraftMeters?.current_tach != null) {
      bookingData.tach_start = Number(selectedAircraftMeters.current_tach);
    }
    
    // Prepare booking details data
    const bookingDetailsData: BookingDetailsData = {
      booking_id: booking.id,
    };
    
    if (bookingDetails?.id) {
      bookingDetailsData.id = bookingDetails.id;
    }
    
    const etaIso = getUtcIsoString(data.eta_date, data.eta_time);
    if (etaIso) bookingDetailsData.eta = etaIso;
    if (data.fuel_on_board && data.fuel_on_board.trim() !== '') {
      const fuelValue = parseInt(data.fuel_on_board, 10);
      if (!isNaN(fuelValue)) bookingDetailsData.fuel_on_board = fuelValue;
    }
    if (data.passengers && data.passengers.trim() !== '') bookingDetailsData.passengers = data.passengers;
    if (data.route && data.route.trim() !== '') bookingDetailsData.route = data.route;
    if (data.remarks_flight_out && data.remarks_flight_out.trim() !== '') bookingDetailsData.remarks = data.remarks_flight_out;
    
    // Save using optimized mutation
    saveCheckOut({
      bookingId: booking.id,
      bookingData,
      bookingDetailsData: Object.keys(bookingDetailsData).length > 1 ? bookingDetailsData : undefined,
    });
    
    // Refresh the page after successful save (handled by mutation onSuccess)
    router.refresh();
  };

  // Helper to find UserResult for a given member id
  function getUserResultById(id: string): UserResult | null {
    const m = members.find(m => m.id === id);
    if (!m) return null;
    const [first_name, ...rest] = m.name.split(" ");
    return {
      id: m.id,
      first_name: first_name || "",
      last_name: rest.join(" ") || "",
      email: "",
    };
  }

  return (
    <div className="flex w-full max-w-6xl mx-auto gap-4 mt-8">
      <div className="flex-[2] bg-white border rounded-xl p-8 min-h-[300px] shadow-sm">
        {/* Check-Out Details form content (excluding Flight Information) */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Plane className="w-6 h-6 text-primary" /> Check-Out Details
            {isReadOnly && (
              <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-600 text-sm font-normal rounded-lg border">
                Read Only - Booking Complete
              </span>
            )}
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
                              disabled={isReadOnly}
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
                      <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
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
                              disabled={isReadOnly}
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
                      <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
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
              <Controller
                name="member"
                control={control}
                render={({ field }) => {
                  const memberValue = getUserResultById(field.value);
                  return (
                    <MemberSelect
                      value={memberValue}
                      onSelect={user => {
                        field.onChange(user ? user.id : "");
                      }}
                      disabled={isReadOnly}
                    />
                  );
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Instructor</label>
              <Controller
                name="checked_out_instructor_id"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <InstructorSelect
                      value={instructorValue}
                      onSelect={instructor => {
                        field.onChange(instructor ? instructor.id : "");
                      }}
                      disabled={isReadOnly}
                    />
                    {watchedInstructorId && !instructorValue && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-md">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
          {/* Aircraft, Flight Type, Lesson, Booking Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Plane className="w-4 h-4" /> Aircraft</label>
              <Controller name="checked_out_aircraft_id" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
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
              {/* Display current meter readings with loading state */}
              {watchedAircraftId && (
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  {isLoadingAircraftMeters ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading aircraft meters...</span>
                    </div>
                  ) : selectedAircraftMeters ? (
                    <>
                      <div>Current Hobbs: {selectedAircraftMeters.current_hobbs !== null ? selectedAircraftMeters.current_hobbs.toFixed(1) : 'N/A'}</div>
                      <div>Current Tacho: {selectedAircraftMeters.current_tach !== null ? selectedAircraftMeters.current_tach.toFixed(1) : 'N/A'}</div>
                      <div className="text-blue-600 font-medium">These values will be recorded as flight start readings</div>
                    </>
                  ) : (
                    <div className="text-amber-600">No meter data available</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> Flight Type</label>
              <Controller name="flight_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
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
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
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
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              />
            )}
          />
        </div>
        {/* Save Check-Out button: full width, green, at bottom of right column */}
        {!isReadOnly && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white mt-8 flex items-center justify-center gap-2" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Check-Out"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
} 