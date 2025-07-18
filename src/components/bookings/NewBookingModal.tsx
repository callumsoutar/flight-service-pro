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
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";
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
  instructors: Option[];
  aircraft: AircraftOption[];
  bookings: import("@/types/bookings").Booking[];
  refresh?: () => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  open,
  onClose,
  instructors,
  aircraft,
  bookings,
  refresh,
}) => {
  // Form state
  const [selectedMember, setSelectedMember] = useState<UserResult | null>(null);
  const [instructor, setInstructor] = useState("");
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

  // When start time changes, auto-set end time if blank or different
  useEffect(() => {
    if (startTime && (!endTime || endTime !== startTime)) {
      setEndTime(startTime);
    }
  }, [startTime, endTime]);

  function handleClose() {
    onClose();
    setTimeout(() => {
      setSelectedMember(null);
      setInstructor("");
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
    // Basic validation
    if (!selectedMember || !aircraftId || !startDate || !startTime || !endDate || !endTime || !purpose || !bookingType) {
      setError("Please fill in all required fields (member, aircraft, start/end time, purpose, booking type)." );
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
    const payload = {
      user_id: selectedMember.id,
      aircraft_id: aircraftId,
      start_time,
      end_time,
      purpose,
      booking_type: bookingType,
      instructor_id: instructor || null,
      remarks: remarks || null,
      lesson_id: lesson || null,
      flight_type_id: flightType || null,
      status: statusOverride || "unconfirmed",
    };
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create booking");
      } else {
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
          <form className="flex flex-col" onSubmit={handleSubmit}>
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Scheduled Times */}
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
              {/* Member/Instructor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 mb-8">
                <div className="max-w-[340px] w-full mr-2">
                  <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Member <span className="text-red-500">*</span></label>
                  <MemberSelect
                    value={selectedMember}
                    onSelect={setSelectedMember}
                  />
                </div>
                <div className="max-w-[340px] w-full">
                  <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Instructor</label>
                  <Select value={instructor} onValueChange={setInstructor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map(i => {
                        const isBooked = unavailable.instructors.has(i.id);
                        return (
                          <SelectItem key={i.id} value={i.id} disabled={isBooked}>
                            {i.name}{isBooked ? " (booked)" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Aircraft, Flight Type, Lesson, Booking Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 mb-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}; 