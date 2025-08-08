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
import {
  CalendarIcon,
  UserIcon,
  Plane,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  StickyNote,
  AlignLeft,
  Info,
  Users,
  Phone,
  Mail,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";
import InstructorSelect, { InstructorResult } from "@/components/invoices/InstructorSelect";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  // When start date changes, auto-set end date if blank or different
  useEffect(() => {
    if (startDate && (!endDate || endDate.getTime() !== startDate.getTime())) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  // When start time changes, auto-set end time only if end time is blank
  useEffect(() => {
    if (startTime && !endTime) {
      setEndTime(startTime);
    }
  }, [startTime, endTime]);

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
            const instructorData = (data.instructors || []).find((inst: { id: string; users?: { first_name?: string; last_name?: string; email?: string }; user_id: string }) => inst.id === prefilledData.instructorId);
            if (instructorData && instructorData.users) {
              const instructorResult = {
                id: instructorData.id,
                user_id: instructorData.user_id,
                first_name: instructorData.users.first_name || "",
                last_name: instructorData.users.last_name || "",
                email: instructorData.users.email || "",
              };
              setInstructor(instructorResult);
            }
          })
          .catch(err => {
            console.error("Failed to fetch instructor details for prefilling:", err);
          });
      }
    }
  }, [prefilledData, aircraft]);

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

  // Compute unavailable aircraft/instructors for the selected time
  const unavailable = React.useMemo(() => {
    if (!startDate || !startTime || !endDate || !endTime) return { aircraft: new Set(), instructors: new Set() };
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
    for (const b of bookings) {
      if ((b.status === "confirmed" || b.status === "flying") && b.start_time && b.end_time) {
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
      if (!selectedMember || !aircraftId || !startDate || !startTime || !endDate || !endTime || !purpose || !bookingType) {
        setError("Please fill in all required fields (member, aircraft, start/end time, purpose, booking type).");
        return;
      }
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
        // Regular booking - use selected member
        userId = selectedMember!.id;
      }
      
      // Build booking payload
      const payload = {
        user_id: userId,
        aircraft_id: aircraftId,
        start_time,
        end_time,
        purpose,
        booking_type: activeTab === "trial" ? "flight" : bookingType,
        instructor_id: instructor?.id || null,
        remarks: remarks || null,
        lesson_id: activeTab === "trial" ? null : (lesson || null),
        flight_type_id: flightType || null,
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
    } catch {
      setError("Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[760px] !w-[760px] mx-auto p-0 bg-white rounded-3xl shadow-2xl border border-muted overflow-y-auto max-h-[90vh]">
        <div className="p-8 flex flex-col" style={{ minHeight: 0 }}>
          <DialogHeader className="mb-1">
            <DialogTitle className="text-3xl font-bold mb-1 tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-indigo-600" /> New Booking
            </DialogTitle>
            <DialogDescription className="mb-3 text-base text-muted-foreground font-normal">
              Enter details for the new booking. Required fields are marked with <span className="text-red-500">*</span>.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="regular" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Regular Booking
              </TabsTrigger>
              <TabsTrigger value="trial" className="flex items-center gap-2">
                <Plane className="w-4 h-4" />
                Trial Flight
              </TabsTrigger>
            </TabsList>
            
            <form className="flex flex-col" onSubmit={handleSubmit}>
              <div className="overflow-y-auto max-h-[calc(90vh-160px)]">
                {/* Scheduled Times - Common to both tabs */}
                <div className="border rounded-xl p-6 bg-muted/70 mb-4">
                  <div className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" /> SCHEDULED TIMES
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
                </div>
                
                {/* Tab-specific content */}
                <TabsContent value="regular" className="mt-0">
                  {/* Member and Flight Type on same line */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 mb-8">
                    <div className="max-w-[340px] w-full mr-2">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Member <span className="text-red-500">*</span></label>
                      <MemberSelect
                        value={selectedMember}
                        onSelect={setSelectedMember}
                      />
                    </div>
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
                  </div>
                  
                  {/* Instructor and Aircraft on same line */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-4">
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Instructor</label>
                      <InstructorSelect
                        value={instructor}
                        onSelect={setInstructor}
                      />
                      {instructor && unavailable.instructors.has(instructor.id) && (
                        <div className="text-xs text-orange-600 mt-1 font-medium">
                          ⚠️ This instructor is already booked during this time
                        </div>
                      )}
                    </div>
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Plane className="w-4 h-4" /> Aircraft</label>
                      <Select value={aircraftId} onValueChange={setAircraftId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select aircraft" />
                        </SelectTrigger>
                        <SelectContent>
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
                    </div>
                  </div>

                  {/* Lesson and Booking Type */}
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
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><ClipboardList className="w-4 h-4" /> Booking Type</label>
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
                  
                  {/* Remarks & Purpose */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                    <div className="max-w-[340px] w-full">
                      <div className="flex items-center mb-2">
                        <label className="block text-xs font-semibold flex items-center gap-1">
                          <StickyNote className="w-4 h-4" /> Booking Remarks
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="ml-1 cursor-pointer text-muted-foreground hover:text-indigo-600 focus:outline-none">
                                <Info className="w-4 h-4" aria-label="Booking remarks info" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              These comments will not be seen by the student.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="Enter booking remarks"
                        className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top mb-2.5"
                        rows={4}
                      />
                    </div>
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><AlignLeft className="w-4 h-4" /> Description</label>
                      <Textarea
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                        placeholder="Description"
                        className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top mb-2.5"
                        rows={4}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="trial" className="mt-0">
                  {/* Trial Flight - Customer Details */}
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
                  </div>
                  
                  {/* Instructor and Aircraft on same line */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-4">
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Instructor</label>
                      <InstructorSelect
                        value={instructor}
                        onSelect={setInstructor}
                      />
                      {instructor && unavailable.instructors.has(instructor.id) && (
                        <div className="text-xs text-orange-600 mt-1 font-medium">
                          ⚠️ This instructor is already booked during this time
                        </div>
                      )}
                    </div>
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><Plane className="w-4 h-4" /> Aircraft</label>
                      <Select value={aircraftId} onValueChange={setAircraftId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select aircraft" />
                        </SelectTrigger>
                        <SelectContent>
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
                  
                  {/* Trial Flight Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                    <div className="max-w-[340px] w-full">
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><AlignLeft className="w-4 h-4" /> Description <span className="text-red-500">*</span></label>
                      <Textarea
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                        placeholder="Enter trial flight description"
                        className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top mb-2.5"
                        rows={4}
                      />
                    </div>
                    <div className="max-w-[340px] w-full">
                      <div className="flex items-center mb-2">
                        <label className="block text-xs font-semibold flex items-center gap-1">
                          <StickyNote className="w-4 h-4" /> Booking Remarks
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="ml-1 cursor-pointer text-muted-foreground hover:text-indigo-600 focus:outline-none">
                                <Info className="w-4 h-4" aria-label="Booking remarks info" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Internal notes about this trial flight booking.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="Enter internal remarks"
                        className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top mb-2.5"
                        rows={4}
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
              <DialogFooter className="sticky bottom-0 left-0 right-0 bg-white z-10 border-t pt-6 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                <DialogClose asChild>
                  <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400 cursor-pointer">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md cursor-pointer" disabled={loading}
                  onClick={e => handleSubmit(e)}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md cursor-pointer"
                  disabled={loading}
                  onClick={e => handleSubmit(e as React.FormEvent, "confirmed")}
                >
                  Save and Confirm
                </Button>
              </DialogFooter>
              {error && <div className="text-red-600 text-sm mb-2 text-center w-full">{error}</div>}
            </form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 