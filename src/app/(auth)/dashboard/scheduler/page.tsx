'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { NewBookingModal } from "@/components/bookings/NewBookingModal";
import { useRouter } from "next/navigation";

// Define types for better TypeScript support
interface Booking {
  id: number;
  start: number;
  duration: number;
  name: string;
  type: string;
  student: string;
  instructor: string;
  aircraft: string;
  lessonType: string;
  notes: string;
}

interface Instructor {
  id: string;
  user_id: string;
  name: string;
  endorsements: string;
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
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [aircraft, setAircraft] = useState<AircraftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Router for navigation
  const router = useRouter();

  // State for date navigation
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State for bookings (by resource)
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});

  const [dragData, setDragData] = useState<DragData | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{resource: string, timeSlot: string, isInstructor: boolean} | null>(null);
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

  // Fetch instructors and aircraft on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch instructors, endorsements, and aircraft in parallel
        const [instructorsRes, endorsementsRes, aircraftRes] = await Promise.all([
          fetch('/api/instructors'),
          fetch('/api/endorsements'),
          fetch('/api/aircraft')
        ]);
        
        if (!instructorsRes.ok) throw new Error("Failed to fetch instructors");
        if (!endorsementsRes.ok) throw new Error("Failed to fetch endorsements");
        if (!aircraftRes.ok) throw new Error("Failed to fetch aircraft");
        
        const instructorsData = await instructorsRes.json();
        const endorsementsData = await endorsementsRes.json();
        const aircraftData = await aircraftRes.json();
        
        // Process aircraft data - filter for on_line aircraft only
        const onlineAircraft = (aircraftData.aircrafts || [])
          .filter((aircraft: AircraftData) => aircraft.on_line === true)
          .map((aircraft: AircraftData) => ({
            id: aircraft.id,
            registration: aircraft.registration,
            type: aircraft.type,
            on_line: aircraft.on_line
          }));
        
        setAircraft(onlineAircraft);
        
        // Create a map of endorsement IDs to names for quick lookup
        const endorsementMap = new Map();
        (endorsementsData.endorsements || []).forEach((endorsement: { id: string; name: string }) => {
          endorsementMap.set(endorsement.id, endorsement.name);
        });
        
        // Fetch instructor endorsements for each instructor
        const instructorsWithEndorsements = await Promise.all(
          (instructorsData.instructors || [])
            .filter((instructor: { is_actively_instructing: boolean }) => {
              return instructor.is_actively_instructing === true;
            }) // Only active instructors
            .map(async (instructor: { id: string; user_id: string; is_actively_instructing: boolean; users?: { first_name?: string; last_name?: string; email?: string } }) => {
            try {
              const endorsementsRes = await fetch(`/api/instructor_endorsements?instructor_id=${instructor.id}`);
              if (endorsementsRes.ok) {
                const endorsementsData = await endorsementsRes.json();
                const endorsementNames = (endorsementsData.instructor_endorsements || [])
                  .map((ie: { endorsement_id: string }) => endorsementMap.get(ie.endorsement_id))
                  .filter(Boolean); // Remove any undefined values
                
                return {
                  id: instructor.id,
                  user_id: instructor.user_id, // Assuming user_id is available in the fetched data
                  name: `${instructor.users?.first_name || ""} ${instructor.users?.last_name || ""}`.trim() || instructor.users?.email || `Instructor ${instructor.id}`,
                  endorsements: endorsementNames.join(', ') || 'No endorsements'
                };
              } else {
                // Fallback if endorsements fetch fails
                return {
                  id: instructor.id,
                  user_id: instructor.user_id, // Assuming user_id is available in the fetched data
                  name: `${instructor.users?.first_name || ""} ${instructor.users?.last_name || ""}`.trim() || instructor.users?.email || `Instructor ${instructor.id}`,
                  endorsements: 'No endorsements'
                };
              }
            } catch {
              // Fallback if endorsements fetch fails
              return {
                id: instructor.id,
                user_id: instructor.user_id, // Assuming user_id is available in the fetched data
                name: `${instructor.users?.first_name || ""} ${instructor.users?.last_name || ""}`.trim() || instructor.users?.email || `Instructor ${instructor.id}`,
                endorsements: 'No endorsements'
              };
            }
          })
        );
        
        setInstructors(instructorsWithEndorsements);
      } catch (err) {
        setError("Failed to load data");
        console.error("Error fetching data:", err);
        // Fallback to empty arrays on error
        setInstructors([]);
        setAircraft([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      
      // Generate a unique temporary ID for optimistic bookings to avoid React key conflicts
      const bookingId = newBookingData.id ? 
        (typeof newBookingData.id === 'string' ? parseInt(newBookingData.id) : newBookingData.id) :
        Date.now(); // Use timestamp as fallback for unique ID

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
        notes: newBookingData.remarks || ''
      };

      setBookings(prev => {
        const newBookings = { ...prev };

        // Add to instructor resource if available
        if (newBookingData.instructor_id) {
          const instructor = instructors.find(inst => inst.id === newBookingData.instructor_id);
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

  // Fetch bookings when the selected date changes
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // Format date for API query (YYYY-MM-DD)
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Fetch bookings for the selected date with comprehensive data
        const bookingsRes = await fetch(`/api/bookings`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Ensure cookies are sent for auth
        });
        
        if (!bookingsRes.ok) {
          // Log the error details for debugging
          let errorText = '';
          try {
            errorText = await bookingsRes.text();
          } catch (textError) {
            console.error("Could not read error response:", textError);
          }
          
          console.error("Bookings API error:", {
            status: bookingsRes.status,
            statusText: bookingsRes.statusText,
            body: errorText,
            headers: Object.fromEntries(bookingsRes.headers.entries()),
            url: bookingsRes.url
          });
          
          // Don't throw error, just return empty bookings
          setBookings({});
          return;
        }
        
        const bookingsData = await bookingsRes.json();
        
        // Ensure bookingsData has the expected structure
        if (!bookingsData || !Array.isArray(bookingsData.bookings)) {
          console.warn("Unexpected bookings data structure:", bookingsData);
          setBookings({});
          return;
        }
        
        // Filter bookings for the selected date and group by resource
        const bookingsByResource: Record<string, Booking[]> = {};
        
        bookingsData.bookings.forEach((booking: BookingData) => {
          try {
            // Validate required fields
            if (!booking.start_time || !booking.end_time) {
              console.warn("Booking missing required time fields:", booking.id);
              return;
            }
            
            // Check if booking is on the selected date
            const bookingDate = new Date(booking.start_time);
            if (isNaN(bookingDate.getTime())) {
              console.warn("Invalid booking start_time:", booking.start_time);
              return;
            }
            
            const bookingDateStr = format(bookingDate, 'yyyy-MM-dd');
            
            if (bookingDateStr === dateStr && (booking.status === 'confirmed' || booking.status === 'flying' || booking.status === 'complete')) {
              // Convert booking to scheduler format
              const startTime = bookingDate.getHours() + (bookingDate.getMinutes() / 60);
              const endTime = new Date(booking.end_time);
              
              if (isNaN(endTime.getTime())) {
                console.warn("Invalid booking end_time:", booking.end_time);
                return;
              }
              
              const duration = (endTime.getTime() - bookingDate.getTime()) / (1000 * 60 * 60); // Convert to hours
              
              if (duration <= 0) {
                console.warn("Invalid booking duration:", { start: booking.start_time, end: booking.end_time });
                return;
              }
              
              const schedulerBooking: Booking = {
                id: parseInt(booking.id) || 0,
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
                  : booking.instructor?.email || 'No Instructor', // Set instructor from booking data first
                aircraft: booking.aircraft?.registration || 'Aircraft',
                lessonType: booking.booking_type || 'flight',
                notes: booking.remarks || ''
              };
              
              // Group by instructor if available
              if (booking.instructor_id) {
                // booking.instructor_id refers to instructors.id, so match with instructor.id
                const instructor = instructors.find(inst => inst.id === booking.instructor_id);
                
                if (instructor) {
                  // Override the instructor name with the one from our filtered list
                  schedulerBooking.instructor = instructor.name;
                  if (!bookingsByResource[instructor.name]) {
                    bookingsByResource[instructor.name] = [];
                  }
                  bookingsByResource[instructor.name].push(schedulerBooking);
                } else {
                  // Instructor not found in filtered list, but instructor name should already be set from booking data
                  // Use the instructor name that was already set from booking data
                  const instructorName = schedulerBooking.instructor;
                  
                  // Still add to instructor resource row
                  if (!bookingsByResource[instructorName]) {
                    bookingsByResource[instructorName] = [];
                  }
                  bookingsByResource[instructorName].push(schedulerBooking);
                }
              }
              
              // Always group by aircraft if available
              if (booking.aircraft_id) {
                // Find matching aircraft by ID or registration
                const aircraftMatch = aircraft.find(aircraftData => 
                  aircraftData.id === booking.aircraft_id || 
                  aircraftData.registration === booking.aircraft?.registration
                );
                const aircraftDisplay = aircraftMatch 
                  ? (aircraftMatch.type 
                      ? `${aircraftMatch.registration} (${aircraftMatch.type})`
                      : aircraftMatch.registration)
                  : (booking.aircraft?.type 
                      ? `${booking.aircraft.registration} (${booking.aircraft.type})`
                      : booking.aircraft?.registration || 'Unknown Aircraft');
                
                if (!bookingsByResource[aircraftDisplay]) {
                  bookingsByResource[aircraftDisplay] = [];
                }
                bookingsByResource[aircraftDisplay].push({
                  ...schedulerBooking,
                  instructor: schedulerBooking.instructor || 'No Instructor'
                });
              }
            }
          } catch (bookingError) {
            console.error("Error processing individual booking:", {
              bookingId: booking.id,
              error: bookingError
            });
            // Continue processing other bookings
          }
        });
        
        setBookings(bookingsByResource);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        // Set empty bookings instead of breaking the component
        setBookings({});
      }
    };

    // Only fetch if we have the required data
    if (instructors.length > 0 && aircraft.length > 0) {
      fetchBookings();
    } else {
      // Clear bookings if we don't have instructor/aircraft data yet
      setBookings({});
    }
  }, [selectedDate, instructors, aircraft]);

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
    
    let backgroundColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    let boxShadow = '0 4px 12px rgba(102, 126, 234, 0.25)';
    
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

  const handleCellClick = (resource: string, timeSlot: string, isInstructor: boolean, event: React.MouseEvent) => {
    if (dragData) return; // Don't handle cell clicks during drag
    
    event.preventDefault();
    event.stopPropagation();
    
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
      const instructor = instructors.find(inst => inst.name === resource);
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
    setHoveredTimeSlot({ resource, timeSlot, isInstructor });
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleTimeSlotLeave = () => {
    setHoveredTimeSlot(null);
  };

  const handleBookingClick = (booking: Booking, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Navigate to booking view page
    router.push(`/dashboard/bookings/view/${booking.id}`);
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
    if (!dragData) return;
    
    const deltaX = event.clientX - dragData.startX;
    const deltaY = event.clientY - dragData.startY;
    
    // Update the visual position of the dragged booking
    if (dragRef.current) {
      dragRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      dragRef.current.style.zIndex = '100';
      dragRef.current.style.opacity = '0.8';
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (!dragData) return;
    
    // Find the target cell/resource
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
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const renderResourceRow = (resource: Instructor | string, isInstructor = false, endorsements: string | null = null) => {
    const resourceKey = isInstructor ? (resource as Instructor).name : resource as string;
    const resourceBookings = bookings[resourceKey] || [];
    const rowHeight = 42; // Fixed height for all rows (30% reduction from 60px)
    const visibleSlots = getVisibleTimeSlots();
    
    return (
      <div key={resourceKey} className="flex border-b border-gray-200 resource-row group transition-all duration-200" data-resource={resourceKey} style={{ height: `${rowHeight}px` }}>
        <div className={`w-44 p-4 text-sm font-semibold border-r border-gray-100 flex items-center transition-all duration-200 ${
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
                {isInstructor ? (resource as Instructor).name : resource as string}
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
            {visibleSlots.map((timeSlot) => (
              <div
                key={`${resourceKey}-${timeSlot}`}
                className="border-r border-gray-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer time-cell transition-all duration-200 min-w-[32px]"
                data-timeslot={timeSlot}
                onClick={(e) => handleCellClick(resourceKey, timeSlot, isInstructor, e)}
                onMouseEnter={(e) => handleTimeSlotHover(resourceKey, timeSlot, isInstructor, e)}
                onMouseLeave={handleTimeSlotLeave}
              >
              </div>
            ))}
          </div>
          
          {/* Render bookings using full row height */}
          {resourceBookings.map((booking: Booking, index: number) => (
            <div
              key={`${resourceKey}-${booking.id}-${index}`}
              ref={dragData?.booking.id === booking.id ? dragRef : null}
              style={getBookingStyle(booking, rowHeight)}
              onMouseDown={(e) => {
                // Only start drag if Shift key is held, otherwise let onClick handle navigation
                if (e.shiftKey) {
                  handleBookingMouseDown(e, booking, resourceKey);
                }
              }}
              onMouseEnter={(e) => {
                if (!dragData) {
                  (e.target as HTMLElement).style.transform = 'scale(1.02)';
                  (e.target as HTMLElement).style.zIndex = '30';
                  handleBookingMouseEnter(e, booking);
                }
              }}
              onMouseLeave={(e) => {
                if (!dragData) {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                  (e.target as HTMLElement).style.zIndex = '20';
                  handleBookingMouseLeave();
                }
              }}
              onMouseMove={handleBookingMouseMove}
              onClick={(e) => handleBookingClick(booking, e)}
              title={`${booking.name} - Click to view details`}
              className="hover:shadow-xl transition-all duration-200"
            >
              {booking.name}
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
        <div className="w-44 border-r border-gray-200 flex items-center justify-center bg-white">
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
                className="border-r border-gray-200 text-xs py-1 px-0.5 text-center bg-gradient-to-b from-gray-50 to-gray-100 font-semibold text-gray-700 hover:bg-gradient-to-b hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 min-w-[32px]"
              >
                {timeSlot}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructors Section */}
      {loading ? (
        <div className="text-center py-8">Loading instructors...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : (
        instructors.map(instructor => renderResourceRow(
          instructor, 
          true, 
          instructor.endorsements
        ))
      )}

      {/* Divider */}
      <div className="border-t-2 border-gradient-to-r from-blue-400 to-purple-400 bg-gradient-to-r from-blue-100 to-purple-100 h-1"></div>

      {/* Aircraft Section */}
      {loading ? (
        <div className="text-center py-8">Loading aircraft...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : (
        aircraft.map(aircraftItem => {
          const displayName = aircraftItem.type 
            ? `${aircraftItem.registration} (${aircraftItem.type})`
            : aircraftItem.registration;
          return renderResourceRow(displayName, false);
        })
      )}

      {/* Beautiful Booking Hover Modal */}
      {hoveredBooking && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-3 mb-3">
              <h3 className="font-bold text-lg">{hoveredBooking.student}</h3>
              <p className="text-blue-100 text-sm">{hoveredBooking.lessonType}</p>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Instructor:</span>
                <span className="text-gray-600">{hoveredBooking.instructor}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Aircraft:</span>
                <span className="text-gray-600">{hoveredBooking.aircraft}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Time:</span>
                <span className="text-gray-600">{getBookingTimeRange(hoveredBooking)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Duration:</span>
                <span className="text-gray-600">{hoveredBooking.duration}h</span>
              </div>
              
              {hoveredBooking.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 italic">&quot;{hoveredBooking.notes}&quot;</p>
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                💡 Click booking to view details
              </div>
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
        bookings={[]} // We can pass empty array since we're not checking conflicts in this context
        prefilledData={prefilledBookingData || undefined}
        onBookingCreated={addBookingOptimistically}
      />
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