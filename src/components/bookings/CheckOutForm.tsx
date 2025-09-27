"use client";
import { Plane, CalendarIcon, UserIcon, BadgeCheck, ClipboardList as ClipboardListIcon, StickyNote, AlignLeft, ClipboardList, BookOpen, Loader2, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { Booking } from "@/types/bookings";
import { FlightLog } from "@/types/flight_logs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";
import InstructorSelect from "@/components/invoices/InstructorSelect";
import { useCheckOutSave, useAircraftMeters, useInstructorValue } from "@/hooks/use-checkout";
import { useQueryClient } from "@tanstack/react-query";
import { useFlightAuthorizationByBooking } from '@/hooks/use-flight-authorization';
import { useCanOverrideAuthorization } from '@/hooks/use-can-override-authorization';
import { useOverrideAuthorization } from '@/hooks/use-authorization-override';
import { useFlightAuthorizationSetting } from '@/hooks/use-flight-authorization-setting';
import OverrideConfirmDialog from './OverrideConfirmDialog';
import AuthorizationErrorDialog from './AuthorizationErrorDialog';



// Type for flight log data (matches CheckOutParams.flightLogData)
type FlightLogData = {
  id?: string;
  eta?: string | null;
  fuel_on_board?: number;
  passengers?: string;
  route?: string;
  flight_remarks?: string;
  booking_id: string;
  checked_out_aircraft_id?: string;
  checked_out_instructor_id?: string;
  hobbs_start?: number;
  hobbs_end?: number;
  tach_start?: number;
  tach_end?: number;
  flight_time?: number;
  briefing_completed?: boolean;
  authorization_completed?: boolean;
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
  briefing_completed: boolean;
}

interface CheckOutFormProps {
  booking: Booking;
  members: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
  aircraft: { id: string; registration: string; type: string }[];
  lessons: { id: string; name: string }[];
  flightTypes: { id: string; name: string }[];
  flightLog: FlightLog | null;
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

// Helper to calculate aircraft endurance based on fuel on board and fuel consumption
function calculateEndurance(fuelOnBoard: number, fuelConsumption: number): { hours: number; minutes: number; totalHours: number } | null {
  if (!fuelOnBoard || !fuelConsumption || fuelConsumption <= 0) return null;
  
  const totalHours = fuelOnBoard / fuelConsumption;
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  
  return { hours, minutes, totalHours };
}

// Helper to format endurance for display
function formatEndurance(endurance: { hours: number; minutes: number } | null): string {
  if (!endurance) return "--";
  return `${endurance.hours}h ${endurance.minutes.toString().padStart(2, '0')}m`;
}

export default function CheckOutForm({ booking, members, instructors, aircraft, lessons, flightTypes, flightLog }: CheckOutFormProps) {
  // Check if booking is read-only (completed bookings cannot be edited)
  const isReadOnly = booking.status === 'complete';
  
  // Authorization override state and hooks
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [authErrorDialogOpen, setAuthErrorDialogOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CheckOutFormData | null>(null);
  const { data: canOverride = false } = useCanOverrideAuthorization();
  const { data: authorization } = useFlightAuthorizationByBooking(booking.id);
  const overrideMutation = useOverrideAuthorization();
  const { requireFlightAuthorization } = useFlightAuthorizationSetting();
  
  // Parse eta into date and time for default values
  // Default to booking end time if no existing ETA, otherwise use existing ETA
  let etaDateDefault = "";
  let etaTimeDefault = "";
  if (flightLog?.eta) {
    try {
      const etaDateObj = parseISO(flightLog.eta);
      etaDateDefault = format(etaDateObj, "yyyy-MM-dd");
      etaTimeDefault = format(etaDateObj, "HH:mm");
    } catch {}
  } else if (booking?.end_time) {
    // Default ETA to booking end time if no existing ETA
    try {
      const endDateObj = parseISO(booking.end_time);
      etaDateDefault = format(endDateObj, "yyyy-MM-dd");
      etaTimeDefault = format(endDateObj, "HH:mm");
    } catch {}
  }
  const checkedOutAircraftDefault = flightLog?.checked_out_aircraft_id || booking?.aircraft_id || "";
  // Proper fallback logic: checked_out_instructor_id first, then instructor_id, then empty
  const checkedOutInstructorDefault = flightLog?.checked_out_instructor_id || booking?.instructor_id || "";
  
  const { control, handleSubmit, watch, setValue } = useForm<CheckOutFormData>({
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
      fuel_on_board: flightLog?.fuel_on_board?.toString() || "",
      passengers: flightLog?.passengers || "",
      route: flightLog?.route || "",
      remarks_flight_out: flightLog?.flight_remarks || "",
      briefing_completed: flightLog?.briefing_completed ?? false,
    },
  });

  const router = useRouter();
  
  // Watch form fields
  const watchedAircraftId = watch("checked_out_aircraft_id");
  const watchedInstructorId = watch("checked_out_instructor_id");
  const watchedFuelOnBoard = watch("fuel_on_board");
  const startDate = watch("start_date");
  const endDate = watch("end_date");

  // When start date changes, auto-set end date to be at least the same as start date
  React.useEffect(() => {
    if (startDate && !isReadOnly) {
      if (!endDate || new Date(endDate).getTime() < new Date(startDate).getTime()) {
        setValue("end_date", startDate);
      }
    }
  }, [startDate, endDate, setValue, isReadOnly]);
  
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
  
  // Use optimized mutation for save operations with comprehensive refresh
  const queryClient = useQueryClient();
  const { mutate: saveCheckOut, isPending: saving } = useCheckOutSave({
    onSuccess: () => {
      // Invalidate booking-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['flight-logs'] });
      queryClient.invalidateQueries({ queryKey: ['flight-authorizations'] });
      
      // Refresh the page to show updated status (confirmed → flying)
      router.refresh();
    }
  });

  // Calculate endurance based on fuel on board and aircraft fuel consumption
  const fuelOnBoard = watchedFuelOnBoard ? parseInt(watchedFuelOnBoard, 10) : 0;
  const fuelConsumption = selectedAircraftMeters?.fuel_consumption || null;
  const endurance = fuelOnBoard && fuelConsumption ? calculateEndurance(fuelOnBoard, fuelConsumption) : null;

  // Check if this is a solo flight requiring authorization
  const isSoloFlight = Boolean(
    booking.flight_type && 
    booking.flight_type.instruction_type === 'solo' && 
    !booking.instructor_id
  );
  
  // Check if authorization requirements are met
  const authorizationApproved = authorization?.status === 'approved';
  const authorizationOverridden = booking.authorization_override === true;
  // Only require authorization for solo flights when the setting is enabled
  const authorizationRequirementsMet = !isSoloFlight || !requireFlightAuthorization || authorizationApproved || authorizationOverridden;



  const onSubmit = async (data: CheckOutFormData) => {
    // Check authorization requirements for solo flights
    if (!authorizationRequirementsMet) {
      // Store pending form data and show appropriate dialog
      setPendingFormData(data);
      
      if (canOverride) {
        // Show override dialog for instructors/admins (preferred dialog)
        setOverrideDialogOpen(true);
      } else {
        // Show authorization dialog for students/others (still allows override)
        setAuthErrorDialogOpen(true);
      }
      return;
    }

    // Proceed with normal check-out
    await performCheckOut(data);
  };

  const performCheckOut = async (data: CheckOutFormData) => {
    // Use robust UTC ISO string logic for start_time and end_time
    const start_time = getUtcIsoString(data.start_date, data.start_time);
    const end_time = getUtcIsoString(data.end_date, data.end_time);
    
    // Prepare booking data (only general booking fields, not checked_out fields)
    const bookingData: Record<string, unknown> = {};
    
    // Only include fields that have valid values (empty strings will be sanitized in the hook)
    // Note: checked_out_aircraft_id and checked_out_instructor_id are now in flight_logs table only
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
    
    // Prepare flight log data
    const flightLogData: FlightLogData = {
      booking_id: booking.id,
    };
    
    if (flightLog?.id) {
      flightLogData.id = flightLog.id;
    }
    
    const etaIso = getUtcIsoString(data.eta_date, data.eta_time);
    if (etaIso) flightLogData.eta = etaIso;
    if (data.fuel_on_board && data.fuel_on_board.trim() !== '') {
      const fuelValue = parseInt(data.fuel_on_board, 10);
      if (!isNaN(fuelValue)) flightLogData.fuel_on_board = fuelValue;
    }
    if (data.passengers && data.passengers.trim() !== '') flightLogData.passengers = data.passengers;
    if (data.route && data.route.trim() !== '') flightLogData.route = data.route;
    if (data.remarks_flight_out && data.remarks_flight_out.trim() !== '') flightLogData.flight_remarks = data.remarks_flight_out;
    
    // Add briefing completion status
    flightLogData.briefing_completed = data.briefing_completed;
    
    // Add aircraft and instructor data
    if (data.checked_out_aircraft_id) flightLogData.checked_out_aircraft_id = data.checked_out_aircraft_id;
    if (data.checked_out_instructor_id) flightLogData.checked_out_instructor_id = data.checked_out_instructor_id;
    
    // Add meter readings
    if (selectedAircraftMeters?.current_hobbs != null) {
      flightLogData.hobbs_start = Number(selectedAircraftMeters.current_hobbs);
    }
    if (selectedAircraftMeters?.current_tach != null) {
      flightLogData.tach_start = Number(selectedAircraftMeters.current_tach);
    }
    
    // Save using optimized mutation
    saveCheckOut({
      bookingId: booking.id,
      bookingData,
      flightLogData: Object.keys(flightLogData).length > 1 ? flightLogData : undefined,
    });
  };

  // Handle override confirmation (shared by both dialogs)
  const handleOverrideConfirm = async () => {
    if (!pendingFormData) return;

    try {
      // Apply override with automatic reason
      await overrideMutation.mutateAsync({ 
        bookingId: booking.id, 
        reason: 'Manual override during check-out' 
      });
      
      // Close both dialogs and proceed with check-out
      setOverrideDialogOpen(false);
      setAuthErrorDialogOpen(false);
      setPendingFormData(null);
      
      // Proceed with the original form submission
      await performCheckOut(pendingFormData);
    } catch (error) {
      console.error('Failed to override authorization:', error);
      // Error handling could be improved with a proper error dialog, but for now just log
    }
  };

  // Handle override dialog close
  const handleOverrideCancel = () => {
    setOverrideDialogOpen(false);
    setAuthErrorDialogOpen(false);
    setPendingFormData(null);
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
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1">
                <Plane className="w-4 h-4" /> Aircraft
                {watchedAircraftId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Clock className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          {isLoadingAircraftMeters ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading aircraft meters...</span>
                            </div>
                          ) : selectedAircraftMeters ? (
                            <>
                              <div>Current Hobbs: {selectedAircraftMeters.current_hobbs !== null ? selectedAircraftMeters.current_hobbs.toFixed(1) : 'N/A'}</div>
                              <div>Current Tacho: {selectedAircraftMeters.current_tach !== null ? selectedAircraftMeters.current_tach.toFixed(1) : 'N/A'}</div>
                              <div>Fuel Consumption: {selectedAircraftMeters.fuel_consumption !== null ? `${selectedAircraftMeters.fuel_consumption} L/hr` : 'N/A'}</div>
                              <div className="text-blue-600 font-medium">Meter values will be recorded as flight start readings</div>
                            </>
                          ) : (
                            <div className="text-amber-600">No meter data available</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </label>
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
          {/* Description & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><AlignLeft className="w-4 h-4" /> Description</label>
              <Controller name="purpose" control={control} render={({ field }) => (
                <textarea
                  {...field}
                  disabled={isReadOnly}
                  className="resize-none h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top"
                  rows={5}
                />
              )} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><StickyNote className="w-4 h-4" /> Booking Remarks</label>
              <Controller name="remarks" control={control} render={({ field }) => (
                <textarea
                  {...field}
                  disabled={isReadOnly}
                  className="resize-none h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top"
                  rows={5}
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
            <span className="ml-4 text-sm text-muted-foreground">
              {fuelConsumption ? (
                <>
                  Total: {fuelOnBoard}L (
                  <span className="text-blue-600 font-medium">
                    {formatEndurance(endurance)} endurance
                  </span>
                  {endurance && (
                    <span className="text-amber-600 ml-1">
                      @ {fuelConsumption}L/hr
                    </span>
                  )}
                  )
                </>
              ) : (
                <>Total: {fuelOnBoard}L (<span className="text-gray-400">-- safe endurance</span>)</>
              )}
            </span>
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
        <div className="mb-4">
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
        {/* Briefing Completed */}
        <div className="mb-2">
          <label className="block text-xs font-semibold mb-2 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> BRIEFING COMPLETED
          </label>
          <Controller
            name="briefing_completed"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Switch
                  id="briefing-completed"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isReadOnly}
                />
                <label htmlFor="briefing-completed" className="text-sm font-medium">
                  {field.value ? "Completed" : "Not Completed"}
                </label>
              </div>
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
      
      {/* Override confirmation dialog */}
      <OverrideConfirmDialog
        isOpen={overrideDialogOpen}
        onClose={handleOverrideCancel}
        onConfirm={handleOverrideConfirm}
        isLoading={overrideMutation.isPending}
      />

      {/* Authorization error dialog for students */}
      <AuthorizationErrorDialog
        isOpen={authErrorDialogOpen}
        onClose={() => setAuthErrorDialogOpen(false)}
        onOverride={handleOverrideConfirm}
        isLoading={overrideMutation.isPending}
      />
    </div>
  );
} 