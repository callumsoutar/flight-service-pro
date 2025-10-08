"use client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarIcon, UserIcon, CheckIcon, Loader2, Plane, BadgeCheck, BookOpen, ClipboardList, AlignLeft, AlertTriangle } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { format, parseISO } from "date-fns";
import React, { useState, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Booking } from "@/types/bookings";
import MemberSelect from "@/components/invoices/MemberSelect";
import InstructorSelect from "@/components/invoices/InstructorSelect";
import { useBookingUpdate } from "@/hooks/use-booking-view";
import { useRouter } from "next/navigation";
import type { User } from "@/types/users";
import { PLACEHOLDER_VALUES } from "@/constants/placeholders";
import { useIsRestrictedUser } from "@/hooks/use-role-protection";

// Types to match what the hooks expect
type MemberForHook = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
} | null;

type InstructorForHook = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
} | null;

interface BookingDetailsFormData {
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  member: string;
  instructor: string;
  aircraft: string;
  lesson: string;
  remarks: string;
  purpose: string;
  flight_type: string;
  booking_type: string;
}

interface BookingDetailsProps {
  booking: Booking;
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraft: { id: string; registration: string; type: string }[];
  lessons: { id: string; name: string }[];
  flightTypes: { id: string; name: string; instruction_type?: string }[];
  bookings: Booking[]; // All bookings for conflict checking
  isRestrictedUser?: boolean;
}

// Helper to generate 30-min interval times (24-hour coverage)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

// Helper to combine date and time strings into a UTC ISO string
function getUtcIsoString(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Create a local date and convert to UTC for storage
  // The user selects local time, we need to store it as UTC
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return localDate.toISOString();
}

// Helper to extract date from UTC timestamp converted to local time
function extractDateFromUtc(utcTimestamp: string): string {
  if (!utcTimestamp) return "";
  // Convert UTC timestamp to local time and extract date
  const localDate = new Date(utcTimestamp);
  return format(localDate, "yyyy-MM-dd");
}

// Helper to extract time from UTC timestamp converted to local time
function extractTimeFromUtc(utcTimestamp: string): string {
  if (!utcTimestamp) return "";
  // Convert UTC timestamp to local time and extract time
  const localDate = new Date(utcTimestamp);
  return format(localDate, "HH:mm");
}

// Helper to convert User to MemberForHook
function convertUserToMemberForHook(user?: User): MemberForHook {
  if (!user) return null;
  return {
    id: user.id,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email,
  };
}

// Helper to convert instructor data to InstructorForHook
function convertInstructorForHook(instructor?: unknown): InstructorForHook {
  if (!instructor || typeof instructor !== 'object') return null;
  
  const obj = instructor as Record<string, unknown>;
  
  // Check if the object has the expected Instructor structure with own name fields
  if (typeof obj.id === 'string' && 
      typeof obj.user_id === 'string') {
    
    return {
      id: obj.id,
      user_id: obj.user_id,
      first_name: typeof obj.first_name === 'string' ? obj.first_name : "",
      last_name: typeof obj.last_name === 'string' ? obj.last_name : "",
      email: typeof obj.email === 'string' ? obj.email : "",
    };
  }
  
  return null;
}

export default function BookingDetails({ booking, members, instructors, aircraft, lessons, flightTypes, bookings, isRestrictedUser: serverIsRestrictedUser }: BookingDetailsProps) {
  // Check if booking is read-only (completed bookings cannot be edited)
  const isReadOnly = booking.status === 'complete';
  const router = useRouter();

  // Use server-provided isRestrictedUser if available, otherwise fall back to client hook
  const { isRestricted: clientIsRestrictedUser, isLoading: clientIsRoleLoading } = useIsRestrictedUser();
  const isRestrictedUser = serverIsRestrictedUser !== undefined ? serverIsRestrictedUser : clientIsRestrictedUser;
  const isRoleLoading = serverIsRestrictedUser !== undefined ? false : clientIsRoleLoading;

  // Prevent hydration mismatch by ensuring component is mounted
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { control, handleSubmit, reset, formState, watch, setValue } = useForm<BookingDetailsFormData>({
    defaultValues: {
      start_date: booking?.start_time ? extractDateFromUtc(booking.start_time) : "",
      start_time: booking?.start_time ? extractTimeFromUtc(booking.start_time) : "",
      end_date: booking?.end_time ? extractDateFromUtc(booking.end_time) : "",
      end_time: booking?.end_time ? extractTimeFromUtc(booking.end_time) : "",
      member: booking?.user_id || "",
      instructor: booking?.instructor_id || PLACEHOLDER_VALUES.INSTRUCTOR,
      aircraft: booking?.aircraft_id || PLACEHOLDER_VALUES.AIRCRAFT,
      lesson: booking?.lesson_id || PLACEHOLDER_VALUES.LESSON,
      remarks: booking?.remarks || "",
      purpose: booking?.purpose || "",
      flight_type: booking?.flight_type_id || PLACEHOLDER_VALUES.FLIGHT_TYPE,
      booking_type: booking?.booking_type || "flight",
    },
  });
  
  // Watch the member and instructor field values
  const memberFieldValue = watch("member");
  const instructorFieldValue = watch("instructor");
  
  // Watch flight type field to determine if instructor should be hidden
  const flightTypeFieldValue = watch("flight_type");
  
  // Watch time fields for conflict checking
  const startDate = watch("start_date");
  const startTime = watch("start_time");
  const endDate = watch("end_date");
  const endTime = watch("end_time");

  // When start date changes, auto-set end date to be at least the same as start date
  React.useEffect(() => {
    if (startDate && !isReadOnly) {
      if (!endDate || new Date(endDate).getTime() < new Date(startDate).getTime()) {
        setValue("end_date", startDate);
      }
    }
  }, [startDate, endDate, setValue, isReadOnly]);
  
  // Determine if selected flight type is solo
  const isSoloFlightType = React.useMemo(() => {
    if (flightTypeFieldValue === PLACEHOLDER_VALUES.FLIGHT_TYPE || !flightTypeFieldValue) {
      return false;
    }
    const selectedFlightType = flightTypes.find(ft => ft.id === flightTypeFieldValue);
    return selectedFlightType?.instruction_type === 'solo';
  }, [flightTypeFieldValue, flightTypes]);
  
  // Clear instructor field when solo flight type is selected
  React.useEffect(() => {
    if (isSoloFlightType && instructorFieldValue && instructorFieldValue !== PLACEHOLDER_VALUES.INSTRUCTOR) {
      setValue('instructor', PLACEHOLDER_VALUES.INSTRUCTOR);
    }
  }, [isSoloFlightType, instructorFieldValue, setValue]);
  
  // Compute unavailable aircraft/instructors for the selected time
  const unavailable = React.useMemo(() => {
    // Helper: check if two time ranges overlap
    const isOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) => {
      return startA < endB && endA > startB;
    };
    
    if (!startDate || !startTime || !endDate || !endTime) {
      return { aircraft: new Set<string>(), instructors: new Set<string>() };
    }
    
    // Parse the form date/time values
    const [year, month, day] = startDate.split('-').map(Number);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const start = new Date(year, month - 1, day, startHour, startMinute);
    const end = new Date(endYear, endMonth - 1, endDay, endHour, endMinute);
    
    const aircraftSet = new Set<string>();
    const instructorSet = new Set<string>();
    
    // Check against all active bookings (not cancelled or complete)
    const activeStatuses = ["unconfirmed", "confirmed", "briefing", "flying"];
    
    for (const b of bookings) {
      // Skip the current booking being edited
      if (b.id === booking.id) continue;
      
      if (activeStatuses.includes(b.status) && b.start_time && b.end_time) {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        if (isOverlap(start, end, bStart, bEnd)) {
          if (b.aircraft_id) aircraftSet.add(b.aircraft_id);
          if (b.instructor_id) instructorSet.add(b.instructor_id);
        }
      }
    }
    
    return { aircraft: aircraftSet, instructors: instructorSet };
  }, [bookings, startDate, startTime, endDate, endTime, booking.id]);
  
  // Use pre-loaded data directly instead of async hooks
  const memberValue = React.useMemo(() => {
    if (!memberFieldValue || memberFieldValue.trim() === "") {
      return null;
    }

    // Use existing user data from server-side join if available
    const existingUser = convertUserToMemberForHook(booking?.user);
    if (existingUser && existingUser.id === memberFieldValue) {
      return existingUser;
    }

    // Fallback to members list
    const selectedMember = members.find(m => m.id === memberFieldValue);
    if (selectedMember) {
      return {
        id: selectedMember.id,
        first_name: selectedMember.name.split(" ")[0] || "",
        last_name: selectedMember.name.split(" ").slice(1).join(" ") || "",
        email: "",
      };
    }

    return null;
  }, [memberFieldValue, members, booking?.user]);

  const instructorValue = React.useMemo(() => {
    if (!instructorFieldValue || instructorFieldValue === PLACEHOLDER_VALUES.INSTRUCTOR) {
      return null;
    }

    // Use existing instructor data from server-side join if available
    const existingInstructor = convertInstructorForHook(booking?.instructor);
    if (existingInstructor && existingInstructor.id === instructorFieldValue) {
      return existingInstructor;
    }

    // Fallback to instructors list
    const selectedInstructor = instructors.find(i => i.id === instructorFieldValue);
    if (selectedInstructor) {
      return {
        id: selectedInstructor.id,
        user_id: selectedInstructor.id,
        first_name: selectedInstructor.name.split(" ")[0] || "",
        last_name: selectedInstructor.name.split(" ").slice(1).join(" ") || "",
        email: "",
      };
    }

    return null;
  }, [instructorFieldValue, instructors, booking?.instructor]);
  
  // Use optimized mutation for saving
  const { mutate: updateBooking, isPending: saving, isSuccess: saveSuccess } = useBookingUpdate(() => {
    // Refresh the page to show updated data
    router.refresh();
  });

  const onSubmit = async (data: BookingDetailsFormData) => {
    // Check for resource conflicts before submission
    if (!isReadOnly) {
      if (data.aircraft !== PLACEHOLDER_VALUES.AIRCRAFT && data.aircraft.trim() !== "" && unavailable.aircraft.has(data.aircraft)) {
        alert("Selected aircraft is already booked during this time. Please choose a different aircraft or time slot.");
        return;
      }
      
      if (data.instructor.trim() !== "" && unavailable.instructors.has(data.instructor)) {
        alert("Selected instructor is already booked during this time. Please choose a different instructor or time slot.");
        return;
      }
    }
    
    // Compose ISO strings for start_time and end_time (robust local-to-UTC conversion)
    const start_time = getUtcIsoString(data.start_date, data.start_time);
    const end_time = getUtcIsoString(data.end_date, data.end_time);
    
    // Convert empty strings and placeholder values to null for UUID fields to prevent PostgreSQL errors
    const sanitizeUuid = (value: string) => {
      if (value.trim() === "" || 
          value === PLACEHOLDER_VALUES.AIRCRAFT || 
          value === PLACEHOLDER_VALUES.LESSON || 
          value === PLACEHOLDER_VALUES.FLIGHT_TYPE ||
          value === PLACEHOLDER_VALUES.INSTRUCTOR) {
        return null;
      }
      return value;
    };
    
    // Build update object with all required fields
    const updateData: {
      id: string;
      start_time: string | null;
      end_time: string | null;
      purpose: string;
      remarks: string;
      booking_type: string;
      instructor_id: string | null;
      user_id: string | null;
      aircraft_id: string | null;
      lesson_id: string | null;
      flight_type_id: string | null;
    } = {
      id: booking.id,
      start_time,
      end_time,
      purpose: data.purpose,
      remarks: data.remarks,
      booking_type: data.booking_type,
      instructor_id: data.instructor !== PLACEHOLDER_VALUES.INSTRUCTOR && data.instructor.trim() !== "" ? sanitizeUuid(data.instructor) : null,
      user_id: data.member.trim() !== "" ? sanitizeUuid(data.member) : null,
      aircraft_id: data.aircraft !== PLACEHOLDER_VALUES.AIRCRAFT && data.aircraft.trim() !== "" 
        ? sanitizeUuid(data.aircraft) : null,
      lesson_id: data.lesson !== PLACEHOLDER_VALUES.LESSON && data.lesson.trim() !== "" 
        ? sanitizeUuid(data.lesson) : null,
      flight_type_id: data.flight_type !== PLACEHOLDER_VALUES.FLIGHT_TYPE && data.flight_type.trim() !== "" 
        ? sanitizeUuid(data.flight_type) : null,
    };
    
    updateBooking(updateData);
  };

  return (
    <Card className="w-full h-full">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
            <span className="inline-block"><CalendarIcon className="w-6 h-6 text-primary" /></span>
            Booking Details
            {isReadOnly && (
              <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-600 text-sm font-normal rounded-lg border">
                Read Only - Booking Complete
              </span>
            )}
          </CardTitle>
          {!isReadOnly && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => reset({
                start_date: booking?.start_time ? extractDateFromUtc(booking.start_time) : "",
                start_time: booking?.start_time ? extractTimeFromUtc(booking.start_time) : "",
                end_date: booking?.end_time ? extractDateFromUtc(booking.end_time) : "",
                end_time: booking?.end_time ? extractTimeFromUtc(booking.end_time) : "",
                member: booking?.user_id || "",
                instructor: booking?.instructor_id || PLACEHOLDER_VALUES.INSTRUCTOR,
                aircraft: booking?.aircraft_id || PLACEHOLDER_VALUES.AIRCRAFT,
                lesson: booking?.lesson_id || PLACEHOLDER_VALUES.LESSON,
                remarks: booking?.remarks || "",
                purpose: booking?.purpose || "",
                flight_type: booking?.flight_type_id || PLACEHOLDER_VALUES.FLIGHT_TYPE,
                booking_type: booking?.booking_type || "flight",
              })} disabled={!formState.isDirty}>Undo Changes</Button>
              <Button type="submit" className="bg-black text-white flex items-center gap-2 min-w-[90px] justify-center" disabled={!formState.isDirty || saving || saveSuccess}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" /> Saving…
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckIcon className="w-4 h-4 text-green-400" /> Saved!
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-8 p-6">
          {/* Scheduled Times */}
          <div className="border rounded-xl p-6 bg-muted/50 mb-6">
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" /> SCHEDULED TIMES
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-semibold mb-2">START TIME</label>
                <div className="flex gap-3 items-center">
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
                              disabled={isReadOnly}
                              className={cn(
                                "w-44 justify-start text-left font-normal overflow-hidden text-ellipsis whitespace-nowrap",
                                !value && "text-muted-foreground"
                              )}
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
                <div className="flex gap-3 items-center">
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
                              disabled={isReadOnly}
                              className={cn(
                                "w-44 justify-start text-left font-normal overflow-hidden text-ellipsis whitespace-nowrap",
                                !value && "text-muted-foreground"
                              )}
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
                render={({ field }) => (
                  <div className="relative">
                    <MemberSelect
                      value={memberValue}
                      onSelect={user => {
                        field.onChange(user ? user.id : "");
                      }}
                      disabled={isReadOnly}
                    />
                  </div>
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Instructor</label>
              <Controller
                name="instructor"
                control={control}
                render={({ field }) => {
                  // Determine if instructor should show "No instructor"
                  const shouldShowNoInstructor = isSoloFlightType ||
                    !instructorFieldValue ||
                    instructorFieldValue === PLACEHOLDER_VALUES.INSTRUCTOR;

                  if (shouldShowNoInstructor) {
                    return (
                      <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-gray-500 text-sm">
                        No instructor
                      </div>
                    );
                  }

                  return (
                    <div className="relative">
                      <InstructorSelect
                        value={instructorValue}
                        unavailableInstructorIds={unavailable.instructors}
                        onSelect={instructor => {
                          // Prevent selection of conflicted instructors
                          if (instructor && unavailable.instructors.has(instructor.id)) {
                            alert("This instructor is already booked during this time. Please choose a different instructor or time slot.");
                            return;
                          }
                          field.onChange(instructor ? instructor.id : PLACEHOLDER_VALUES.INSTRUCTOR);
                        }}
                        disabled={isReadOnly}
                      />
                    </div>
                  );
                }}
              />
            </div>
          </div>

          {/* Aircraft, Flight Type, Lesson, Booking Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Plane className="w-4 h-4" /> Aircraft</label>
              <Controller name="aircraft" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select aircraft" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PLACEHOLDER_VALUES.AIRCRAFT}>No aircraft selected</SelectItem>
                    {aircraft.map(a => {
                      const isBooked = unavailable.aircraft.has(a.id);
                      return (
                        <SelectItem key={a.id} value={a.id} disabled={isBooked}>
                          {a.registration} ({a.type}){isBooked ? " (booked)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className={!mounted || isRoleLoading || isRestrictedUser ? 'hidden' : 'block'}>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> Flight Type</label>
              <Controller name="flight_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select flight type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PLACEHOLDER_VALUES.FLIGHT_TYPE}>No flight type selected</SelectItem>
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
                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly || (!mounted ? false : isRoleLoading ? false : isRestrictedUser)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PLACEHOLDER_VALUES.LESSON}>No lesson selected</SelectItem>
                    {lessons.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            {(!mounted || isRoleLoading || isRestrictedUser) ? null : (
              <div>
                <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><ClipboardList className="w-4 h-4" /> Booking Type</label>
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
            )}
          </div>

          {/* Description & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><AlignLeft className="w-4 h-4" /> Description</label>
              <Controller name="purpose" control={control} render={({ field }) => (
                <textarea
                  {...field}
                  placeholder="Description"
                  disabled={isReadOnly}
                  className="resize-none h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top"
                  rows={5}
                />
              )} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> 
                <span className="text-amber-800">Operational Remarks</span>
              </label>
              <Controller name="remarks" control={control} render={({ field }) => (
                <textarea
                  {...field}
                  placeholder="Important operational notes (e.g., fuel requirements, special instructions, safety notes)"
                  disabled={isReadOnly}
                  className="resize-none h-20 w-full rounded-md border border-amber-300 bg-amber-50/50 px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-amber-500 focus-visible:ring-amber-500/20 focus-visible:ring-[3px] outline-none align-top placeholder:text-amber-600/60"
                  rows={5}
                />
              )} />
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  );
} 