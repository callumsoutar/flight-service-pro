"use client";
import { Plane, CalendarIcon, UserIcon, BadgeCheck, ClipboardList as ClipboardListIcon, StickyNote, AlignLeft, ClipboardList, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { Booking } from "@/types/bookings";
import { BookingDetails } from "@/types/booking_details";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";
import InstructorSelect, { InstructorResult } from "@/components/invoices/InstructorSelect";

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

  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [instructorValue, setInstructorValue] = useState<InstructorResult | null>(null);
  // Track selected aircraft's current meter readings
  const [selectedAircraftMeters, setSelectedAircraftMeters] = useState<{
    current_hobbs: number | null;
    current_tach: number | null;
  } | null>(null);



  const onSubmit = async (data: CheckOutFormData) => {
    setLoading(true);
    // Use robust UTC ISO string logic for start_time and end_time
    const start_time = getUtcIsoString(data.start_date, data.start_time);
    const end_time = getUtcIsoString(data.end_date, data.end_time);
    // Always include all booking fields in the PATCH
    const bookingPatch: Record<string, unknown> = {};
    
    // Only include fields that have valid values
    if (data.checked_out_aircraft_id) bookingPatch.checked_out_aircraft_id = data.checked_out_aircraft_id;
    if (data.checked_out_instructor_id) bookingPatch.checked_out_instructor_id = data.checked_out_instructor_id;
    if (start_time) bookingPatch.start_time = start_time;
    if (end_time) bookingPatch.end_time = end_time;
    if (data.member) bookingPatch.user_id = data.member;
    if (data.lesson) bookingPatch.lesson_id = data.lesson;
    if (data.remarks && data.remarks.trim() !== '') bookingPatch.remarks = data.remarks;
    if (data.purpose && data.purpose.trim() !== '') bookingPatch.purpose = data.purpose;
    if (data.flight_type) bookingPatch.flight_type_id = data.flight_type;
    if (data.booking_type) bookingPatch.booking_type = data.booking_type;
    
    // Always set status to 'flying' if not already
    bookingPatch.status = booking.status !== 'flying' ? 'flying' : booking.status;
    
    // Include aircraft meter readings as start values
    if (selectedAircraftMeters?.current_hobbs != null) {
      bookingPatch.hobbs_start = Number(selectedAircraftMeters.current_hobbs);
    }
    if (selectedAircraftMeters?.current_tach != null) {
      bookingPatch.tach_start = Number(selectedAircraftMeters.current_tach);
    }
    // Compose details payload
    const detailsPatch: Record<string, unknown> = {};
    const etaIso = getUtcIsoString(data.eta_date, data.eta_time);
    if (etaIso) detailsPatch.eta = etaIso;
    if (data.fuel_on_board && data.fuel_on_board.trim() !== '') {
      const fuelValue = parseInt(data.fuel_on_board, 10);
      if (!isNaN(fuelValue)) detailsPatch.fuel_on_board = fuelValue;
    }
    if (data.passengers && data.passengers.trim() !== '') detailsPatch.passengers = data.passengers;
    if (data.route && data.route.trim() !== '') detailsPatch.route = data.route;
    if (data.remarks_flight_out && data.remarks_flight_out.trim() !== '') detailsPatch.remarks = data.remarks_flight_out;
    detailsPatch.booking_id = booking.id;
    try {
      if (Object.keys(bookingPatch).length > 0) {
        const bookingRes = await fetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: booking.id, ...bookingPatch }),
        });
        if (!bookingRes.ok) throw new Error("Failed to update booking");
      }
      // Booking details: PATCH if exists, else POST
      if (Object.keys(detailsPatch).length > 1) { // more than just booking_id
        let detailsRes;
        if (bookingDetails && bookingDetails.id) {
          detailsRes = await fetch(`/api/booking_details`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: bookingDetails.id, ...detailsPatch }),
          });
        } else {
          detailsRes = await fetch(`/api/booking_details`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(detailsPatch),
          });
        }
        if (!detailsRes.ok) throw new Error("Failed to save booking details");
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

  // Fetch aircraft meter readings when aircraft selection changes
  const fetchAircraftMeters = async (aircraftId: string) => {
    if (!aircraftId) {
      setSelectedAircraftMeters(null);
      return;
    }
    try {
      const res = await fetch(`/api/aircraft?id=${aircraftId}`);
      const data = await res.json();
      if (data.aircraft) {
        setSelectedAircraftMeters({
          current_hobbs: typeof data.aircraft.current_hobbs === 'number' ? data.aircraft.current_hobbs : null,
          current_tach: typeof data.aircraft.current_tach === 'number' ? data.aircraft.current_tach : null,
        });
      } else {
        setSelectedAircraftMeters(null);
      }
    } catch (error) {
      console.error('Failed to fetch aircraft meters:', error);
      setSelectedAircraftMeters(null);
    }
  };

  // Watch for aircraft selection changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'checked_out_aircraft_id' && value.checked_out_aircraft_id) {
        fetchAircraftMeters(value.checked_out_aircraft_id);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Effect to watch instructor field changes and fetch instructor data
  React.useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'checked_out_instructor_id') {
        const instructorFieldValue = value.checked_out_instructor_id;
        
        if (!instructorFieldValue) {
          setInstructorValue(null);
          return;
        }

        // Find the selected instructor's details for display
        const selectedInstructor = instructors.find(i => i.id === instructorFieldValue);
        
        if (selectedInstructor) {
          // Use the instructor from the list
          // Since we only have the instructor ID and name, we need to fetch the full details
          fetch(`/api/instructors?id=${selectedInstructor.id}`)
            .then(res => res.json())
            .then(data => {
              if (data.instructor && data.instructor.users) {
                const user = data.instructor.users;
                setInstructorValue({
                  id: data.instructor.id,
                  user_id: data.instructor.user_id,
                  first_name: user.first_name || "",
                  last_name: user.last_name || "",
                  email: user.email || "",
                });
              }
            })
            .catch(() => {
              // If fetch fails, create a basic instructor object
              setInstructorValue({
                id: selectedInstructor.id,
                user_id: selectedInstructor.id, // Fallback to instructor ID
                first_name: selectedInstructor.name.split(" ")[0] || "",
                last_name: selectedInstructor.name.split(" ").slice(1).join(" ") || "",
                email: "",
              });
            });
        } else {
          // Fetch the instructor data for the selected instructor_id
          fetch(`/api/instructors?id=${instructorFieldValue}`)
            .then(res => res.json())
            .then(data => {
              if (data.instructor && data.instructor.users) {
                const user = data.instructor.users;
                setInstructorValue({
                  id: data.instructor.id,
                  user_id: data.instructor.user_id,
                  first_name: user.first_name || "",
                  last_name: user.last_name || "",
                  email: user.email || "",
                });
              }
            })
            .catch(() => {
              // If fetch fails, create a basic instructor object
              setInstructorValue({
                id: instructorFieldValue,
                user_id: instructorFieldValue,
                first_name: "Unknown",
                last_name: "Instructor",
                email: "",
              });
            });
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [instructors, watch]);

  // Fetch initial aircraft meter readings if aircraft is already selected
  useEffect(() => {
    if (checkedOutAircraftDefault) {
      fetchAircraftMeters(checkedOutAircraftDefault);
    }
  }, [checkedOutAircraftDefault]);

  // Initialize instructor value with proper fallback logic
  useEffect(() => {
    // Priority: checked_out_instructor_id first, then instructor_id, then null
    const instructorId = booking?.checked_out_instructor_id || booking?.instructor_id || null;
    
    if (instructorId) {
      // Find the selected instructor's details for display
      const selectedInstructor = instructors.find(i => i.id === instructorId);
      
      if (selectedInstructor) {
        // Use the instructor from the list
        fetch(`/api/instructors?id=${selectedInstructor.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.instructor && data.instructor.users) {
              const user = data.instructor.users;
              setInstructorValue({
                id: data.instructor.id,
                user_id: data.instructor.user_id,
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
              });
            }
          })
          .catch(() => {
            // If fetch fails, create a basic instructor object
            setInstructorValue({
              id: selectedInstructor.id,
              user_id: selectedInstructor.id, // Fallback to instructor ID
              first_name: selectedInstructor.name.split(" ")[0] || "",
              last_name: selectedInstructor.name.split(" ").slice(1).join(" ") || "",
              email: "",
            });
          });
      } else {
        // Fetch the instructor data for the selected instructor_id
        fetch(`/api/instructors?id=${instructorId}`)
          .then(res => res.json())
          .then(data => {
            if (data.instructor && data.instructor.users) {
              const user = data.instructor.users;
              setInstructorValue({
                id: data.instructor.id,
                user_id: data.instructor.user_id,
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
              });
            }
          })
          .catch(() => {
            // If fetch fails, create a basic instructor object
            setInstructorValue({
              id: instructorId,
              user_id: instructorId,
              first_name: "Unknown",
              last_name: "Instructor",
              email: "",
            });
          });
      }
    } else {
      // No instructor found, clear the value
      setInstructorValue(null);
    }
  }, [booking?.checked_out_instructor_id, booking?.instructor_id, instructors]);

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
                  <InstructorSelect
                    value={instructorValue}
                    onSelect={instructor => {
                      field.onChange(instructor ? instructor.id : "");
                    }}
                  />
                )}
              />
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
              {/* Display current meter readings */}
              {selectedAircraftMeters && (
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <div>Current Hobbs: {selectedAircraftMeters.current_hobbs !== null ? selectedAircraftMeters.current_hobbs.toFixed(1) : 'N/A'}</div>
                  <div>Current Tacho: {selectedAircraftMeters.current_tach !== null ? selectedAircraftMeters.current_tach.toFixed(1) : 'N/A'}</div>
                  <div className="text-blue-600 font-medium">These values will be recorded as flight start readings</div>
                </div>
              )}
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