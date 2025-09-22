'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight, X, Plane, Clock, User, Plane as PlaneIcon } from "lucide-react";
import { format } from "date-fns";
import { NewBookingModal } from "@/components/bookings/NewBookingModal";
import { CancelBookingModal } from "@/components/bookings/CancelBookingModal";
import { ChangeAircraftModal } from "@/components/bookings/ChangeAircraftModal";
import { ContactDetailsModal } from "@/components/bookings/ContactDetailsModal";
import { useCancellationCategories } from "@/hooks/use-cancellation-categories";
import { useCancelBooking } from "@/hooks/use-cancel-booking";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  lessonType: string;
  notes: string;
  status: string;
  user_id?: string; // Add user_id for contact details
}

interface Instructor {
  id: string;
  user_id: string;
  name: string;
  endorsements: string;
  instructor_category?: {
    id: string;
    name: string;
    description: string | null;
    country: string;
  } | null;
}

interface AircraftData {
  id: string;
  registration: string;
  type?: string;
  on_line: boolean;
}

interface DragData {
  booking: Booking;
  resource: string;
  originalResource: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  containerLeft?: number;
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

interface BookingData {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
  instructor_id?: string;
  aircraft_id?: string;
  purpose?: string;
  remarks?: string;
  booking_type?: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  instructor?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  aircraft?: {
    id: string;
    registration: string;
    type?: string;
  };
}

const FlightScheduler = () => {
  // State for instructors and aircraft resources
  const [aircraft, setAircraft] = useState<AircraftData[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]);

  // Simple loading state
  const [isDataFullyLoaded, setIsDataFullyLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Router for navigation
  const router = useRouter();

  // State for date navigation
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State for bookings (by resource)
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});
  // State for raw booking data (for conflict checking)
  const [rawBookings, setRawBookings] = useState<import("@/types/bookings").Booking[]>([]);

  const [dragData, setDragData] = useState<DragData | null>(null);
  const [resizeData, setResizeData] = useState<ResizeData | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{resource: string, timeSlot: string, isInstructor: boolean} | null>(null);
  const [showTimeChangeModal, setShowTimeChangeModal] = useState(false);
  const [pendingTimeChange, setPendingTimeChange] = useState<{
    booking: Booking;
    newStart: number;
    newDuration: number;
    resource: string;
  } | null>(null);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [timelineOffset, setTimelineOffset] = useState(0); // New state for timeline scrolling
  const [contextMenu, setContextMenu] = useState<{
    booking: Booking;
    x: number;
    y: number;
  } | null>(null);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasResized, setHasResized] = useState(false);
  const [showChangeAircraftModal, setShowChangeAircraftModal] = useState(false);
  const [changeAircraftBooking, setChangeAircraftBooking] = useState<{
    id: string;
    name: string;
    aircraft: string;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [showContactDetailsModal, setShowContactDetailsModal] = useState(false);
  const [contactDetailsUserId, setContactDetailsUserId] = useState<string | null>(null);
  
  // Cancel booking hooks
  const { data: categoriesData } = useCancellationCategories();
  const cancelBookingMutation = useCancelBooking();

  // Date navigation functions
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(selectedDate.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const dragRef = useRef<HTMLDivElement>(null);

  // Configuration for timeline scrolling
  const VISIBLE_SLOTS = 18; // Fixed number of visible slots (optimized for narrower columns)

  // Time slots from 7:00 AM to 10:00 PM (30-minute intervals)
  const timeSlots: string[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Fast, streamlined data fetching
  useEffect(() => {
    const fetchAllData = async () => {
      setError(null);
      setIsDataFullyLoaded(false);

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dayOfWeek = selectedDate.getDay();

        // Fetch everything in parallel
        const [instructorsRes, endorsementsRes, aircraftRes, instructorEndorsementsRes, rosterRulesRes, shiftOverridesRes, bookingsRes] = await Promise.all([
          fetch('/api/instructors'),
          fetch('/api/endorsements'),
          fetch('/api/aircraft'),
          fetch('/api/instructor_endorsements'),
          fetch(`/api/roster-rules?day_of_week=${dayOfWeek}&is_active=true`),
          fetch(`/api/shift-overrides?override_date=${dateStr}`),
          fetch('/api/bookings', { credentials: 'include' })
        ]);

        if (!instructorsRes.ok || !endorsementsRes.ok || !aircraftRes.ok || !instructorEndorsementsRes.ok || !rosterRulesRes.ok || !shiftOverridesRes.ok || !bookingsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const [instructorsData, endorsementsData, aircraftData, instructorEndorsementsData, rosterRulesData, shiftOverridesData, bookingsData] = await Promise.all([
          instructorsRes.json(),
          endorsementsRes.json(),
          aircraftRes.json(),
          instructorEndorsementsRes.json(),
          rosterRulesRes.json(),
          shiftOverridesRes.json(),
          bookingsRes.json()
        ]);

        // Process aircraft
        const onlineAircraft = (aircraftData.aircrafts || [])
          .filter((aircraft: AircraftData) => aircraft.on_line === true)
          .map((aircraft: AircraftData) => ({
            id: aircraft.id,
            registration: aircraft.registration,
            type: aircraft.type,
            on_line: aircraft.on_line
          }));

        // Process endorsements
        const endorsementMap = new Map();
        (endorsementsData.endorsements || []).forEach((endorsement: { id: string; name: string }) => {
          endorsementMap.set(endorsement.id, endorsement.name);
        });

        const instructorEndorsementsMap = new Map();
        (instructorEndorsementsData.instructor_endorsements || []).forEach((ie: { instructor_id: string; endorsement_id: string }) => {
          if (!instructorEndorsementsMap.has(ie.instructor_id)) {
            instructorEndorsementsMap.set(ie.instructor_id, []);
          }
          const endorsementName = endorsementMap.get(ie.endorsement_id);
          if (endorsementName) {
            instructorEndorsementsMap.get(ie.instructor_id).push(endorsementName);
          }
        });

        // Process instructors
        const processedInstructors = (instructorsData.instructors || [])
          .filter((instructor: { is_actively_instructing: boolean }) => instructor.is_actively_instructing === true)
          .map((instructor: { id: string; user_id: string; first_name?: string; last_name?: string; users?: { email?: string }; instructor_category?: { id: string; name: string; description: string | null; country: string } | null }) => {
            const endorsementNames = instructorEndorsementsMap.get(instructor.id) || [];
            return {
              id: instructor.id,
              user_id: instructor.user_id,
              name: `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.users?.email || `Instructor ${instructor.id}`,
              endorsements: endorsementNames.join(', ') || 'No endorsements',
              instructor_category: instructor.instructor_category
            };
          });

        // Filter instructors by roster
        const filteredInstructors = processedInstructors.filter((instructor: Instructor) => {
          const hasValidRosterRule = rosterRulesData.roster_rules?.some((rule: { instructor_id: string; effective_from: string; effective_until?: string; is_active: boolean; voided_at?: string }) => {
            if (rule.instructor_id !== instructor.id) return false;
            const effectiveFrom = new Date(rule.effective_from);
            const effectiveUntil = rule.effective_until ? new Date(rule.effective_until) : null;
            const selectedDateOnly = new Date(selectedDate);
            selectedDateOnly.setHours(0, 0, 0, 0);
            const isWithinDateRange = effectiveFrom <= selectedDateOnly && (!effectiveUntil || effectiveUntil >= selectedDateOnly);
            return rule.is_active && isWithinDateRange && !rule.voided_at;
          });

          const hasValidOverride = shiftOverridesData.shift_overrides?.some((override: { instructor_id: string; override_type: string; voided_at?: string }) => {
            return override.instructor_id === instructor.id && override.override_type !== 'cancel' && !override.voided_at;
          });

          return hasValidRosterRule || hasValidOverride;
        });

        // Process bookings
        const bookingsByResource: Record<string, Booking[]> = {};
        (bookingsData.bookings || []).forEach((booking: BookingData) => {
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
                lessonType: booking.booking_type || 'flight',
                notes: booking.purpose || '',
                status: booking.status || 'confirmed',
                user_id: booking.user_id || undefined
              };

              // Group by instructor
              if (booking.instructor_id) {
                const instructor = filteredInstructors.find((inst: Instructor) => inst.id === booking.instructor_id);
                const instructorName = instructor ? instructor.name : schedulerBooking.instructor;
                if (!bookingsByResource[instructorName]) {
                  bookingsByResource[instructorName] = [];
                }
                if (instructor) schedulerBooking.instructor = instructor.name;
                bookingsByResource[instructorName].push(schedulerBooking);
              }

              // Group by aircraft
              if (booking.aircraft_id) {
                const aircraftMatch = onlineAircraft.find((aircraftData: AircraftData) =>
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
        setBookings(bookingsByResource);
        setIsDataFullyLoaded(true);

      } catch (err) {
        setError("Failed to load scheduler data");
        console.error("Error fetching scheduler data:", err);
        setAircraft([]);
        setAvailableInstructors([]);
        setBookings({});
        setRawBookings([]);
      }
    };

    fetchAllData();
  }, [selectedDate]);


  // Function to optimistically add a booking to the scheduler
  const addBookingOptimistically = (newBookingData: import("@/types/bookings").Booking) => {
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
        lessonType: newBookingData.booking_type || 'flight',
        notes: newBookingData.purpose || '',
        status: newBookingData.status || 'confirmed',
        user_id: newBookingData.user_id || undefined
      };

      setBookings(prev => {
        const newBookings = { ...prev };

        // Add to instructor resource if available
        if (newBookingData.instructor_id) {
          const instructor = availableInstructors.find(inst => inst.id === newBookingData.instructor_id);
          if (instructor) {
            schedulerBooking.instructor = instructor.name;
            if (!newBookings[instructor.name]) {
              newBookings[instructor.name] = [];
            }
            newBookings[instructor.name].push(schedulerBooking);
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


  // Debug context menu state
  useEffect(() => {
    console.log('Context menu state changed:', contextMenu);
  }, [contextMenu]);


  const convertTimeToPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  };

  // Convert decimal time to readable format (e.g., 8.5 -> "8:30am")
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

  // Get current time range for display
  const getCurrentTimeRange = () => {
    const visibleSlots = getVisibleTimeSlots();
    if (visibleSlots.length === 0) return '';
    return `${visibleSlots[0]} - ${visibleSlots[visibleSlots.length - 1]}`;
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

  const getBookingStyle = (booking: Booking, rowHeight: number) => {
    const visibleSlots = getVisibleTimeSlots();
    
    if (visibleSlots.length === 0) {
      return { display: 'none' };
    }
    
    const firstVisibleTime = convertTimeToPosition(visibleSlots[0]);
    const lastVisibleTime = convertTimeToPosition(visibleSlots[visibleSlots.length - 1]) + 0.5; // Add 0.5 for the last slot duration
    
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
    
    let backgroundColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // Default purple for 'confirmed'
    let boxShadow = '0 4px 12px rgba(102, 126, 234, 0.25)';
    
    // Status-based colors (takes priority over type-based colors)
    switch (booking.status) {
      case 'confirmed':
        backgroundColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // Purple
        boxShadow = '0 4px 12px rgba(102, 126, 234, 0.25)';
        break;
      case 'flying':
        backgroundColor = 'linear-gradient(135deg, #ff9a56 0%, #ffad56 100%)'; // Orange
        boxShadow = '0 4px 12px rgba(255, 154, 86, 0.25)';
        break;
      case 'complete':
        backgroundColor = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'; // Green
        boxShadow = '0 4px 12px rgba(74, 222, 128, 0.25)';
        break;
      case 'unconfirmed':
        backgroundColor = 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'; // Grey
        boxShadow = '0 4px 12px rgba(156, 163, 175, 0.25)';
        break;
      default:
        // Keep default purple for confirmed and any other status
        break;
    }
    
    // Type-based colors (only if not overridden by status)
    if (booking.status === 'confirmed') {
      if (booking.type === 'maintenance') {
        backgroundColor = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        boxShadow = '0 4px 12px rgba(245, 87, 108, 0.25)';
      }
      if (booking.type === 'trial' || booking.name === 'TRIAL FLIGHT') {
        backgroundColor = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        boxShadow = '0 4px 12px rgba(79, 172, 254, 0.25)';
      }
      if (booking.type === 'fuel' || booking.name.includes('F...')) {
        backgroundColor = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
        boxShadow = '0 4px 12px rgba(168, 237, 234, 0.25)';
      }
    }

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
      border: 'none',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      zIndex: 20,
      top: '3px',
      cursor: 'move',
      userSelect: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      boxShadow: boxShadow,
      transition: 'all 0.2s ease-in-out',
      backdropFilter: 'blur(10px)'
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
      cursor: 'move',
      userSelect: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      boxShadow: boxShadow,
      transition: 'none', // No transition during resize for immediate feedback
      backdropFilter: 'blur(10px)'
    };
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

  const handleCellClick = (resource: string, timeSlot: string, isInstructor: boolean) => {
    if (dragData) return; // Don't handle cell clicks during drag
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
    
    setPrefilledBookingData(bookingData);
    setShowNewBookingModal(true);
  };

  const handleTimeSlotHover = (resource: string, timeSlot: string, isInstructor: boolean, event: React.MouseEvent) => {
    if (isTimeSlotInPast(timeSlot)) return; // Don't show hover for past time slots
    setHoveredTimeSlot({ resource, timeSlot, isInstructor });
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleTimeSlotLeave = () => {
    setHoveredTimeSlot(null);
  };

  const handleBookingClick = (booking: Booking, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
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

  const handleBookingDoubleClick = (booking: Booking, event: React.MouseEvent) => {
    console.log('Double click detected on booking:', booking.name);
    event.preventDefault();
    event.stopPropagation();
    
    // Clear single click timeout to prevent navigation
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    // Close hover modal when showing context menu
    setHoveredBooking(null);
    
    // Show context menu at cursor position
    setContextMenu({
      booking,
      x: event.clientX,
      y: event.clientY
    });
    
    console.log('Context menu set:', { x: event.clientX, y: event.clientY });
  };

  const handleContextMenuAction = (action: 'view' | 'cancel' | 'change-aircraft' | 'contact-details', booking: Booking) => {
    setContextMenu(null);

    switch (action) {
      case 'view':
        router.push(`/dashboard/bookings/view/${booking.id}`);
        break;
      case 'cancel':
        setCancelBookingId(booking.id);
        setShowCancelModal(true);
        break;
      case 'change-aircraft':
        // Find the raw booking data to get proper timestamps
        const rawBooking = rawBookings.find(rb => rb.id === booking.id);
        if (rawBooking) {
          setChangeAircraftBooking({
            id: booking.id,
            name: booking.name,
            aircraft: booking.aircraft,
            start_time: rawBooking.start_time,
            end_time: rawBooking.end_time,
          });
          setShowChangeAircraftModal(true);
        } else {
          toast.error('Unable to find booking details');
        }
        break;
      case 'contact-details':
        if (booking.user_id) {
          setContactDetailsUserId(booking.user_id);
          setShowContactDetailsModal(true);
        } else {
          toast.error('No contact details available for this booking');
        }
        break;
    }
  };

  const handleBookingRightClick = (booking: Booking, event: React.MouseEvent) => {
    console.log('Right click detected on booking:', booking.name);
    event.preventDefault();
    event.stopPropagation();
    
    // Close hover modal when showing context menu
    setHoveredBooking(null);
    
    // Show context menu at cursor position
    setContextMenu({
      booking,
      x: event.clientX,
      y: event.clientY
    });
    
    console.log('Context menu set from right click:', { x: event.clientX, y: event.clientY });
  };


  const handleCancelBooking = async (data: {
    cancellation_category_id?: string;
    reason: string;
    notes?: string;
  }) => {
    if (!cancelBookingId) return;
    
    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: cancelBookingId,
        data
      });
      
      // Refresh bookings after successful cancellation
      
      // Remove the cancelled booking from the current display
      setBookings(prev => {
        const newBookings = { ...prev };
        Object.keys(newBookings).forEach(resourceKey => {
          newBookings[resourceKey] = newBookings[resourceKey].filter(
            booking => booking.id !== cancelBookingId
          );
        });
        return newBookings;
      });

      toast.success('Booking cancelled successfully');
      setShowCancelModal(false);
      setCancelBookingId(null);
    } catch (error) {
      // Error handling is done by the mutation
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      toast.error(errorMessage);
      console.error('Error cancelling booking:', error);
    }
  };

  const handleCancelModalClose = (open: boolean) => {
    setShowCancelModal(open);
    if (!open) {
      setCancelBookingId(null);
    }
  };

  const handleBookingMouseEnter = (event: React.MouseEvent, booking: Booking) => {
    setHoveredBooking(booking);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleBookingMouseLeave = () => {
    setHoveredBooking(null);
  };

  const handleBookingMouseMove = (event: React.MouseEvent) => {
    if (hoveredBooking && !dragData) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleBookingMouseDown = (event: React.MouseEvent, booking: Booking, resource: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const containerRect = (event.currentTarget.closest('.timeline-container') as HTMLElement)?.getBoundingClientRect();
    
    setDragData({
      booking,
      resource,
      originalResource: resource,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      containerLeft: containerRect?.left
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (dragData) {
      const deltaX = event.clientX - dragData.startX;
      const deltaY = event.clientY - dragData.startY;
      
      // Update the visual position of the dragged booking
      if (dragRef.current) {
        dragRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        dragRef.current.style.zIndex = '100';
        dragRef.current.style.opacity = '0.8';
      }
    } else if (resizeData) {
      // Handle visual feedback for resize
      handleResizeMouseMove(event);
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (dragData) {
      // Handle normal drag operations
      const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
      const cellElement = elementBelow?.closest('.time-cell') as HTMLElement;
      const resourceElement = elementBelow?.closest('.resource-row') as HTMLElement;
      
      if (cellElement && resourceElement) {
        const targetResource = resourceElement.dataset.resource;
        const targetTimeSlot = cellElement.dataset.timeslot;
        const targetTime = convertTimeToPosition(targetTimeSlot || '');
        
        // Update booking position
        if (targetResource && targetTimeSlot) {
          setBookings(prev => {
            const newBookings = { ...prev };
            
            // Remove from original resource
            newBookings[dragData.originalResource] = newBookings[dragData.originalResource].filter(
              (b: Booking) => b.id !== dragData.booking.id
            );
            
            // Add to new resource with new time
            const updatedBooking: Booking = {
              ...dragData.booking,
              start: targetTime
            };
            
            newBookings[targetResource] = [...(newBookings[targetResource] || []), updatedBooking];
            
            return newBookings;
          });
        }
      }
      
      // Reset drag state
      if (dragRef.current) {
        dragRef.current.style.transform = '';
        dragRef.current.style.zIndex = '';
        dragRef.current.style.opacity = '';
      }
      
      setDragData(null);
    } else if (resizeData) {
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

  // Handle aircraft change
  const handleAircraftChange = async (bookingId: string, newAircraftId: string) => {
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

      // Refresh the scheduler data to show the updated booking
      // Simple refresh for now - could be optimized with optimistic updates
      window.location.reload();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change aircraft';
      toast.error(errorMessage);
      throw error; // Re-throw so modal can handle it
    }
  };

  // Handle change aircraft modal close
  const handleChangeAircraftModalClose = (open: boolean) => {
    setShowChangeAircraftModal(open);
    if (!open) {
      setChangeAircraftBooking(null);
    }
  };

  const renderResourceRow = (resource: Instructor | string, isInstructor = false, endorsements: string | null = null) => {
    const resourceKey = isInstructor ? (resource as Instructor).name : resource as string;
    const resourceBookings = bookings[resourceKey] || [];
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
                  className={`border-r time-cell transition-all duration-200 min-w-[32px] ${
                    isPast 
                      ? 'bg-gray-200 border-gray-300 cursor-not-allowed opacity-70' 
                      : 'border-gray-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer'
                  }`}
                  data-timeslot={timeSlot}
                  onClick={() => handleCellClick(resourceKey, timeSlot, isInstructor)}
                  onMouseEnter={(e) => handleTimeSlotHover(resourceKey, timeSlot, isInstructor, e)}
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
          {resourceBookings.map((booking: Booking, index: number) => (
            <div
              key={`${resourceKey}-${booking.id}-${index}`}
              data-booking-id={booking.id}
              ref={dragData?.booking.id === booking.id ? dragRef : null}
              style={getBookingStyle(booking, rowHeight)}
              onMouseDown={(e) => {
                // Only start drag if Shift key is held
                if (e.shiftKey) {
                  handleBookingMouseDown(e, booking, resourceKey);
                }
              }}
              onMouseEnter={(e) => {
                if (!dragData && !resizeData) {
                  (e.target as HTMLElement).style.transform = 'scale(1.02)';
                  (e.target as HTMLElement).style.zIndex = '30';
                  handleBookingMouseEnter(e, booking);
                }
              }}
              onMouseLeave={(e) => {
                if (!dragData && !resizeData) {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                  (e.target as HTMLElement).style.zIndex = '20';
                  handleBookingMouseLeave();
                }
              }}
              onMouseMove={handleBookingMouseMove}
              onClick={(e) => handleBookingClick(booking, e)}
              onDoubleClick={(e) => handleBookingDoubleClick(booking, e)}
              onContextMenu={(e) => handleBookingRightClick(booking, e)}
              className="hover:shadow-xl transition-all duration-200 group relative"
            >
              {/* Start resize handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-400/30 hover:bg-blue-500/50 z-10"
                onMouseDown={(e) => handleResizeMouseDown(e, booking, resourceKey, 'start')}
                title="Drag to change start time"
              />
              
              {/* Booking content */}
              <span className="px-3 block truncate">{booking.name}</span>
              
              {/* End resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-400/30 hover:bg-blue-500/50 z-10"
                onMouseDown={(e) => handleResizeMouseDown(e, booking, resourceKey, 'end')}
                title="Drag to change end time"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white select-none rounded-md overflow-x-auto shadow-lg border min-w-[800px] max-w-full">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={goToPreviousDay}
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
              onClick={goToNextDay}
              className="text-xl text-gray-600 hover:text-blue-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm">
            <button 
              onClick={goToToday}
              className="bg-blue-500 hover:bg-blue-600 transition-colors duration-200 px-4 py-2 rounded-full font-medium cursor-pointer text-white"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Time Header with Navigation */}
      <div className="flex border-b border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50">
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
                className="border-r border-gray-200 text-xs py-1 px-0.5 text-center bg-gradient-to-r from-gray-50 to-slate-50 font-semibold text-gray-700 hover:bg-gradient-to-b hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 min-w-[32px]"
              >
                {timeSlot}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simple blank state until data loads */}
      {!isDataFullyLoaded ? (
        error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : null
      ) : (
        <>
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
        </>
      )}

      {/* Booking Hover Modal */}
      {hoveredBooking && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 border-l-blue-500 p-3 max-w-xs animate-in fade-in duration-150">
            {/* Header */}
            <div className="border-b border-blue-200 pb-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">{hoveredBooking.student}</h3>
              <p className="text-xs text-gray-500">{hoveredBooking.lessonType}</p>
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
              
              {hoveredBooking.notes && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-gray-600 text-xs">{hoveredBooking.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time Slot Hover Tooltip */}
      {hoveredTimeSlot && !hoveredBooking && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-50%)'
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
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: 'translate(-50%, -10px)'
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

      {/* Cancel Booking Modal */}
      {cancelBookingId && (
        <CancelBookingModal
          open={showCancelModal}
          onOpenChange={handleCancelModalClose}
          onSubmit={handleCancelBooking}
          categories={categoriesData?.categories || []}
          loading={cancelBookingMutation.isPending}
          error={cancelBookingMutation.error?.message || null}
          bookingId={cancelBookingId}
        />
      )}

      {/* New Booking Modal */}
      <NewBookingModal
        open={showNewBookingModal}
        onClose={() => {
          setShowNewBookingModal(false);
          setPrefilledBookingData(null);
        }}
        aircraft={aircraft.map(aircraftData => ({
          id: aircraftData.id,
          registration: aircraftData.registration,
          type: aircraftData.type || 'Unknown'
        }))}
        bookings={rawBookings} // Pass all bookings for conflict checking
        prefilledData={prefilledBookingData || undefined}
        onBookingCreated={addBookingOptimistically}
      />

      {/* Change Aircraft Modal */}
      <ChangeAircraftModal
        open={showChangeAircraftModal}
        onOpenChange={handleChangeAircraftModalClose}
        booking={changeAircraftBooking}
        aircraft={aircraft.map(aircraftData => ({
          id: aircraftData.id,
          registration: aircraftData.registration,
          type: aircraftData.type || 'Unknown'
        }))}
        onAircraftChanged={handleAircraftChange}
      />

      {/* Contact Details Modal */}
      <ContactDetailsModal
        open={showContactDetailsModal}
        onOpenChange={(open) => {
          setShowContactDetailsModal(open);
          if (!open) {
            setContactDetailsUserId(null);
          }
        }}
        userId={contactDetailsUserId}
      />

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
  );
};

export default function SchedulerPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-[96vw] px-6 pt-8 pb-12 flex flex-col gap-8">
        
        {/* Main content area - Flight Scheduler */}
        <div className="w-full overflow-hidden mx-auto">
          <FlightScheduler />
        </div>
      </div>
    </div>
  );
} 