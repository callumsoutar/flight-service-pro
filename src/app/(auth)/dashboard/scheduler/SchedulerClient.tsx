'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight, X, Plane, Clock, User, Plane as PlaneIcon, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { NewBookingModal } from "@/components/bookings/NewBookingModal";
import { CancelBookingModal } from "@/components/bookings/CancelBookingModal";
import { ChangeAircraftModal } from "@/components/bookings/ChangeAircraftModal";
import { ContactDetailsModal } from "@/components/bookings/ContactDetailsModal";
import { useCancelBooking } from "@/hooks/use-cancel-booking";
import { useBusinessHours } from "@/hooks/use-business-hours";
import { useCancellationCategories } from "@/hooks/use-cancellation-categories";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { useIsRestrictedUser } from "@/hooks/use-role-protection";
import { createClient } from "@/lib/supabase/client";

// Define types for better TypeScript support
interface Booking {
  id: string; // Changed from number to string to support UUIDs
  start: number;
  duration: number;
  name: string;
  type: string;
  student: string;
  instructor: string;
  aircraft: string;
  status: string;
  purpose?: string;
  remarks?: string;
  lesson_id?: string;
  flight_type_id?: string;
  booking_type?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface Aircraft {
  id: string;
  registration: string;
  type: string;
  status: string;
  total_hours?: number;
  current_tach?: number;
  current_hobbs?: number;
}

interface Instructor {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  users?: { email: string };
  instructor_category?: {
    id: string;
    name: string;
    description: string | null;
    country: string;
  } | null;
  name?: string;
  endorsements?: string | null;
  // Boolean endorsement properties
  night_removal?: boolean;
  aerobatics_removal?: boolean;
  multi_removal?: boolean;
  tawa_removal?: boolean;
  ifr_removal?: boolean;
  [key: string]: unknown;
}

interface RosterRule {
  id: string;
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
  notes?: string;
  voided_at?: string;
}

interface ShiftOverride {
  id: string;
  instructor_id: string;
  override_date: string;
  override_type: 'add' | 'replace' | 'cancel';
  start_time?: string;
  end_time?: string;
  notes?: string;
  replaces_rule_id?: string;
  voided_at?: string;
}


interface ResizeData {
  booking: Booking;
  resource: string;
  resizeType: 'start' | 'end';
  originalStart: number;
  originalDuration: number;
  startX: number;
  containerRect: DOMRect;
}

const FlightScheduler = () => {
  // State for selected date
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [_isCalendarOpen, _setIsCalendarOpen] = useState(false);

  // State for bookings
  const [_bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for aircraft
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [_aircraftLoading, setAircraftLoading] = useState(true);

  // State for instructors
  const [_instructors, _setInstructors] = useState<Instructor[]>([]);
  const [_instructorsLoading, setInstructorsLoading] = useState(true);

  // State for roster rules and shift overrides
  const [_rosterRules, setRosterRules] = useState<RosterRule[]>([]);
  const [_shiftOverrides, setShiftOverrides] = useState<ShiftOverride[]>([]);

  // State for modals
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [showChangeAircraftModal, setShowChangeAircraftModal] = useState(false);
  const [showContactDetailsModal, setShowContactDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [_selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [_selectedInstructor, _setSelectedInstructor] = useState<Instructor | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [prefilledBookingData, setPrefilledBookingData] = useState<{
    date: Date;
    startTime: string;
    instructorName?: string;
    aircraftName?: string;
    instructorId?: string;
    instructorUserId?: string;
    aircraftId?: string;
    aircraftRegistration?: string;
  } | null>(null);

  // State for hover effects
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);
  const [_hoveredAircraft, _setHoveredAircraft] = useState<Aircraft | null>(null);
  const [_hoveredInstructor, _setHoveredInstructor] = useState<Instructor | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{resource: string, timeSlot: string, isInstructor: boolean} | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // State for timeline scrolling
  const [timelineOffset, setTimelineOffset] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // State for resize functionality
  const [resizeData, setResizeData] = useState<ResizeData | null>(null);
  const [hasResized, setHasResized] = useState(false);

  // State for context menu and double-click
  const [contextMenu, setContextMenu] = useState<{
    booking: Booking;
    x: number;
    y: number;
    transform: string;
  } | null>(null);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  // State for time change confirmation
  const [showTimeChangeModal, setShowTimeChangeModal] = useState(false);
  const [pendingTimeChange, setPendingTimeChange] = useState<{
    booking: Booking;
    newStart: number;
    newDuration: number;
    resource: string;
  } | null>(null);

  // State for available instructors (processed)
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]);
  
  // State for bookings by resource
  const [bookingsByResource, setBookingsByResource] = useState<Record<string, Booking[]>>({});

  // State for raw booking data for conflict checking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawBookings, setRawBookings] = useState<any[]>([]);

  // Hooks
  const { mutate: cancelBooking } = useCancelBooking();
  const { data: businessHours, isLoading: businessHoursLoading } = useBusinessHours();
  const { data: cancellationCategories } = useCancellationCategories();
  const router = useRouter();
  const { isRestricted, isLoading: roleLoading, error: roleError } = useIsRestrictedUser();
  
  // State for current user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Log role loading state for debugging
  console.log('Role loading state:', { roleLoading, roleError, isRestricted });

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Check if user can access a specific booking
  const canAccessBooking = (booking: Booking): boolean => {
    if (!currentUser) return false;
    
    // Only restrict access for members and students - they can only access their own bookings
    if (isRestricted) {
      return booking.user_id === currentUser.id;
    }
    
    // Owners, admins, and instructors can access any booking
    return true;
  };

  // Configuration
  const VISIBLE_SLOTS = 24;
  const _ROW_HEIGHT = 60;

  // Generate time slots based on business hours (30-minute intervals)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];

    // Default fallback times if business hours not available
    let startHour = 7;
    let endHour = 22;

    if (businessHours && !businessHours.is_closed) {
      if (businessHours.is_24_hours) {
        startHour = 0;
        endHour = 23;
      } else {
        // Parse open_time and close_time
        const openTime = businessHours.open_time.split(':');
        const closeTime = businessHours.close_time.split(':');
        startHour = parseInt(openTime[0], 10);
        endHour = parseInt(closeTime[0], 10);

        // If close time has minutes, add an extra hour to include that time slot
        if (parseInt(closeTime[1], 10) > 0) {
          endHour += 1;
        }
      }
    }

    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Fetch all data - restored from original
  const fetchAllData = useCallback(async (isInitialLoad = false) => {
    setError(null);
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const dayOfWeek = selectedDate.getDay();

      // Fetch everything in parallel
      const [instructorsRes, aircraftRes, rosterRulesRes, shiftOverridesRes, bookingsRes] = await Promise.all([
        fetch('/api/instructors', { credentials: 'include' }),
        fetch('/api/aircraft', { credentials: 'include' }),
        fetch(`/api/roster-rules?day_of_week=${dayOfWeek}&is_active=true`, { credentials: 'include' }),
        fetch(`/api/shift-overrides?override_date=${dateStr}`, { credentials: 'include' }),
        fetch(`/api/bookings?date=${dateStr}`, { credentials: 'include' })
      ]);

      // Check each response and log specific failures
      const failures = [];
      if (!instructorsRes.ok) failures.push(`Instructors: ${instructorsRes.status} ${instructorsRes.statusText}`);
      if (!aircraftRes.ok) failures.push(`Aircraft: ${aircraftRes.status} ${aircraftRes.statusText}`);
      if (!rosterRulesRes.ok) failures.push(`Roster Rules: ${rosterRulesRes.status} ${rosterRulesRes.statusText}`);
      if (!shiftOverridesRes.ok) failures.push(`Shift Overrides: ${shiftOverridesRes.status} ${shiftOverridesRes.statusText}`);
      if (!bookingsRes.ok) failures.push(`Bookings: ${bookingsRes.status} ${bookingsRes.statusText}`);
      
      if (failures.length > 0) {
        console.error("API fetch failures:", failures);
        throw new Error(`Failed to fetch data: ${failures.join(', ')}`);
      }

      const [instructorsData, aircraftData, rosterRulesData, shiftOverridesData, bookingsData] = await Promise.all([
        instructorsRes.json(),
        aircraftRes.json(),
        rosterRulesRes.json(),
        shiftOverridesRes.json(),
        bookingsRes.json()
      ]);

      // Process aircraft
      const onlineAircraft = (aircraftData.aircrafts || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((aircraft: any) => aircraft.on_line === true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((aircraft: any) => ({
          id: aircraft.id,
          registration: aircraft.registration,
          type: aircraft.type,
          status: aircraft.status || 'active'
        }));

      // Process instructors with proper endorsement handling
      const processedInstructors = (instructorsData.instructors || [])
        .filter((instructor: { is_actively_instructing: boolean }) => instructor.is_actively_instructing === true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((instructor: any) => {
          // Build endorsements string from boolean properties
          const endorsements = [];
          if (instructor.aerobatics_removal) endorsements.push('aerobatics');
          if (instructor.ifr_removal) endorsements.push('ifr');
          if (instructor.night_removal) endorsements.push('night');
          if (instructor.tawa_removal) endorsements.push('tawa');
          if (instructor.multi_removal) endorsements.push('multi');
          
          const endorsementsString = endorsements.length > 0 ? endorsements.join(', ') : null;

          return {
            id: instructor.id,
            user_id: instructor.user_id,
            name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.users?.email || `Instructor ${instructor.id}`,
            endorsements: endorsementsString,
            instructor_category: instructor.instructor_category,
            first_name: instructor.first_name,
            last_name: instructor.last_name,
            users: instructor.users,
            // Include the boolean properties for reference
            night_removal: instructor.night_removal,
            aerobatics_removal: instructor.aerobatics_removal,
            multi_removal: instructor.multi_removal,
            tawa_removal: instructor.tawa_removal,
            ifr_removal: instructor.ifr_removal
          };
        });

      // Filter instructors by roster
      const filteredInstructors = processedInstructors.filter((instructor: Instructor) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasValidRosterRule = rosterRulesData.roster_rules?.some((rule: any) => {
          if (rule.instructor_id !== instructor.id) return false;
          const effectiveFrom = new Date(rule.effective_from);
          const effectiveUntil = rule.effective_until ? new Date(rule.effective_until) : null;
          const selectedDateOnly = new Date(selectedDate);
          selectedDateOnly.setHours(0, 0, 0, 0);
          const isWithinDateRange = effectiveFrom <= selectedDateOnly && (!effectiveUntil || effectiveUntil >= selectedDateOnly);
          return rule.is_active && isWithinDateRange && !rule.voided_at;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasValidOverride = shiftOverridesData.shift_overrides?.some((override: any) => {
          return override.instructor_id === instructor.id && override.override_type !== 'cancel' && !override.voided_at;
        });

        return hasValidRosterRule || hasValidOverride;
      });

      // Process bookings
      const bookingsByResource: Record<string, Booking[]> = {};
      const convertedBookings: Booking[] = [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (bookingsData.bookings || []).forEach((booking: any) => {
        try {
          if (!booking.start_time || !booking.end_time) return;
          const bookingDate = new Date(booking.start_time);
          if (isNaN(bookingDate.getTime())) return;
          const bookingDateStr = format(bookingDate, 'yyyy-MM-dd');

          if (bookingDateStr === dateStr && ['confirmed', 'flying', 'complete', 'unconfirmed'].includes(booking.status || '')) {
            const startTime = bookingDate.getHours() + (bookingDate.getMinutes() / 60);
        const endTime = new Date(booking.end_time);
            if (isNaN(endTime.getTime())) return;
            const duration = (endTime.getTime() - bookingDate.getTime()) / (1000 * 60 * 60);
            if (duration <= 0) return;
        
            const schedulerBooking: Booking = {
          id: booking.id,
              start: startTime,
          duration: duration,
              name: booking.user?.first_name && booking.user?.last_name
                ? `${booking.user.first_name} ${booking.user.last_name}`
                : booking.user?.email || booking.purpose || 'Flight',
              type: 'booking',
              student: booking.user?.first_name && booking.user?.last_name
                ? `${booking.user.first_name} ${booking.user.last_name}`
                : booking.user?.email || booking.user?.id || 'Student',
              instructor: booking.instructor?.first_name && booking.instructor?.last_name
                ? `${booking.instructor.first_name} ${booking.instructor.last_name}`
                : booking.instructor?.email || 'No Instructor',
              aircraft: booking.aircraft?.registration || 'Aircraft',
              status: booking.status || 'confirmed',
          purpose: booking.purpose,
          remarks: booking.remarks,
          lesson_id: booking.lesson_id,
          flight_type_id: booking.flight_type_id,
          booking_type: booking.booking_type,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
              user_id: booking.user_id || undefined
            };

            convertedBookings.push(schedulerBooking);

            // Group by instructor
            if (booking.instructor_id) {
              const instructor = filteredInstructors.find((inst: Instructor) => inst.id === booking.instructor_id);
              const instructorName = instructor ? instructor.name : schedulerBooking.instructor;
              if (!bookingsByResource[instructorName!]) {
                bookingsByResource[instructorName!] = [];
              }
              if (instructor) schedulerBooking.instructor = instructor.name!;
              bookingsByResource[instructorName!].push(schedulerBooking);
            }

            // Group by aircraft
            if (booking.aircraft_id) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const aircraftMatch = onlineAircraft.find((aircraftData: any) =>
                aircraftData.id === booking.aircraft_id || aircraftData.registration === booking.aircraft?.registration
              );
              const aircraftDisplay = aircraftMatch
                ? (aircraftMatch.type ? `${aircraftMatch.registration} (${aircraftMatch.type})` : aircraftMatch.registration)
                : (booking.aircraft?.type ? `${booking.aircraft.registration} (${booking.aircraft.type})` : booking.aircraft?.registration || 'Unknown Aircraft');

              if (!bookingsByResource[aircraftDisplay]) {
                bookingsByResource[aircraftDisplay] = [];
              }
              bookingsByResource[aircraftDisplay].push({ ...schedulerBooking, instructor: schedulerBooking.instructor || 'No Instructor' });
            }
          }
        } catch (bookingError) {
          console.error("Error processing booking:", bookingError);
        }
      });

      // Set all state atomically
      setAircraft(onlineAircraft);
      setAvailableInstructors(filteredInstructors);
      setRawBookings(bookingsData.bookings || []);
      setBookings(convertedBookings);
      setBookingsByResource(bookingsByResource);
      setRosterRules(rosterRulesData.roster_rules || []);
      setShiftOverrides(shiftOverridesData.shift_overrides || []);

    } catch (err) {
      setError("Failed to load scheduler data");
      console.error("Error fetching scheduler data:", err);
      setAircraft([]);
      setAvailableInstructors([]);
      setBookings([]);
      setBookingsByResource({});
      setRawBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setAircraftLoading(false);
      setInstructorsLoading(false);
    }
  }, [selectedDate]);

  // Initial load when component mounts
  useEffect(() => {
    console.log('Initial load triggered');
    fetchAllData(true);
  }, [fetchAllData]);

  // Refresh data when selected date or business hours changes
  useEffect(() => {
    console.log('Data refresh triggered for date/business hours change');
    if (loading) return; // Skip if initial load is still happening
    fetchAllData(false);
  }, [selectedDate, businessHours, fetchAllData, loading]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [clickTimeout]);

  // Convert time to position
  const convertTimeToPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  };

  // Convert decimal time to readable format
  const formatTime = (decimalTime: number) => {
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime - hours) * 60);
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes}${period}`;
  };

  // Get booking time range as string
  const getBookingTimeRange = (booking: Booking) => {
    const startTime = formatTime(booking.start);
    const endTime = formatTime(booking.start + booking.duration);
    return `${startTime} - ${endTime}`;
  };

  // Convert decimal hours to database timestamp format
  const convertDecimalTimeToTimestamp = (decimalTime: number, date: Date): string => {
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime - hours) * 60);
    const timestamp = new Date(date);
    timestamp.setHours(hours, minutes, 0, 0);
    return timestamp.toISOString();
  };

  // Snap time to 15-minute intervals
  const snapToQuarterHour = (decimalTime: number): number => {
    const quarterHours = Math.round(decimalTime * 4) / 4;
    return Math.max(0, quarterHours); // Ensure non-negative
  };

  // Check if a time slot is in the past
  const isTimeSlotInPast = (timeSlot: string) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    // If not viewing today, allow all slots
    if (selectedDateOnly.getTime() !== today.getTime()) {
      // If viewing a past date, all slots are in the past
      if (selectedDateOnly < today) {
        return true;
      }
      // If viewing a future date, no slots are in the past
      return false;
    }
    
    // For today, check if time slot has passed
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    return slotTime <= now;
  };

  // Calculate current time line position
  const getCurrentTimeLinePosition = () => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    // Only show timeline if viewing today
    if (selectedDateOnly.getTime() !== today.getTime()) {
      return null;
    }

    const currentHour = now.getHours() + (now.getMinutes() / 60);
    const visibleSlots = getVisibleTimeSlots();
    
    if (visibleSlots.length === 0) {
      return null;
    }
    
    const firstVisibleTime = convertTimeToPosition(visibleSlots[0]);
    const lastVisibleTime = convertTimeToPosition(visibleSlots[visibleSlots.length - 1]) + 0.5;
    
    // Check if current time is within visible range
    if (currentHour < firstVisibleTime || currentHour > lastVisibleTime) {
      return null;
    }
    
    const timelineSpan = lastVisibleTime - firstVisibleTime;
    const positionPercent = ((currentHour - firstVisibleTime) / timelineSpan) * 100;
    
    return positionPercent;
  };

  // Get visible time slots based on current offset
  const getVisibleTimeSlots = () => {
    return timeSlots.slice(timelineOffset, timelineOffset + VISIBLE_SLOTS);
  };

  // Navigation functions
  const canScrollLeft = () => timelineOffset > 0;
  const canScrollRight = () => timelineOffset + VISIBLE_SLOTS < timeSlots.length;

  const scrollLeft = () => {
    if (canScrollLeft()) {
      setTimelineOffset(Math.max(0, timelineOffset - 1));
    }
  };

  const scrollRight = () => {
    if (canScrollRight()) {
      setTimelineOffset(Math.min(timeSlots.length - VISIBLE_SLOTS, timelineOffset + 1));
    }
  };

  // Handle horizontal scroll with mouse wheel
  const handleWheelScroll = (event: React.WheelEvent) => {
    // Always prevent default to stop browser navigation
    event.preventDefault();
    event.stopPropagation();

    // Only handle horizontal scrolling or when shift is held
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
      // Determine scroll direction and amount
      const scrollDelta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
      const scrollSensitivity = 0.2; // Reduced sensitivity for smoother scrolling
      const scrollAmount = Math.sign(scrollDelta) * Math.max(1, Math.abs(scrollDelta) * scrollSensitivity / 100);

      const newOffset = Math.max(0, Math.min(timeSlots.length - VISIBLE_SLOTS, timelineOffset + scrollAmount));

      if (newOffset !== timelineOffset) {
        setTimelineOffset(Math.round(newOffset));
      }
    }
  };

  // Get current time range for display
  const getCurrentTimeRange = () => {
    const visibleSlots = getVisibleTimeSlots();
    if (visibleSlots.length === 0) return '';
    return `${visibleSlots[0]} - ${visibleSlots[visibleSlots.length - 1]}`;
  };

  // Get booking style - restored from original
  const getBookingStyle = (booking: Booking, rowHeight: number) => {
    const visibleSlots = getVisibleTimeSlots();
    
    if (visibleSlots.length === 0) {
      return { display: 'none' };
    }
    
    const firstVisibleTime = convertTimeToPosition(visibleSlots[0]);
    const lastVisibleTime = convertTimeToPosition(visibleSlots[visibleSlots.length - 1]) + 0.5;
    
    // Check if booking is visible in current viewport
    const bookingEnd = booking.start + booking.duration;
    const isVisible = booking.start < lastVisibleTime && bookingEnd > firstVisibleTime;
    
    if (!isVisible) {
      return { display: 'none' };
    }
    
    // Calculate position relative to visible area with precise slot positioning
    const timelineStart = firstVisibleTime;
    const timelineEnd = lastVisibleTime;
    const timelineSpan = timelineEnd - timelineStart;
    
    // Calculate the actual start and end positions within the visible timeline
    const actualStart = Math.max(timelineStart, booking.start);
    const actualEnd = Math.min(timelineEnd, bookingEnd);
    
    // Convert to percentages of the visible timeline
    const startPercent = ((actualStart - timelineStart) / timelineSpan) * 100;
    const endPercent = ((actualEnd - timelineStart) / timelineSpan) * 100;
    const widthPercent = endPercent - startPercent;
    
    // Ensure minimum width for very short bookings
    const finalWidth = Math.max(widthPercent, 1);
    
    // Check if user can access this booking
    const canAccess = canAccessBooking(booking);
    
    let backgroundColor = '#6366f1'; // Modern indigo for 'confirmed'
    const opacity = '1';
    let cursor = 'pointer';
    
    // Status-based colors (takes priority over type-based colors)
    switch (booking.status) {
      case 'confirmed':
        backgroundColor = '#6366f1'; // Modern indigo
        break;
      case 'flying':
        backgroundColor = '#f59e0b'; // Modern amber
        break;
      case 'complete':
        backgroundColor = '#10b981'; // Modern emerald
        break;
      case 'unconfirmed':
        backgroundColor = '#6b7280'; // Modern gray
        break;
      default:
        // Keep default indigo for confirmed and any other status
        break;
    }
    
    // Type-based colors (only if not overridden by status)
    if (booking.status === 'confirmed') {
      if (booking.type === 'maintenance') {
        backgroundColor = '#e11d48'; // Modern red
      }
      if (booking.type === 'trial' || booking.name === 'TRIAL FLIGHT') {
        backgroundColor = '#0ea5e9'; // Modern sky blue
      }
      if (booking.type === 'fuel' || booking.name.includes('F...')) {
        backgroundColor = '#14b8a6'; // Modern teal
      }
    }
    
    // Only change cursor for restricted users who cannot access the booking
    if (isRestricted && !canAccess) {
      cursor = 'not-allowed';
    }

    return {
      position: 'absolute' as const,
      left: `${startPercent}%`,
      width: `${finalWidth}%`,
      height: `${rowHeight - 2}px`,
      background: backgroundColor,
      color: 'white',
      fontSize: '11px',
      fontWeight: '500',
      padding: '6px 8px',
      borderRadius: '6px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      zIndex: 20,
      top: '1px',
      cursor: cursor,
      userSelect: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.2s ease-in-out',
      opacity: opacity
    };
  };

  // Special version for resize operations that allows visual feedback beyond visible timeline
  const getResizeBookingStyle = (booking: Booking, rowHeight: number) => {
    const visibleSlots = getVisibleTimeSlots();
    
    if (visibleSlots.length === 0) {
      return { display: 'none' };
    }
    
    const firstVisibleTime = convertTimeToPosition(visibleSlots[0]);
    const lastVisibleTime = convertTimeToPosition(visibleSlots[visibleSlots.length - 1]) + 0.5;
    
    const timelineStart = firstVisibleTime;
    const timelineEnd = lastVisibleTime;
    const timelineSpan = timelineEnd - timelineStart;
    
    // Allow booking to extend beyond visible timeline for resize feedback
    const bookingEnd = booking.start + booking.duration;
    const startPercent = ((booking.start - timelineStart) / timelineSpan) * 100;
    const endPercent = ((bookingEnd - timelineStart) / timelineSpan) * 100;
    const widthPercent = endPercent - startPercent;
    
    // Don't constrain width for resize operations
    const finalWidth = Math.max(widthPercent, 1);
    
    // Use a special resize color to indicate it's being modified
    const backgroundColor = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'; // Blue for resize
    const boxShadow = '0 4px 16px rgba(59, 130, 246, 0.4)';

    return {
      position: 'absolute' as const,
      left: `${startPercent}%`,
      width: `${finalWidth}%`,
      height: `${rowHeight - 6}px`,
      background: backgroundColor,
      color: 'white',
      fontSize: '12px',
      fontWeight: '600',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '2px solid #3b82f6',
      whiteSpace: 'nowrap' as const,
      overflow: 'visible', // Allow overflow during resize
      textOverflow: 'ellipsis',
      zIndex: 100, // Higher z-index for resize
      top: '3px',
      cursor: 'pointer',
      userSelect: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      boxShadow: boxShadow,
      transition: 'none', // No transition during resize for immediate feedback
      backdropFilter: 'blur(10px)'
    };
  };

  // Handle cell click (for creating new bookings)
  const handleCellClick = (resource: string, timeSlot: string, isInstructor: boolean) => {
    if (isTimeSlotInPast(timeSlot)) return; // Don't allow clicks on past time slots
    
    // Create pre-filled booking data with proper IDs
    const bookingData: {
      date: Date;
      startTime: string;
      instructorName?: string;
      aircraftName?: string;
      instructorId?: string;
      instructorUserId?: string;
      aircraftId?: string;
      aircraftRegistration?: string;
    } = {
      date: selectedDate,
      startTime: timeSlot,
      instructorName: isInstructor ? resource : undefined,
      aircraftName: !isInstructor ? resource : undefined,
    };
    
    // Find actual instructor/aircraft objects for IDs
    if (isInstructor) {
      const instructor = availableInstructors.find(inst => inst.name === resource);
      if (instructor) {
        bookingData.instructorId = instructor.id;
        bookingData.instructorUserId = instructor.user_id;
      }
    } else {
      const aircraftMatch = aircraft.find(aircraftData => {
        const displayName = aircraftData.type 
          ? `${aircraftData.registration} (${aircraftData.type})`
          : aircraftData.registration;
        return displayName === resource;
      });
      if (aircraftMatch) {
        bookingData.aircraftId = aircraftMatch.id;
        bookingData.aircraftRegistration = aircraftMatch.registration;
      }
    }
    
    // Store the prefilled booking data and open modal
    setPrefilledBookingData(bookingData);
    setSelectedTimeSlot(timeSlot);
    setShowNewBookingModal(true);
  };

  // Handle booking click (single click)
  const handleBookingClick = (booking: Booking, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Check if user can access this booking
    if (!canAccessBooking(booking)) {
      toast.error('You can only view your own bookings');
      return;
    }
    
    // Don't handle click if a resize operation just occurred
    if (hasResized) {
      console.log('Click prevented due to recent resize operation');
      return;
    }
    
    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    // Set a timeout to handle single click after checking for double click
    const timeout = setTimeout(() => {
      // Navigate to booking view page only if no double click occurred
      router.push(`/dashboard/bookings/view/${booking.id}`);
      setClickTimeout(null);
    }, 300); // Wait 300ms for potential double click
    
    setClickTimeout(timeout);
  };

  // Handle booking double click
  const handleBookingDoubleClick = (booking: Booking, event: React.MouseEvent) => {
    console.log('Double click detected on booking:', booking.name);
    event.preventDefault();
    event.stopPropagation();
    
    // Check if user can access this booking
    if (!canAccessBooking(booking)) {
      toast.error('You can only interact with your own bookings');
      return;
    }
    
    // Clear single click timeout to prevent navigation
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    // Close hover modal when showing context menu
    setHoveredBooking(null);

    // Calculate optimal position for context menu (approximate size: 200px width, 200px height)
    const position = calculatePopupPosition(event.clientX, event.clientY, 200, 200);

    // Show context menu at calculated position
    setContextMenu({
      booking,
      x: position.x,
      y: position.y,
      transform: position.transform
    });

    console.log('Context menu set:', { x: position.x, y: position.y, transform: position.transform });
  };

  // Handle booking right click
  const handleBookingRightClick = (booking: Booking, event: React.MouseEvent) => {
    console.log('Right click detected on booking:', booking.name);
    event.preventDefault();
    event.stopPropagation();
    
    // Check if user can access this booking
    if (!canAccessBooking(booking)) {
      toast.error('You can only interact with your own bookings');
      return;
    }
    
    // Close hover modal when showing context menu
    setHoveredBooking(null);

    // Calculate optimal position for context menu (approximate size: 200px width, 200px height)
    const position = calculatePopupPosition(event.clientX, event.clientY, 200, 200);

    // Show context menu at calculated position
    setContextMenu({
      booking,
      x: position.x,
      y: position.y,
      transform: position.transform
    });

    console.log('Context menu set from right click:', { x: position.x, y: position.y, transform: position.transform });
  };

  // Handle context menu actions
  const handleContextMenuAction = (action: 'view' | 'cancel' | 'change-aircraft' | 'contact-details' | 'confirm', booking: Booking) => {
    setContextMenu(null);

    switch (action) {
      case 'view':
        router.push(`/dashboard/bookings/view/${booking.id}`);
        break;
      case 'cancel':
        setSelectedBooking(booking);
        setShowCancelBookingModal(true);
        break;
      case 'change-aircraft':
        // Find the raw booking data to get proper timestamps
        const rawBooking = rawBookings.find(rb => rb.id === booking.id);
        if (rawBooking) {
          setSelectedBooking(booking);
          setShowChangeAircraftModal(true);
        } else {
          toast.error('Unable to find booking details');
        }
        break;
      case 'contact-details':
        if (booking.user_id) {
          setSelectedBooking(booking);
          setShowContactDetailsModal(true);
        } else {
          toast.error('No contact details available for this booking');
        }
        break;
      case 'confirm':
        handleConfirmBooking(booking);
        break;
    }
  };

  // Handle booking hover
  const handleBookingMouseEnter = (event: React.MouseEvent, booking: Booking) => {
    setHoveredBooking(booking);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleBookingMouseLeave = () => {
    setHoveredBooking(null);
  };

  const handleBookingMouseMove = (event: React.MouseEvent) => {
    if (hoveredBooking) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  // Handle time slot hover
  const handleTimeSlotHover = (resource: string, timeSlot: string, isInstructor: boolean, event: React.MouseEvent) => {
    if (isTimeSlotInPast(timeSlot)) return; // Don't show hover for past time slots
    setHoveredTimeSlot({ resource, timeSlot, isInstructor });
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleTimeSlotLeave = () => {
    setHoveredTimeSlot(null);
  };

  // Helper function to calculate optimal popup position
  const calculatePopupPosition = (x: number, y: number, popupWidth: number = 200, popupHeight: number = 200) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10; // Margin from screen edge

    let adjustedX = x;
    let adjustedY = y;
    let transform = 'translate(-50%, -10px)'; // Default transform

    // Check if popup would go off the right edge
    if (x + popupWidth / 2 + margin > viewportWidth) {
      adjustedX = x - popupWidth / 2 - margin;
      transform = 'translate(0, -10px)'; // Align to left edge of popup
    }
    // Check if popup would go off the left edge
    else if (x - popupWidth / 2 - margin < 0) {
      adjustedX = x + popupWidth / 2 + margin;
      transform = 'translate(-100%, -10px)'; // Align to right edge of popup
    }

    // Check if popup would go off the bottom edge
    if (y + popupHeight + margin > viewportHeight) {
      adjustedY = y - popupHeight - margin;
      // Adjust transform for upward positioning
      if (transform.includes('-50%')) {
        transform = 'translate(-50%, -100%)';
      } else if (transform.includes('translate(0')) {
        transform = 'translate(0, -100%)';
      } else {
        transform = 'translate(-100%, -100%)';
      }
    }
    // Check if popup would go off the top edge
    else if (y - margin < 0) {
      adjustedY = y + margin;
    }

    return { x: adjustedX, y: adjustedY, transform };
  };

  // Resize handlers

  const handleMouseMove = (event: MouseEvent) => {
    if (resizeData) {
      // Handle visual feedback for resize
      handleResizeMouseMove(event);
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (resizeData) {
      // Handle resize operations
      const deltaX = event.clientX - resizeData.startX;
      const timelineWidth = resizeData.containerRect.width;
      const visibleSlots = getVisibleTimeSlots();
      const timelineSpan = visibleSlots.length * 0.5; // Each slot is 30 minutes
      const timeChange = (deltaX / timelineWidth) * timelineSpan;
      
      let newStart = resizeData.originalStart;
      let newDuration = resizeData.originalDuration;
      
      if (resizeData.resizeType === 'start') {
        // Resize from start (change start time, adjust duration)
        const newStartTime = snapToQuarterHour(resizeData.originalStart + timeChange);
        const maxStart = resizeData.originalStart + resizeData.originalDuration - 0.25; // Minimum 15 minutes
        newStart = Math.min(newStartTime, maxStart);
        newDuration = resizeData.originalStart + resizeData.originalDuration - newStart;
      } else {
        // Resize from end (change duration only)
        const newDurationValue = snapToQuarterHour(resizeData.originalDuration + timeChange);
        newDuration = Math.max(0.25, newDurationValue); // Minimum 15 minutes
      }
      
      // Show confirmation modal
      setPendingTimeChange({
        booking: resizeData.booking,
        newStart,
        newDuration,
        resource: resizeData.resource
      });
      setShowTimeChangeModal(true);
      
      // Reset visual styling on the booking element
      const bookingElement = document.querySelector(`[data-booking-id="${resizeData.booking.id}"]`) as HTMLElement;
      if (bookingElement) {
        bookingElement.style.opacity = '';
        bookingElement.style.zIndex = '';
      }
      
      setResizeData(null);
    }
    
    // Reset cursor
    document.body.style.cursor = '';
    
    // Reset resize flag after a short delay to allow click handler to check it
    setTimeout(() => {
      setHasResized(false);
    }, 10);
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Handle resize mouse down
  const handleResizeMouseDown = (event: React.MouseEvent, booking: Booking, resource: string, resizeType: 'start' | 'end') => {
    console.log('Resize mouse down triggered:', { bookingName: booking.name, resizeType });
    event.preventDefault();
    event.stopPropagation();
    
    // Check if user can access this booking
    if (!canAccessBooking(booking)) {
      toast.error('You can only modify your own bookings');
      return;
    }
    
    // Reset the resize flag at the start of a new resize operation
    setHasResized(false);
    
    const containerElement = event.currentTarget.closest('.timeline-container') as HTMLElement;
    if (!containerElement) {
      console.error('Container element not found');
      return;
    }
    
    const containerRect = containerElement.getBoundingClientRect();
    
    setResizeData({
      booking,
      resource,
      resizeType,
      originalStart: booking.start,
      originalDuration: booking.duration,
      startX: event.clientX,
      containerRect
    });
    
    console.log('Resize data set:', { resizeType, originalStart: booking.start, originalDuration: booking.duration });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseMove = (event: MouseEvent) => {
    if (!resizeData) return;
    
    console.log('Resize mouse move triggered');
    
    // Mark that a resize operation has occurred
    setHasResized(true);
    
    // Calculate the new dimensions for visual feedback
    const deltaX = event.clientX - resizeData.startX;
    const timelineWidth = resizeData.containerRect.width;
    const visibleSlots = getVisibleTimeSlots();
    const timelineSpan = visibleSlots.length * 0.5; // Each slot is 30 minutes
    const timeChange = (deltaX / timelineWidth) * timelineSpan;
    
    console.log('Resize calculation:', { deltaX, timeChange, resizeType: resizeData.resizeType });
    
    // Find the booking element
    const bookingElement = document.querySelector(`[data-booking-id="${resizeData.booking.id}"]`) as HTMLElement;
    if (!bookingElement) {
      console.error('Booking element not found for resize');
      return;
    }
    
    let newStart = resizeData.originalStart;
    let newDuration = resizeData.originalDuration;
    
    if (resizeData.resizeType === 'start') {
      // Resize from start (change start time, adjust duration)
      const newStartTime = snapToQuarterHour(resizeData.originalStart + timeChange);
      const maxStart = resizeData.originalStart + resizeData.originalDuration - 0.25; // Minimum 15 minutes
      newStart = Math.min(newStartTime, maxStart);
      newDuration = resizeData.originalStart + resizeData.originalDuration - newStart;
    } else {
      // Resize from end (change duration only)
      const newDurationValue = snapToQuarterHour(resizeData.originalDuration + timeChange);
      newDuration = Math.max(0.25, newDurationValue); // Minimum 15 minutes
    }
    
    console.log('New dimensions:', { newStart, newDuration });
    
    // Apply visual changes to the booking element
    const rowHeight = 42; // Same as used in renderResourceRow
    const tempBooking = { ...resizeData.booking, start: newStart, duration: newDuration };
    const newStyle = getResizeBookingStyle(tempBooking, rowHeight);
    
    // Apply the new styling
    Object.assign(bookingElement.style, newStyle);
    
    // Add visual indicator that we're resizing
    bookingElement.style.opacity = '0.8';
    bookingElement.style.zIndex = '100';
    
    // Update visual feedback with cursor
    document.body.style.cursor = resizeData.resizeType === 'start' ? 'w-resize' : 'e-resize';
  };

  // Update booking times via API
  const updateBookingTimes = async (bookingId: string, newStart: number, newDuration: number) => {
    try {
      const startTimestamp = convertDecimalTimeToTimestamp(newStart, selectedDate);
      const endTimestamp = convertDecimalTimeToTimestamp(newStart + newDuration, selectedDate);
      
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: bookingId,
          start_time: startTimestamp,
          end_time: endTimestamp,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update booking');
      }

      await response.json();
      toast.success('Booking times updated successfully');
      
      // Refresh the scheduler data to show the updated booking
      // The useEffect will refetch when selectedDate changes, but we'll refresh manually
      window.location.reload(); // Simple refresh for now
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update booking times';
      toast.error(errorMessage);
      console.error('Error updating booking times:', error);
    }
  };

  // Confirm time change
  const handleConfirmTimeChange = async () => {
    if (!pendingTimeChange) return;
    
    await updateBookingTimes(
      pendingTimeChange.booking.id,
      pendingTimeChange.newStart,
      pendingTimeChange.newDuration
    );
    
    setShowTimeChangeModal(false);
    setPendingTimeChange(null);
  };

  // Cancel time change
  const handleCancelTimeChange = () => {
    if (pendingTimeChange) {
      // Reset the booking to its original styling
      const bookingElement = document.querySelector(`[data-booking-id="${pendingTimeChange.booking.id}"]`) as HTMLElement;
      if (bookingElement) {
        const rowHeight = 42;
        const originalStyle = getBookingStyle(pendingTimeChange.booking, rowHeight);
        Object.assign(bookingElement.style, originalStyle);
      }
    }
    setShowTimeChangeModal(false);
    setPendingTimeChange(null);
  };

  // Handle booking confirmation
  const handleConfirmBooking = async (booking: Booking) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: booking.id,
          status: 'confirmed',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm booking');
      }

      toast.success('Booking confirmed successfully');
      fetchAllData(false); // Refresh data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm booking';
      toast.error(errorMessage);
      console.error('Error confirming booking:', error);
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async (data: {
    cancellation_category_id?: string;
    reason: string;
    notes?: string;
  }) => {
    if (!selectedBooking) return;
    
    try {
      await cancelBooking({
        bookingId: selectedBooking.id,
        data
      });
      
      // Refresh bookings after successful cancellation
      
      // Remove the cancelled booking from the current display
      setBookingsByResource(prev => {
        const newBookings = { ...prev };
        Object.keys(newBookings).forEach(resourceKey => {
          newBookings[resourceKey] = newBookings[resourceKey].filter(
            booking => booking.id !== selectedBooking.id
          );
        });
        return newBookings;
      });

      toast.success('Booking cancelled successfully');
      setShowCancelBookingModal(false);
      setSelectedBooking(null);
    } catch (error) {
      // Error handling is done by the mutation
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      toast.error(errorMessage);
      console.error('Error cancelling booking:', error);
    }
  };

  // Render resource row (for both instructors and aircraft)
  const renderResourceRow = (resource: Instructor | string, isInstructor = false, endorsements: string | null = null) => {
    const resourceKey = isInstructor ? (resource as Instructor).name : resource as string;
    const resourceBookings = bookingsByResource[resourceKey!] || [];
    const rowHeight = 42; // Fixed height for all rows (30% reduction from 60px)
    const visibleSlots = getVisibleTimeSlots();
    
    return (
      <div key={resourceKey} className="flex border-b border-gray-200 resource-row group transition-all duration-200" data-resource={resourceKey} style={{ height: `${rowHeight}px` }}>
        <div className={`w-52 p-4 text-sm font-semibold border-r border-gray-100 flex items-center transition-all duration-200 ${
          isInstructor 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900' 
            : 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700'
        }`} style={{ height: `${rowHeight}px` }}>
          <div className="flex items-center space-x-3 w-full">
            {isInstructor && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0"></div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {isInstructor 
                  ? `${(resource as Instructor).name}${(resource as Instructor).instructor_category ? ` (${(resource as Instructor).instructor_category?.name})` : ''}`
                  : resource as string
                }
              </div>
              {isInstructor && endorsements && (
              <div className="text-xs text-blue-600 font-medium mt-0.5 truncate">
                  {endorsements}
              </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 relative timeline-container" style={{ height: `${rowHeight}px` }}>
          {/* Time grid cells - using CSS Grid to match header alignment */}
          <div 
            className="grid w-full h-full absolute inset-0"
            style={{ gridTemplateColumns: `repeat(${visibleSlots.length}, 1fr)` }}
          >
            {visibleSlots.map((timeSlot) => {
              const isPast = isTimeSlotInPast(timeSlot);
              return (
                <div
                  key={`${resourceKey}-${timeSlot}`}
                  className={`border-r time-cell transition-all duration-200 min-w-[22px] ${
                    isPast
                      ? 'bg-gray-200 border-gray-300 cursor-not-allowed opacity-70'
                      : 'border-gray-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer'
                  }`}
                  data-timeslot={timeSlot}
                  onClick={() => handleCellClick(resourceKey!, timeSlot, isInstructor)}
                  onMouseEnter={(e) => handleTimeSlotHover(resourceKey!, timeSlot, isInstructor, e)}
                onMouseLeave={handleTimeSlotLeave}
              >
              </div>
              );
            })}
          </div>
          
          {/* Current Time Line */}
          {(() => {
            const timeLinePosition = getCurrentTimeLinePosition();
            if (timeLinePosition !== null) {
              return (
                <div
                  className="absolute top-0 bottom-0 bg-red-500 z-40 pointer-events-none"
                  style={{
                    left: `${timeLinePosition}%`,
                    width: '1px',
                    boxShadow: '0 0 2px rgba(239, 68, 68, 0.3)'
                  }}
                />
              );
            }
            return null;
          })()}
          
          {/* Render bookings using full row height */}
          {resourceBookings.map((booking: Booking, index: number) => {
            const canAccess = canAccessBooking(booking);
            // Only restrict interactions for members/students who can't access the booking
            const shouldRestrictInteraction = isRestricted && !canAccess;
            
            return (
              <div
                key={`${resourceKey}-${booking.id}-${index}`}
                data-booking-id={booking.id}
                style={getBookingStyle(booking, rowHeight)}
                onMouseEnter={(e) => {
                  if (!resizeData) {
                    if (!shouldRestrictInteraction) {
                      (e.target as HTMLElement).style.transform = 'scale(1.02)';
                      (e.target as HTMLElement).style.zIndex = '30';
                      handleBookingMouseEnter(e, booking);
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!resizeData) {
                    (e.target as HTMLElement).style.transform = 'scale(1)';
                    (e.target as HTMLElement).style.zIndex = '20';
                    handleBookingMouseLeave();
                  }
                }}
                onMouseMove={handleBookingMouseMove}
                onClick={(e) => !shouldRestrictInteraction ? handleBookingClick(booking, e) : undefined}
                onDoubleClick={(e) => !shouldRestrictInteraction ? handleBookingDoubleClick(booking, e) : undefined}
                onContextMenu={(e) => !shouldRestrictInteraction ? handleBookingRightClick(booking, e) : undefined}
                className={`transition-all duration-200 group relative ${!shouldRestrictInteraction ? 'hover:shadow-xl' : 'cursor-not-allowed'}`}
              >
                {/* Start resize handle - only show if interaction is not restricted */}
                {!shouldRestrictInteraction && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-400/30 hover:bg-blue-500/50 z-10"
                    onMouseDown={(e) => handleResizeMouseDown(e, booking, resourceKey!, 'start')}
                    title="Drag to change start time"
                  />
                )}
                
                {/* Booking content */}
                <span className="px-3 block truncate">{booking.name}</span>
                
                {/* End resize handle - only show if interaction is not restricted */}
                {!shouldRestrictInteraction && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-400/30 hover:bg-blue-500/50 z-10"
                    onMouseDown={(e) => handleResizeMouseDown(e, booking, resourceKey!, 'end')}
                    title="Drag to change end time"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Function to add booking optimistically to the display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addBookingOptimistically = (newBookingData: any) => {
    try {
      // Check if booking is on the current selected date
      const bookingDate = new Date(newBookingData.start_time);
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const bookingDateStr = format(bookingDate, 'yyyy-MM-dd');
      
      if (bookingDateStr !== selectedDateStr) {
        // If booking is not for current date, don't add to current view
        return;
      }

      // Convert booking to scheduler format
      const startTime = bookingDate.getHours() + (bookingDate.getMinutes() / 60);
      const endTime = new Date(newBookingData.end_time);
      const duration = (endTime.getTime() - bookingDate.getTime()) / (1000 * 60 * 60);
      
      // Use the booking ID directly as string
      const bookingId = newBookingData.id || Date.now().toString(); // Use timestamp as fallback for unique ID

      const schedulerBooking: Booking = {
        id: bookingId,
        start: startTime,
        duration: duration,
        name: newBookingData.user?.first_name && newBookingData.user?.last_name
          ? `${newBookingData.user.first_name} ${newBookingData.user.last_name}`
          : newBookingData.user?.email || newBookingData.purpose || 'Flight',
        type: 'booking',
        student: newBookingData.user?.first_name && newBookingData.user?.last_name
          ? `${newBookingData.user.first_name} ${newBookingData.user.last_name}`
          : newBookingData.user?.email || newBookingData.user?.id || 'Student',
        instructor: 'No Instructor', // Will be set below if instructor exists
        aircraft: newBookingData.aircraft?.registration || 'Aircraft',
        status: newBookingData.status || 'confirmed',
        purpose: newBookingData.purpose,
        remarks: newBookingData.remarks,
        lesson_id: newBookingData.lesson_id,
        flight_type_id: newBookingData.flight_type_id,
        booking_type: newBookingData.booking_type,
        created_at: newBookingData.created_at,
        updated_at: newBookingData.updated_at,
        user_id: newBookingData.user_id || undefined
      };

      setBookingsByResource(prev => {
        const newBookings = { ...prev };

        // Add to instructor resource if available
        if (newBookingData.instructor_id) {
          const instructor = availableInstructors.find(inst => inst.id === newBookingData.instructor_id);
          if (instructor) {
            schedulerBooking.instructor = instructor.name!;
            if (!newBookings[instructor.name!]) {
              newBookings[instructor.name!] = [];
            }
            newBookings[instructor.name!].push(schedulerBooking);
          }
        }

        // Add to aircraft resource if available
        if (newBookingData.aircraft_id) {
          const aircraftMatch = aircraft.find(aircraftData => 
            aircraftData.id === newBookingData.aircraft_id
          );
          const aircraftDisplay = aircraftMatch 
            ? (aircraftMatch.type 
                ? `${aircraftMatch.registration} (${aircraftMatch.type})`
                : aircraftMatch.registration)
            : (newBookingData.aircraft?.registration || 'Unknown Aircraft');
          
          if (!newBookings[aircraftDisplay]) {
            newBookings[aircraftDisplay] = [];
          }
          newBookings[aircraftDisplay].push({
            ...schedulerBooking,
            instructor: schedulerBooking.instructor || 'No Instructor'
          });
        }

        return newBookings;
      });
    } catch (error) {
      console.error("Error adding booking optimistically:", error);
      // If optimistic update fails, don't crash - user can refresh to see the booking
    }
  };

  if (loading || businessHoursLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading scheduler...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Scheduler</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchAllData(true)} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show message if business is closed
  if (businessHours && businessHours.is_closed) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Business Closed</h2>
          <p className="text-gray-600">The scheduler is not available when the business is closed.</p>
        </div>
      </div>
    );
  }

  return (
    <SettingsProvider>
      <div className="w-full min-h-screen flex flex-col items-center">
        <div className="w-full max-w-[96vw] px-6 pt-8 pb-12 flex flex-col gap-8">
          {/* Header Section - restored original style */}
          <div className="bg-white p-4 border-b border-gray-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <button 
                  onClick={() => {
                    const previousDay = new Date(selectedDate);
                    previousDay.setDate(selectedDate.getDate() - 1);
                    setSelectedDate(previousDay);
                  }}
                  className="text-xl text-gray-600 hover:text-blue-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <Popover>
                <PopoverTrigger asChild>
                  <Button
                      variant="ghost"
                      className="font-bold text-lg text-gray-800 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    {format(selectedDate, "EEEE, dd MMMM yyyy")}
                  </Button>
                </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                  />
                </PopoverContent>
              </Popover>
              
                <button 
                onClick={() => {
                    const nextDay = new Date(selectedDate);
                    nextDay.setDate(selectedDate.getDate() + 1);
                    setSelectedDate(nextDay);
                  }}
                  className="text-xl text-gray-600 hover:text-blue-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="text-sm">
                <button 
                  onClick={() => setSelectedDate(new Date())}
                  className="bg-blue-500 hover:bg-blue-600 transition-colors duration-200 px-4 py-2 rounded-full font-medium cursor-pointer text-white"
                >
                  Today
                </button>
              </div>
            </div>
          </div>

          {/* Main Scheduler */}
          <div className="w-full overflow-hidden mx-auto">
            <div className="relative">
              {/* Refreshing overlay */}
              {refreshing && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-md">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-700">Updating schedule...</span>
                  </div>
                </div>
              )}

              <div
                ref={timelineRef}
                className="w-full bg-white select-none rounded-md overflow-x-auto shadow-lg border min-w-[800px] max-w-full"
                onWheel={handleWheelScroll}
              >
              {/* Time Header with Navigation */}
              <div className="flex border-b border-gray-300 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="w-52 border-r border-gray-200 flex items-center justify-center bg-white">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={scrollLeft}
                      disabled={!canScrollLeft()}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        canScrollLeft() 
                          ? 'text-gray-600 hover:text-blue-500 hover:bg-gray-100 cursor-pointer' 
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      ←
                    </button>
                    <div className="text-xs text-gray-700 font-medium text-center min-w-0">
                      <div className="truncate">{getCurrentTimeRange()}</div>
                    </div>
                    <button 
                      onClick={scrollRight}
                      disabled={!canScrollRight()}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        canScrollRight() 
                          ? 'text-gray-600 hover:text-blue-500 hover:bg-gray-100 cursor-pointer' 
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      →
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <div
                    className="grid w-full h-full"
                    style={{ gridTemplateColumns: `repeat(${getVisibleTimeSlots().length}, 1fr)` }}
                  >
                    {getVisibleTimeSlots().map((timeSlot) => (
                      <div
                        key={timeSlot}
                        className="border-r border-gray-200 text-[10px] py-1 px-0.5 text-center bg-gradient-to-r from-blue-50 to-indigo-50 font-semibold text-gray-700 hover:bg-gradient-to-b hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 min-w-[22px]"
                      >
                        {timeSlot}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instructors Section */}
              {availableInstructors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No instructors scheduled for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                </div>
              ) : (
                availableInstructors.map(instructor => renderResourceRow(
                  instructor,
                  true,
                  instructor.endorsements
                ))
              )}

              {/* Divider */}
              <div className="border-t-2 border-gradient-to-r from-blue-400 to-purple-400 bg-gradient-to-r from-blue-100 to-purple-100 h-1"></div>

              {/* Aircraft Section */}
              {aircraft.map(aircraftItem => {
                const displayName = aircraftItem.type
                  ? `${aircraftItem.registration} (${aircraftItem.type})`
                  : aircraftItem.registration;
                return renderResourceRow(displayName, false);
              })}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showNewBookingModal && (
          <NewBookingModal
            open={showNewBookingModal}
            onClose={() => {
              setShowNewBookingModal(false);
              setSelectedAircraft(null);
              setSelectedTimeSlot(null);
              setPrefilledBookingData(null);
            }}
            aircraft={aircraft.map(a => ({
              id: a.id,
              registration: a.registration,
              type: a.type
            }))}
            bookings={rawBookings}
            prefilledData={prefilledBookingData || (selectedTimeSlot ? {
              date: selectedDate,
              startTime: selectedTimeSlot
            } : undefined)}
            onBookingCreated={addBookingOptimistically}
          />
        )}

        {showCancelBookingModal && selectedBooking && (
          <CancelBookingModal
            open={showCancelBookingModal}
            onOpenChange={(open) => {
              if (!open) {
                setShowCancelBookingModal(false);
                setSelectedBooking(null);
              }
            }}
            onSubmit={handleCancelBooking}
            categories={Array.isArray(cancellationCategories) ? cancellationCategories : []}
            bookingId={selectedBooking.id}
          />
        )}

        {showChangeAircraftModal && selectedBooking && (
          <ChangeAircraftModal
            open={showChangeAircraftModal}
            onOpenChange={(open) => {
              if (!open) {
                setShowChangeAircraftModal(false);
                setSelectedBooking(null);
              }
            }}
            booking={{
              id: selectedBooking.id,
              name: selectedBooking.name,
              aircraft: selectedBooking.aircraft,
              start_time: formatTime(selectedBooking.start),
              end_time: formatTime(selectedBooking.start + selectedBooking.duration)
            }}
            aircraft={aircraft.map(a => ({
              id: a.id,
              registration: a.registration,
              type: a.type
            }))}
            onAircraftChanged={async (bookingId, newAircraftId) => {
              try {
                const response = await fetch('/api/bookings', {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    id: bookingId,
                    aircraft_id: newAircraftId,
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to change aircraft');
                }

                toast.success('Aircraft changed successfully');
                fetchAllData(false); // Refresh data
                setShowChangeAircraftModal(false);
                setSelectedBooking(null);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to change aircraft';
                toast.error(errorMessage);
                console.error('Error changing aircraft:', error);
              }
            }}
          />
        )}

        {showContactDetailsModal && selectedBooking && (
          <ContactDetailsModal
            open={showContactDetailsModal}
            onOpenChange={(open) => {
              if (!open) {
                setShowContactDetailsModal(false);
                setSelectedBooking(null);
              }
            }}
            userId={selectedBooking.user_id || null}
          />
        )}

        {/* Booking Hover Modal */}
        {hoveredBooking && (() => {
          // Calculate position for hover tooltip (approximate size: 280px width, 200px height)
          const position = calculatePopupPosition(mousePosition.x + 15, mousePosition.y, 280, 200);
          return (
            <div
              className="fixed z-50 pointer-events-none"
              style={{
                left: position.x,
                top: position.y,
                transform: position.transform
              }}
          >
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 border-l-blue-500 p-3 max-w-xs animate-in fade-in duration-150">
              {/* Header */}
              <div className="border-b border-blue-200 pb-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{hoveredBooking.student}</h3>
                <p className="text-xs text-gray-500">{hoveredBooking.booking_type || 'flight'}</p>
              </div>
              
              {/* Details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">{hoveredBooking.instructor}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <PlaneIcon className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">{hoveredBooking.aircraft}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">{getBookingTimeRange(hoveredBooking)} ({hoveredBooking.duration}h)</span>
                </div>
                
                {hoveredBooking.purpose && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-gray-600 text-xs">{hoveredBooking.purpose}</p>
                  </div>
                )}
              </div>
            </div>
            </div>
          );
        })()}

        {/* Time Slot Hover Tooltip */}
        {hoveredTimeSlot && !hoveredBooking && (() => {
          // Calculate position for time slot tooltip (approximate size: 200px width, 100px height)
          const position = calculatePopupPosition(mousePosition.x + 15, mousePosition.y, 200, 100);
          return (
            <div
              className="fixed z-50 pointer-events-none"
              style={{
                left: position.x,
                top: position.y,
                transform: position.transform
              }}
          >
            <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 text-sm">
              <div className="font-medium">Click to create booking</div>
              <div className="text-gray-300 text-xs mt-1">
                {hoveredTimeSlot.isInstructor ? 'Instructor' : 'Aircraft'}: {hoveredTimeSlot.resource}
              </div>
              <div className="text-gray-300 text-xs">
                Time: {hoveredTimeSlot.timeSlot}
              </div>
            </div>
            </div>
          );
        })()}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              transform: contextMenu.transform
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="font-medium text-gray-900 text-sm truncate">
                {contextMenu.booking.name}
              </div>
              <div className="text-xs text-gray-500">
                {getBookingTimeRange(contextMenu.booking)}
              </div>
            </div>
            
            <div className="py-1">
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150"
                onClick={() => handleContextMenuAction('contact-details', contextMenu.booking)}
              >
                <User className="w-4 h-4" />
                View Contact Details
              </button>
              
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors duration-150"
                onClick={() => handleContextMenuAction('change-aircraft', contextMenu.booking)}
              >
                <Plane className="w-4 h-4" />
                Change Aircraft
              </button>

              {/* Confirm Booking - only show for unconfirmed bookings */}
              {contextMenu.booking.status === 'unconfirmed' && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors duration-150"
                  onClick={() => handleContextMenuAction('confirm', contextMenu.booking)}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Confirm Booking
                </button>
              )}

              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
                onClick={() => handleContextMenuAction('cancel', contextMenu.booking)}
              >
                <X className="w-4 h-4" />
                Cancel Booking
              </button>
            </div>
          </div>
        )}

        {/* Time Change Confirmation Modal */}
        {showTimeChangeModal && pendingTimeChange && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Time Change</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You&apos;re about to change the booking times for <strong>{pendingTimeChange.booking.name}</strong>
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Original:</span>
                    <span className="text-sm text-gray-600">
                      {formatTime(pendingTimeChange.booking.start)} - {formatTime(pendingTimeChange.booking.start + pendingTimeChange.booking.duration)}
                      <span className="ml-2 text-gray-500">({pendingTimeChange.booking.duration}h)</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">New:</span>
                    <span className="text-sm text-blue-600 font-medium">
                      {formatTime(pendingTimeChange.newStart)} - {formatTime(pendingTimeChange.newStart + pendingTimeChange.newDuration)}
                      <span className="ml-2 text-gray-500">({pendingTimeChange.newDuration}h)</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelTimeChange}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmTimeChange}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Confirm Change
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsProvider>
  );
};

export default FlightScheduler;
