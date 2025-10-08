import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarIcon,
  UserIcon,
  Plane,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  StickyNote,
  AlignLeft,
  Users,
  Phone,
  Mail,
  CheckCircle,
  Star,
  Repeat,
  Ticket,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";
import InstructorSelect, { InstructorResult } from "@/components/invoices/InstructorSelect";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useInstructorTypeRating } from "@/hooks/use-instructor-type-rating";
import { TypeRatingWarning } from "@/components/bookings/TypeRatingWarning";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { TimeSlot } from "@/types/settings";
import { useCurrentUserRoles } from "@/hooks/use-user-roles";
import { useIsRestrictedUser } from "@/hooks/use-role-protection";
import { useMemberSyllabusEnrollments } from "@/hooks/use-member-syllabus-enrollments";
import { createClient } from "@/lib/SupabaseBrowserClient";

/**
 * NewBookingModal Component
 * 
 * Modal for creating new bookings with automatic end time calculation based on
 * the configured default booking duration setting.
 * 
 * Features:
 * - Automatic end time calculation: startTime + defaultDuration
 * - Integration with booking time slots system
 * - Support for both regular bookings and trial flights
 * - Real-time conflict checking with existing bookings
 * - Type rating validation for instructor/aircraft combinations
 * 
 * Default Duration Integration:
 * - Fetches 'default_booking_duration_hours' from settings
 * - Automatically calculates end time when start time is selected
 * - Respects time boundaries (won't exceed 23:30)
 * - Allows manual override of calculated end time
 */

// Helper to generate 30-min interval times
const TIME_OPTIONS = Array.from({ length: ((23 - 7) * 2) + 3 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

interface Option {
  id: string;
  name: string;
}
interface AircraftOption {
  id: string;
  registration: string;
  type: string;
  aircraft_type_id?: string | null;
  aircraft_type?: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
  };
  prioritise_scheduling?: boolean;
}

interface NewBookingModalProps {
  open: boolean;
  onClose: () => void;
  aircraft: AircraftOption[];
  bookings: import("@/types/bookings").Booking[];
  refresh?: () => void;
  prefilledData?: {
    date?: Date;
    startTime?: string;
    instructorName?: string;
    aircraftName?: string;
    instructorId?: string;
    instructorUserId?: string;
    aircraftId?: string;
    aircraftRegistration?: string;
    userId?: string;
  };
  onBookingCreated?: (newBookingData: import("@/types/bookings").Booking) => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  open,
  onClose,
  aircraft,
  bookings,
  refresh,
  prefilledData,
  onBookingCreated,
}) => {
  // Form state
  const [activeTab, setActiveTab] = useState("regular");
  const [selectedMember, setSelectedMember] = useState<UserResult | null>(null);
  const [instructor, setInstructor] = useState<InstructorResult | null>(null);
  const [aircraftId, setAircraftId] = useState("");
  const [flightType, setFlightType] = useState("");
  const [lesson, setLesson] = useState("");
  const [bookingType, setBookingType] = useState("flight");
  const [remarks, setRemarks] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flightTypes, setFlightTypes] = useState<Option[]>([]);
  const [lessons, setLessons] = useState<Option[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  
  // Trial flight customer fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [voucherNumber, setVoucherNumber] = useState("");

  // Recurring booking fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringUntilDate, setRecurringUntilDate] = useState<Date | null>(null);
  const [conflictHandling, setConflictHandling] = useState<"skip" | "stop" | "ask">("skip");
  const [recurringProgress, setRecurringProgress] = useState<{
    total: number;
    current: number;
    created: number;
    conflicts: number;
    errors: number;
  } | null>(null);

  // Type rating validation
  const { validation, isValidating, error: validationError, validateTypeRating, resetValidation } = useInstructorTypeRating();

  // Syllabus enrollment data for preferred aircraft selection
  const { preferredAircraftTypeIds } = useMemberSyllabusEnrollments(selectedMember?.id || null);

  // Settings context for default booking duration and time slots
  const { getSettingValue } = useSettingsContext();
  const defaultBookingDuration = getSettingValue('bookings', 'default_booking_duration_hours', 2);
  const customTimeSlots = getSettingValue('bookings', 'custom_time_slots', []);

  // RBAC: Get current user role and user information
  const { data: userRoleData } = useCurrentUserRoles();
  const userRole = userRoleData?.role?.toLowerCase() || '';
  const [currentUser, setCurrentUser] = useState<{id: string; email: string; first_name: string; last_name: string} | null>(null);

  // Check if user has restricted role (member or student)
  const isRestrictedRole = userRole === 'member' || userRole === 'student';

  // Check if user is restricted (for privilege checking)
  const { isRestricted: isRestrictedUser } = useIsRestrictedUser();

  /**
   * Calculates end time based on start time and duration
   * 
   * @param startTime - Start time in HH:MM format (e.g., "10:30")
   * @param durationHours - Duration in hours (e.g., 2 for 2 hours, 1.5 for 90 minutes)
   * @returns End time in HH:MM format, capped at 23:30
   * 
   * Example: calculateEndTime("10:30", 2) returns "12:30"
   */
  const calculateEndTime = React.useCallback((startTime: string, durationHours: number): string => {
    if (!startTime) return "";

    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (durationHours * 60);

    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    // Ensure we don't go past 23:30 (last time option)
    if (endHours >= 24 || (endHours === 23 && endMins > 30)) {
      return "23:30";
    }

    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  }, []);

  /**
   * Validates if a booking time conforms to configured time slots
   *
   * @param date - The booking date
   * @param startTime - Start time in HH:MM format
   * @param endTime - End time in HH:MM format
   * @returns Object with isValid boolean and message string
   */
  const validateTimeSlot = React.useCallback((date: Date | null, startTime: string, endTime: string) => {
    // If no custom time slots are configured, any time is valid
    if (!Array.isArray(customTimeSlots) || customTimeSlots.length === 0) {
      return { isValid: true, message: "" };
    }

    // If any required data is missing, can't validate
    if (!date || !startTime || !endTime) {
      return { isValid: true, message: "" }; // Don't show error if data is incomplete
    }

    // Get the weekday name for the selected date
    const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekdayName = weekdayNames[date.getDay()];

    // Convert times to minutes for easier comparison
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const bookingStartMinutes = timeToMinutes(startTime);
    const bookingEndMinutes = timeToMinutes(endTime);

    // Check if booking fits within any configured time slot
    const fitsInAnySlot = customTimeSlots.some((slot: TimeSlot) => {
      // Check if this slot is active on the selected day
      if (!slot.days || !slot.days.includes(weekdayName)) {
        return false;
      }

      const slotStartMinutes = timeToMinutes(slot.start_time);
      const slotEndMinutes = timeToMinutes(slot.end_time);

      // Check if booking is fully contained within this slot
      return bookingStartMinutes >= slotStartMinutes && bookingEndMinutes <= slotEndMinutes;
    });

    if (!fitsInAnySlot) {
      return {
        isValid: false,
        message: "This booking time doesn't conform to the configured time slots."
      };
    }

    return { isValid: true, message: "" };
  }, [customTimeSlots]);

  // Fetch current user information
  useEffect(() => {
    if (!open) return;

    const fetchCurrentUser = async () => {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();

        if (authData.user) {
          // Fetch user data from public.users table to get the internal user ID and names
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('id', authData.user.id)
            .single();

          if (userData) {
            setCurrentUser({
              id: userData.id,
              email: userData.email,
              first_name: userData.first_name || '',
              last_name: userData.last_name || ''
            });
          }
        }
      } catch {
        // Error fetching current user - silently handle
      }
    };

    fetchCurrentUser();
  }, [open]);

  // Fetch dropdown data on open
  useEffect(() => {
    if (!open) return;
    setDropdownLoading(true);
    Promise.all([
      fetch("/api/flight_types").then(res => res.json()),
      fetch("/api/lessons").then(res => res.json()),
    ])
      .then(([ft, ls]) => {
        setFlightTypes((ft.flight_types || []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })));
        setLessons((ls.lessons || []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })));
      })
      .catch(() => {
        setError("Failed to load dropdown data");
      })
      .finally(() => setDropdownLoading(false));
  }, [open]);

  // When start date changes, auto-set end date to be at least the same as start date
  useEffect(() => {
    if (startDate) {
      if (!endDate || endDate.getTime() < startDate.getTime()) {
        setEndDate(startDate);
      }
    }
  }, [startDate, endDate]);

  // When start time changes, auto-set end time based on default booking duration
  useEffect(() => {
    if (startTime) {
      const calculatedEndTime = calculateEndTime(startTime, defaultBookingDuration);

      // Always update end time when start time changes, unless user has manually set a different end time
      // We'll update it if end time is empty OR if the current end time looks like a previous auto-calculation
      if (!endTime || calculatedEndTime) {
        setEndTime(calculatedEndTime);
      }
    }
  }, [startTime, defaultBookingDuration, calculateEndTime, endTime]);

  // Auto-select current user for members/students
  useEffect(() => {
    if (currentUser && isRestrictedRole && !selectedMember) {
      // For restricted roles, automatically select the current user
      const userResult: UserResult = {
        id: currentUser.id,
        email: currentUser.email,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
      };
      setSelectedMember(userResult);
    }
  }, [currentUser, isRestrictedRole, selectedMember]);

  // Set initial values if prefilledData is provided
  useEffect(() => {
    if (prefilledData) {
      if (prefilledData.date) setStartDate(prefilledData.date);
      if (prefilledData.startTime) setStartTime(prefilledData.startTime);

      // Handle aircraft prefilling
      if (prefilledData.aircraftId) {
        // Use the direct aircraft ID if available
        setAircraftId(prefilledData.aircraftId);
      } else if (prefilledData.aircraftName) {
        // Fallback to finding by name/registration
        const registration = prefilledData.aircraftName.split(' (')[0];
        const aircraftMatch = aircraft.find(a => a.registration === registration);
        if (aircraftMatch) setAircraftId(aircraftMatch.id);
      }

      // Handle instructor prefilling
      if (prefilledData.instructorId && prefilledData.instructorUserId) {
        // Fetch instructor details to create proper InstructorResult object
        fetch('/api/instructors')
          .then(res => res.json())
          .then(data => {
            const instructorData = (data.instructors || []).find((inst: { id: string; first_name?: string; last_name?: string; users?: { email?: string }; user_id: string }) => inst.id === prefilledData.instructorId);
            if (instructorData) {
              const instructorResult = {
                id: instructorData.id,
                user_id: instructorData.user_id,
                first_name: instructorData.first_name || "",
                last_name: instructorData.last_name || "",
                email: instructorData.users?.email || "",
              };
              setInstructor(instructorResult);
            }
          })
          .catch(() => {
            // Failed to fetch instructor details for prefilling - silently handle
          });
      }

      // Handle user/member prefilling
      if (prefilledData.userId) {
        // Fetch user details to create proper UserResult object
        fetch(`/api/users?id=${prefilledData.userId}`)
          .then(res => res.json())
          .then(data => {
            if (data.users && data.users.length > 0) {
              setSelectedMember(data.users[0]);
            }
          })
          .catch(() => {
            // Failed to fetch user details for prefilling - silently handle
          });
      }
    }
  }, [prefilledData, aircraft]);

  // Validate type rating when instructor or aircraft changes
  useEffect(() => {
    if (instructor?.id && aircraftId) {
      validateTypeRating(instructor.id, aircraftId);
    } else {
      resetValidation();
    }
  }, [instructor?.id, aircraftId, validateTypeRating, resetValidation]);

  function handleClose() {
    onClose();
    setTimeout(() => {
      setActiveTab("regular");
      setSelectedMember(null);
      setInstructor(null);
      setAircraftId("");
      setFlightType("");
      setLesson("");
      setBookingType("flight");
      setRemarks("");
      setPurpose("");
      setStartDate(null);
      setStartTime("");
      setEndDate(null);
      setEndTime("");
      setError(null);
      setLoading(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setVoucherNumber("");
      setIsRecurring(false);
      setRecurringDays([]);
      setRecurringUntilDate(null);
      setConflictHandling("skip");
      setRecurringProgress(null);
      setCurrentUser(null); // Reset current user state
      resetValidation(); // Reset type rating validation state
    }, 200);
  }

  // Helper to combine date and time into a UTC ISO string
  function getUtcIsoString(date: Date | null, time: string): string | null {
    if (!date || !time) return null;
    const [hours, minutes] = time.split(":").map(Number);
    // Construct a Date in local time, then convert to UTC ISO string
    const local = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0,
      0
    );
    return local.toISOString(); // Always UTC
  }

  // Helper: check if two time ranges overlap
  function isOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
    return startA < endB && endA > startB;
  }

  // Helper: generate recurring dates based on selected days
  function generateRecurringDates(startDate: Date, untilDate: Date, selectedDays: string[]): Date[] {
    const dates: Date[] = [];
    const dayNameToNumber: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    // Convert selected day names to day numbers
    const selectedDayNumbers = selectedDays.map(day => dayNameToNumber[day]);

    // Start from the start date and find all matching days until the until date
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // Reset time to start of day

    while (currentDate <= untilDate) {
      const dayOfWeek = currentDate.getDay();

      // If this day of week is selected and it's on or after the start date
      if (selectedDayNumbers.includes(dayOfWeek) && currentDate >= startDate) {
        dates.push(new Date(currentDate));
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  // Helper: check for conflicts on a specific date and time
  function checkConflictForDateTime(date: Date, startTime: string, endTime: string): boolean {
    const start = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      Number(startTime.split(":")[0]), Number(startTime.split(":")[1])
    );
    const end = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      Number(endTime.split(":")[0]), Number(endTime.split(":")[1])
    );

    // Check against all active bookings
    const activeStatuses = ["unconfirmed", "confirmed", "briefing", "flying"];

    for (const booking of bookings) {
      if (activeStatuses.includes(booking.status) && booking.start_time && booking.end_time) {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);

        // Check for time overlap and resource conflicts
        if (isOverlap(start, end, bookingStart, bookingEnd)) {
          // Check if aircraft conflicts
          if (booking.aircraft_id === aircraftId) {
            return true;
          }

          // Check if instructor conflicts (if we have one selected)
          if (instructor?.id && booking.instructor_id === instructor.id) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // Compute unavailable aircraft/instructors for the selected time
  const unavailable = React.useMemo(() => {
    if (!startDate || !startTime || !endDate || !endTime) return { aircraft: new Set<string>(), instructors: new Set<string>() };
    const start = new Date(
      startDate.getFullYear(), startDate.getMonth(), startDate.getDate(),
      Number(startTime.split(":")[0]), Number(startTime.split(":")[1])
    );
    const end = new Date(
      endDate.getFullYear(), endDate.getMonth(), endDate.getDate(),
      Number(endTime.split(":")[0]), Number(endTime.split(":")[1])
    );
    const aircraftSet = new Set<string>();
    const instructorSet = new Set<string>();
    
    // Check against all active bookings (not cancelled or complete)
    const activeStatuses = ["unconfirmed", "confirmed", "briefing", "flying"];
    
    for (const b of bookings) {
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
  }, [bookings, startDate, startTime, endDate, endTime]);

  // Time slot validation check
  const timeSlotValidation = React.useMemo(() => {
    return validateTimeSlot(startDate, startTime, endTime);
  }, [startDate, startTime, endTime, validateTimeSlot]);

  // Unified submit handler for both Save and Save and Confirm
  async function handleSubmit(e: React.FormEvent, statusOverride?: string) {
    e.preventDefault();
    setError(null);

    // Basic validation - different requirements for trial flights vs regular bookings
    if (activeTab === "trial") {
      if (!customerName || !customerEmail || !aircraftId || !startDate || !startTime || !endDate || !endTime || !purpose) {
        setError("Please fill in all required fields (customer name, email, aircraft, start/end time, description).");
        return;
      }

      // Email validation for trial flights
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
    } else {
      // Regular booking validation
      const requiredFields = [aircraftId, startDate, startTime, endDate, endTime, purpose, bookingType];
      const fieldNames = ["aircraft", "start/end time", "purpose", "booking type"];

      if (requiredFields.some(field => !field)) {
        setError(`Please fill in all required fields (${fieldNames.join(", ")}).`);
        return;
      }

      // Additional validation for non-restricted roles
      if (!isRestrictedRole && !selectedMember) {
        setError("Please select a member for this booking.");
        return;
      }
    }

    // Recurring booking validation
    if (isRecurring) {
      if (recurringDays.length === 0) {
        setError("Please select at least one day for recurring bookings.");
        return;
      }

      if (!recurringUntilDate) {
        setError("Please select an end date for recurring bookings.");
        return;
      }

      if (startDate && recurringUntilDate < startDate) {
        setError("End date must be after the start date for recurring bookings.");
        return;
      }
    }
    
    // Check for resource conflicts before submission
    if (aircraftId && unavailable.aircraft.has(aircraftId)) {
      setError("Selected aircraft is already booked during this time. Please choose a different aircraft or time slot.");
      return;
    }
    
    if (instructor?.id && unavailable.instructors.has(instructor.id)) {
      setError("Selected instructor is already booked during this time. Please choose a different instructor or time slot.");
      return;
    }
    
    // Convert to UTC ISO strings
    const start_time = getUtcIsoString(startDate, startTime);
    const end_time = getUtcIsoString(endDate, endTime);
    if (!start_time || !end_time) {
      setError("Invalid start or end time.");
      return;
    }
    setLoading(true);
    
    try {
      let userId = null;
      
      // For trial flights, create user record first
      if (activeTab === "trial") {
        // Check if user already exists with this email
        const checkUserResponse = await fetch('/api/users?' + new URLSearchParams({
          email: customerEmail
        }));
        
        if (checkUserResponse.ok) {
          const { users } = await checkUserResponse.json();
          if (users && users.length > 0) {
            // User already exists, use their ID
            userId = users[0].id;
          } else {
            // Create new user record for trial flight
            const createUserResponse = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: customerEmail,
                first_name: customerName.split(' ')[0] || '',
                last_name: customerName.split(' ').slice(1).join(' ') || '',
                phone: customerPhone || null,
                create_auth_user: false, // Don't create auth account for trial flights
                // Note: This creates a public.users record without an auth.users record
                // The user can be invited later via an "Invite to Join" feature
              })
            });
            
            if (!createUserResponse.ok) {
              const errorData = await createUserResponse.json();
              throw new Error(errorData.error || 'Failed to create user record');
            }
            
            const { user: newUser } = await createUserResponse.json();
            userId = newUser.id;
          }
        } else {
          throw new Error('Failed to check existing users');
        }
      } else {
        // Regular booking - use selected member for non-restricted roles, current user for restricted roles
        if (isRestrictedRole) {
          userId = currentUser?.id || null;
        } else {
          userId = selectedMember?.id || null;
        }
      }
      
      if (isRecurring && startDate && recurringUntilDate) {
        // Recurring booking logic
        const recurringDates = generateRecurringDates(startDate, recurringUntilDate, recurringDays);

        if (recurringDates.length === 0) {
          setError("No valid dates found for the selected recurring pattern.");
          return;
        }

        // Initialize progress tracking
        setRecurringProgress({
          current: 0,
          total: recurringDates.length,
          created: 0,
          conflicts: 0,
          errors: 0
        });

        let createdCount = 0;
        let conflictCount = 0;
        let errorCount = 0;
        let shouldStop = false;

        for (let i = 0; i < recurringDates.length && !shouldStop; i++) {
          const bookingDate = recurringDates[i];

          // Update progress
          setRecurringProgress(prev => prev ? {
            ...prev,
            current: i + 1
          } : null);

          // Calculate start and end times for this date
          const bookingStartTime = getUtcIsoString(bookingDate, startTime);
          const bookingEndTime = getUtcIsoString(bookingDate, endTime);

          if (!bookingStartTime || !bookingEndTime) {
            errorCount++;
            continue;
          }

          // Check for conflicts for this specific date
          const hasConflict = checkConflictForDateTime(bookingDate, startTime, endTime);

          if (hasConflict) {
            conflictCount++;

            if (conflictHandling === "stop") {
              shouldStop = true;
              break;
            } else if (conflictHandling === "skip") {
              continue;
            }
            // For "ask" mode, we could implement a modal here, but for now treat as skip
          }

          try {
            const payload = {
              user_id: userId,
              aircraft_id: aircraftId,
              start_time: bookingStartTime,
              end_time: bookingEndTime,
              purpose,
              booking_type: activeTab === "trial" ? "flight" : bookingType,
              instructor_id: instructor?.id || null,
              remarks: remarks || null,
              lesson_id: activeTab === "trial" ? null : (isRestrictedRole ? null : (lesson || null)),
              flight_type_id: isRestrictedRole ? null : (flightType || null),
              voucher_number: activeTab === "trial" ? (voucherNumber || null) : null,
              status: statusOverride || "unconfirmed",
            };

            const res = await fetch("/api/bookings?skip_email=true", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              const data = await res.json();
              createdCount++;

              // Call the optimistic update callback for each booking
              if (onBookingCreated && data.booking) {
                onBookingCreated(data.booking);
              }
            } else {
              errorCount++;
            }
          } catch {
            errorCount++;
          }

          // Small delay to avoid overwhelming the server (reduced since emails are skipped)
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Final progress update
        setRecurringProgress({
          current: recurringDates.length,
          total: recurringDates.length,
          created: createdCount,
          conflicts: conflictCount,
          errors: errorCount
        });

        // Send a single summary email for the recurring booking series
        if (createdCount > 0) {
          try {
            // Send summary email notification about the bulk booking creation
            const summaryPayload = {
              user_id: userId,
              booking_count: createdCount,
              start_date: startDate.toISOString().split('T')[0],
              until_date: recurringUntilDate.toISOString().split('T')[0],
              days: recurringDays,
              time_slot: `${startTime} - ${endTime}`,
              aircraft_id: aircraftId,
              instructor_id: instructor?.id || null,
              purpose: purpose,
            };

            // Call a separate API endpoint for bulk booking notifications
            fetch("/api/bookings/bulk-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(summaryPayload),
            }).catch(() => {
              // Silently handle email failure - don't block the UI
            });
          } catch {
            // Silently handle any errors with email sending
          }

          setTimeout(() => {
            if (refresh) refresh();
            handleClose();
          }, 2000);
        } else {
          setError("No bookings were created. Please check for conflicts and try again.");
        }
      } else {
        // Single booking logic
        const payload = {
          user_id: userId,
          aircraft_id: aircraftId,
          start_time,
          end_time,
          purpose,
          booking_type: activeTab === "trial" ? "flight" : bookingType,
          instructor_id: instructor?.id || null,
          remarks: remarks || null,
          lesson_id: activeTab === "trial" ? null : (isRestrictedRole ? null : (lesson || null)),
          flight_type_id: isRestrictedRole ? null : (flightType || null),
          voucher_number: activeTab === "trial" ? (voucherNumber || null) : null,
          status: statusOverride || "unconfirmed",
        };
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create booking");
        } else {
          // Call the optimistic update callback if provided
          if (onBookingCreated && data.booking) {
            onBookingCreated(data.booking);
          }
          if (refresh) refresh();
          handleClose();
        }
      }
    } catch {
      setError("Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[760px] !w-[760px] mx-auto p-0 bg-white rounded-3xl shadow-2xl border border-muted max-h-[90vh] flex flex-col">
        <div className="p-8 pb-0 flex-shrink-0">
          <DialogHeader className="mb-1">
            <DialogTitle className="text-3xl font-bold mb-1 tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-indigo-600" /> New Booking
            </DialogTitle>
            <DialogDescription className="mb-3 text-base text-muted-foreground font-normal">
              Enter details for the new booking. Required fields are marked with <span className="text-red-500">*</span>.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          {!isRestrictedRole && (
            <div className="px-8 pb-6 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="regular" className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Regular Booking
                </TabsTrigger>
                <TabsTrigger value="trial" className="flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Trial Flight
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
            <div className="overflow-y-auto flex-1 px-8">
              {/* Scheduled Times - Common to both tabs */}
              <div className="border rounded-xl p-6 bg-muted/70 mb-6">
                  <div className="font-semibold text-lg mb-5 flex items-center gap-2 pb-3 border-b border-muted-foreground/10">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" /> SCHEDULED TIMES
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2">START TIME <span className="text-red-500">*</span></label>
                      <div className="flex gap-2 items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={
                                "w-44 justify-start text-left font-normal overflow-hidden text-ellipsis whitespace-nowrap " +
                                (!startDate ? "text-muted-foreground" : "")
                              }
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "dd MMM yyyy") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={startDate ?? undefined}
                              onSelect={date => setStartDate(date ?? null)}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Select value={startTime} onValueChange={setStartTime}>
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2">END TIME <span className="text-red-500">*</span></label>
                      <div className="flex gap-2 items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={
                                "w-44 justify-start text-left font-normal overflow-hidden text-ellipsis whitespace-nowrap " +
                                (!endDate ? "text-muted-foreground" : "")
                              }
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "dd MMM yyyy") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDate ?? undefined}
                              onSelect={date => setEndDate(date ?? null)}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today || (startDate ? date < startDate : false);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Select value={endTime} onValueChange={setEndTime}>
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Time Slot Validation Warning */}
                  {!timeSlotValidation.isValid && (
                    <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2 flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                      <span>{timeSlotValidation.message}</span>
                    </div>
                  )}

                  {/* Recurring Booking Toggle - Only show for regular bookings, not trial flights */}
                  {activeTab === "regular" && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-muted-foreground" />
                        <label className="text-sm font-medium">Recurring Booking</label>
                      </div>
                      <Switch
                        checked={isRecurring}
                        onCheckedChange={setIsRecurring}
                        aria-label="Enable recurring booking"
                      />
                    </div>

                    {/* Recurring Options - Show when toggle is enabled */}
                    {isRecurring && (
                      <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
                        <div>
                          <label className="block text-xs font-semibold mb-2">Repeat on days</label>
                          <div className="grid grid-cols-7 gap-2">
                            {[
                              { key: "monday", label: "Mon" },
                              { key: "tuesday", label: "Tue" },
                              { key: "wednesday", label: "Wed" },
                              { key: "thursday", label: "Thu" },
                              { key: "friday", label: "Fri" },
                              { key: "saturday", label: "Sat" },
                              { key: "sunday", label: "Sun" },
                            ].map((day) => (
                              <div key={day.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={day.key}
                                  checked={recurringDays.includes(day.key)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setRecurringDays([...recurringDays, day.key]);
                                    } else {
                                      setRecurringDays(recurringDays.filter(d => d !== day.key));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={day.key}
                                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {day.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold mb-2">Until date</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={
                                    "w-full justify-start text-left font-normal " +
                                    (!recurringUntilDate ? "text-muted-foreground" : "")
                                  }
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {recurringUntilDate ? format(recurringUntilDate, "dd MMM yyyy") : <span>Pick end date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={recurringUntilDate ?? undefined}
                                  onSelect={date => setRecurringUntilDate(date ?? null)}
                                  disabled={(date) => date < new Date() || (startDate ? date < startDate : false)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-2">If conflict occurs</label>
                            <Select value={conflictHandling} onValueChange={setConflictHandling as (value: string) => void}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select conflict handling" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="skip">Skip conflicted bookings</SelectItem>
                                <SelectItem value="stop">Stop at first conflict</SelectItem>
                                <SelectItem value="ask">Ask me for each conflict</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Progress indicator during bulk creation */}
                        {recurringProgress && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center gap-2 mb-2">
                              <Repeat className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">
                                Creating recurring bookings... {recurringProgress.created} of {recurringProgress.total}
                              </span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(recurringProgress.created / recurringProgress.total) * 100}%` }}
                              ></div>
                            </div>
                            {(recurringProgress.conflicts > 0 || recurringProgress.errors > 0) && (
                              <div className="mt-2 text-xs text-red-600">
                                {recurringProgress.conflicts + recurringProgress.errors} bookings failed due to conflicts or errors
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>
                
                {/* Tab-specific content */}
                <TabsContent value="regular" className="mt-0">
                  {/* Member and Instructor on same line */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 mb-8">
                    <div className="max-w-[340px] w-full mr-2">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Member{isRestrictedRole ? ' (You)' : ''} {!isRestrictedRole && <span className="text-red-500">*</span>}</label>
                      <MemberSelect
                        value={selectedMember}
                        onSelect={isRestrictedRole ? () => {} : setSelectedMember}
                        disabled={isRestrictedRole}
                      />
                    </div>
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Instructor</label>
                      <InstructorSelect
                        value={instructor}
                        unavailableInstructorIds={unavailable.instructors}
                        onSelect={(selectedInstructor) => {
                          // Prevent selection of conflicted instructors
                          if (selectedInstructor && unavailable.instructors.has(selectedInstructor.id)) {
                            setError("This instructor is already booked during this time. Please choose a different instructor or time slot.");
                            return;
                          }
                          setInstructor(selectedInstructor);
                          // Clear any previous conflict errors when selecting a valid instructor
                          if (error && error.includes("instructor is already booked")) {
                            setError(null);
                          }
                        }}
                      />
                      {instructor && unavailable.instructors.has(instructor.id) && (
                        <div className="text-xs text-red-600 mt-1 font-medium bg-red-50 p-2 rounded border">
                          ⚠️ This instructor is already booked during this time. Please choose a different instructor or time slot.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Aircraft and Flight Type/Booking Type row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-4">
                    <div className="max-w-[340px] w-full">
                      <div className="flex items-center mb-2">
                        <label className="block text-xs font-semibold flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0} className="cursor-pointer text-muted-foreground hover:text-indigo-600 focus:outline-none">
                                  <Plane className="w-4 h-4" aria-label="Aircraft indicators info" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-80">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <span className="text-sm">Green checkmark: Aircraft types matching this member&apos;s syllabus enrollments</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <span className="text-sm">Amber star: Aircraft prioritised for scheduling</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          Aircraft <span className="text-red-500">*</span>
                        </label>
                      </div>
                      <Select value={aircraftId} onValueChange={(selectedAircraftId) => {
                        // Clear any previous aircraft conflict errors when selecting a different aircraft
                        if (error && error.includes("aircraft is already booked")) {
                          setError(null);
                        }
                        setAircraftId(selectedAircraftId);
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select aircraft" />
                        </SelectTrigger>
                        <SelectContent>
                          {aircraft.map(a => {
                            const isBooked = unavailable.aircraft.has(a.id);
                            const isPreferred = preferredAircraftTypeIds.includes(a.aircraft_type_id || '');
                            const isPriority = a.prioritise_scheduling === true;
                            return (
                              <SelectItem key={a.id} value={a.id} disabled={isBooked}>
                                <div className="flex items-center gap-2">
                                  {isPreferred && (
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  )}
                                  {isPriority && (
                                    <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                  )}
                                  <span>
                                    {a.registration} ({a.type}){isBooked ? " (booked)" : ""}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    {isRestrictedRole ? (
                      <div className="max-w-[340px] w-full">
                        <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><ClipboardList className="w-4 h-4" /> Booking Type <span className="text-red-500">*</span></label>
                        <Select value={bookingType} onValueChange={setBookingType}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select booking type" />
                          </SelectTrigger>
                          <SelectContent>
                            {["flight", "groundwork", "maintenance", "other"].map((type) => (
                              <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="max-w-[340px] w-full">
                        <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> Flight Type</label>
                        <Select value={flightType} onValueChange={setFlightType} disabled={dropdownLoading}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={dropdownLoading ? "Loading..." : "Select flight type"} />
                          </SelectTrigger>
                          <SelectContent>
                            {flightTypes.map(ft => (
                              <SelectItem key={ft.id} value={ft.id}>
                                {ft.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Type Rating Warning - only show if there's an issue */}
                  {(instructor?.id && aircraftId && (isValidating || validationError || (validation && !validation.valid))) && (
                    <div className="mb-4">
                      <TypeRatingWarning
                        validation={validation}
                        isValidating={isValidating}
                        error={validationError}
                      />
                    </div>
                  )}

                  {/* Lesson - only for non-restricted roles */}
                  {!isRestrictedRole && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-4">
                      <div className="max-w-[340px] w-full">
                        <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><BookOpen className="w-4 h-4" /> Lesson</label>
                        <Select value={lesson} onValueChange={setLesson} disabled={dropdownLoading}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={dropdownLoading ? "Loading..." : "Select lesson"} />
                          </SelectTrigger>
                          <SelectContent>
                            {lessons.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="max-w-[340px] w-full">
                        <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><ClipboardList className="w-4 h-4" /> Booking Type <span className="text-red-500">*</span></label>
                        <Select value={bookingType} onValueChange={setBookingType}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select booking type" />
                          </SelectTrigger>
                          <SelectContent>
                            {["flight", "groundwork", "maintenance", "other"].map((type) => (
                              <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  
                  {/* Description & Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                    <div className="max-w-[340px] w-full">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold flex items-center gap-1"><AlignLeft className="w-4 h-4" /> Description <span className="text-red-500">*</span></label>
                        <span className="text-xs text-muted-foreground">{purpose.length}/500</span>
                      </div>
                      <Textarea
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                        placeholder="Enter booking description..."
                        maxLength={500}
                        className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top mb-2.5"
                        rows={4}
                      />
                    </div>
                    <div className="max-w-[340px] w-full">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold flex items-center gap-1">
                          <StickyNote className="w-4 h-4" /> Booking Remarks
                        </label>
                        <span className="text-xs text-muted-foreground">{remarks.length}/500</span>
                      </div>
                      <Textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder={isRestrictedRole ? "e.g., 'Need less than 80L fuel for weight and balance' or special requirements" : "Enter booking remarks"}
                        maxLength={500}
                        className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top mb-2.5"
                        rows={4}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="trial" className="mt-0">
                  {/* Trial Flight - Customer Details */}
                  <div className="border-t pt-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 mb-8">
                    <div className="max-w-[340px] w-full mr-2">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Users className="w-4 h-4" /> Customer Name <span className="text-red-500">*</span></label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className="w-full"
                      />
                    </div>
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Mail className="w-4 h-4" /> Customer Email <span className="text-red-500">*</span></label>
                      <Input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Enter customer email"
                        className="w-full"
                      />
                    </div>
                    <div className="max-w-[340px] w-full mr-2">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Phone className="w-4 h-4" /> Customer Phone</label>
                      <Input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter customer phone"
                        className="w-full"
                      />
                    </div>
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Ticket className="w-4 h-4" /> Voucher Number</label>
                      <Input
                        value={voucherNumber}
                        onChange={(e) => setVoucherNumber(e.target.value)}
                        placeholder="Enter voucher number (optional)"
                        className="w-full"
                      />
                    </div>
                  </div>
                  </div>

                  {/* Instructor and Aircraft on same line */}
                  <div className="border-t pt-6 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-4">
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Instructor</label>
                      <InstructorSelect
                        value={instructor}
                        unavailableInstructorIds={unavailable.instructors}
                        onSelect={(selectedInstructor) => {
                          // Prevent selection of conflicted instructors
                          if (selectedInstructor && unavailable.instructors.has(selectedInstructor.id)) {
                            setError("This instructor is already booked during this time. Please choose a different instructor or time slot.");
                            return;
                          }
                          setInstructor(selectedInstructor);
                          // Clear any previous conflict errors when selecting a valid instructor
                          if (error && error.includes("instructor is already booked")) {
                            setError(null);
                          }
                        }}
                      />
                      {instructor && unavailable.instructors.has(instructor.id) && (
                        <div className="text-xs text-red-600 mt-1 font-medium bg-red-50 p-2 rounded border">
                          ⚠️ This instructor is already booked during this time. Please choose a different instructor or time slot.
                        </div>
                      )}
                    </div>
                    <div className="max-w-[340px] w-full">
                      <div className="flex items-center mb-2">
                        <label className="block text-xs font-semibold flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0} className="cursor-pointer text-muted-foreground hover:text-indigo-600 focus:outline-none">
                                  <Plane className="w-4 h-4" aria-label="Aircraft indicators info" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-80">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <span className="text-sm">Green checkmark: Aircraft types matching this member&apos;s syllabus enrollments</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <span className="text-sm">Amber star: Aircraft prioritised for scheduling</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          Aircraft <span className="text-red-500">*</span>
                        </label>
                      </div>
                      <Select value={aircraftId} onValueChange={(selectedAircraftId) => {
                        // Clear any previous aircraft conflict errors when selecting a different aircraft
                        if (error && error.includes("aircraft is already booked")) {
                          setError(null);
                        }
                        setAircraftId(selectedAircraftId);
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select aircraft" />
                        </SelectTrigger>
                        <SelectContent>
                          {aircraft.map(a => {
                            const isBooked = unavailable.aircraft.has(a.id);
                            const isPreferred = preferredAircraftTypeIds.includes(a.aircraft_type_id || '');
                            const isPriority = a.prioritise_scheduling === true;
                            return (
                              <SelectItem key={a.id} value={a.id} disabled={isBooked}>
                                <div className="flex items-center gap-2">
                                  {isPreferred && (
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  )}
                                  {isPriority && (
                                    <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                  )}
                                  <span>
                                    {a.registration} ({a.type}){isBooked ? " (booked)" : ""}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    </div>
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> Flight Type</label>
                      <Select value={flightType} onValueChange={setFlightType} disabled={dropdownLoading}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={dropdownLoading ? "Loading..." : "Select flight type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {flightTypes.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Type Rating Warning - only show if there's an issue */}
                  {(instructor?.id && aircraftId && (isValidating || validationError || (validation && !validation.valid))) && (
                    <div className="mb-4">
                      <TypeRatingWarning
                        validation={validation}
                        isValidating={isValidating}
                        error={validationError}
                      />
                    </div>
                  )}
                  
                  {/* Trial Flight Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                    <div className="max-w-[340px] w-full">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold flex items-center gap-1"><AlignLeft className="w-4 h-4" /> Description <span className="text-red-500">*</span></label>
                        <span className="text-xs text-muted-foreground">{purpose.length}/500</span>
                      </div>
                      <Textarea
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                        placeholder="Enter trial flight description..."
                        maxLength={500}
                        className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top mb-2.5"
                        rows={4}
                      />
                    </div>
                    <div className="max-w-[340px] w-full">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold flex items-center gap-1">
                          <StickyNote className="w-4 h-4" /> Booking Remarks
                        </label>
                        <span className="text-xs text-muted-foreground">{remarks.length}/500</span>
                      </div>
                      <Textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="Enter internal remarks"
                        maxLength={500}
                        className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top mb-2.5"
                        rows={4}
                      />
                    </div>
                  </div>
                </TabsContent>
            </div>

            <div className="flex-shrink-0 p-8 pt-0">
              <DialogFooter className="border-t pt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                <DialogClose asChild>
                  <Button variant="outline" type="button" className="w-full sm:w-auto border-2 border-muted hover:border-indigo-400 transition-colors cursor-pointer">Cancel</Button>
                </DialogClose>
                {/* Save and Confirm button - only visible to privileged users */}
                {!isRestrictedUser && (
                  <Button
                    type="button"
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer"
                    disabled={loading}
                    onClick={e => handleSubmit(e, 'confirmed')}
                  >
                    Save and Confirm
                  </Button>
                )}
                <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer" disabled={loading}
                  onClick={e => handleSubmit(e)}
                >
                  {isRestrictedRole ? 'Save Booking' : 'Save'}
                </Button>
              </DialogFooter>
              {error && <div className="text-red-600 text-sm mb-2 text-center w-full bg-red-50 border border-red-200 rounded-md p-2 mt-3">{error}</div>}
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}; 