"use client";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarIcon, UserIcon, CheckIcon, Loader2, Plane, BadgeCheck, BookOpen, ClipboardList, StickyNote, AlignLeft } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { format, parseISO } from "date-fns";
import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Booking } from "@/types/bookings";
import MemberSelect, { UserResult } from "@/components/invoices/MemberSelect";
import InstructorSelect, { InstructorResult } from "@/components/invoices/InstructorSelect";

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
  flightTypes: { id: string; name: string }[];
}

// Helper to generate 30-min interval times
const TIME_OPTIONS = Array.from({ length: ((23 - 7) * 2) + 3 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

// Helper to combine date and time strings into a UTC ISO string
function getUtcIsoString(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // JS Date months are 0-based
  const local = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return local.toISOString();
}

export default function BookingDetails({ booking, members, instructors, aircraft, lessons, flightTypes }: BookingDetailsProps) {
  const { control, handleSubmit, reset, formState, watch } = useForm<BookingDetailsFormData>({
    defaultValues: {
      start_date: booking?.start_time ? format(parseISO(booking.start_time), "yyyy-MM-dd") : "",
      start_time: booking?.start_time ? format(parseISO(booking.start_time), "HH:mm") : "",
      end_date: booking?.end_time ? format(parseISO(booking.end_time), "yyyy-MM-dd") : "",
      end_time: booking?.end_time ? format(parseISO(booking.end_time), "HH:mm") : "",
      member: booking?.user_id || "",
      instructor: booking?.instructor_id || "",
      aircraft: booking?.aircraft_id || "",
      lesson: booking?.lesson_id ?? "",
      remarks: booking?.remarks || "",
      purpose: booking?.purpose || "",
      flight_type: booking?.flight_type_id ?? "",
      booking_type: booking?.booking_type || "flight",
    },
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [memberValue, setMemberValue] = useState<UserResult | null>(null);
  const [instructorValue, setInstructorValue] = useState<InstructorResult | null>(null);
  
  // Watch the member and instructor field values
  const memberFieldValue = watch("member");
  const instructorFieldValue = watch("instructor");

  // Effect to fetch member data when memberFieldValue changes
  React.useEffect(() => {
    if (!memberFieldValue) {
      setMemberValue(null);
      return;
    }

    // Find the selected member's details for display
    const selectedMember = members.find(m => m.id === memberFieldValue);
    
    if (selectedMember) {
      // Use the member from the list
      setMemberValue({
        id: selectedMember.id,
        first_name: selectedMember.name.split(" ")[0] || "",
        last_name: selectedMember.name.split(" ").slice(1).join(" ") || "",
        email: "",
      });
    } else {
      // Fetch the user data for the selected user_id
      fetch(`/api/users?id=${memberFieldValue}`)
        .then(res => res.json())
        .then(data => {
          if (data.users && data.users.length > 0) {
            const user = data.users[0];
            setMemberValue({
              id: user.id,
              first_name: user.first_name || "",
              last_name: user.last_name || "",
              email: user.email || "",
              role: user.role || "",
            });
          }
        })
        .catch(() => {
          // If fetch fails, create a basic user object
          setMemberValue({
            id: memberFieldValue,
            first_name: "Unknown",
            last_name: "User",
            email: "",
          });
        });
    }
  }, [memberFieldValue, members]);

  // Effect to fetch instructor data when instructorFieldValue changes
  React.useEffect(() => {
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
  }, [instructorFieldValue, instructors]);

  // Initialize instructor value when component mounts (similar to CheckOutForm)
  React.useEffect(() => {
    const instructorId = booking?.instructor_id || null;
    
    if (instructorId) {
      // Find the selected instructor's details for display
      const selectedInstructor = instructors.find(i => i.id === instructorId);
      
      if (selectedInstructor) {
        // Use the instructor from the list and fetch full details
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
        // Fetch the instructor data directly by ID
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
  }, [booking?.instructor_id, instructors]);

  const onSubmit = async (data: BookingDetailsFormData) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Compose ISO strings for start_time and end_time (robust local-to-UTC conversion)
      const start_time = getUtcIsoString(data.start_date, data.start_time);
      const end_time = getUtcIsoString(data.end_date, data.end_time);
      const payload = {
        id: booking.id,
        start_time,
        end_time,
        purpose: data.purpose,
        remarks: data.remarks,
        instructor_id: data.instructor,
        user_id: data.member,
        aircraft_id: data.aircraft,
        lesson_id: data.lesson,
        flight_type_id: data.flight_type,
        booking_type: data.booking_type,
      };
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save booking");
      } else {
        toast.success("Booking updated successfully");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 1500);
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full h-full">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
            <span className="inline-block"><CalendarIcon className="w-6 h-6 text-primary" /></span>
            Booking Details
          </CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => reset()} disabled={!formState.isDirty}>Undo Changes</Button>
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
                render={({ field }) => (
                  <MemberSelect
                    value={memberValue}
                    onSelect={user => {
                      field.onChange(user ? user.id : "");
                    }}
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><UserIcon className="w-4 h-4" /> Select Instructor</label>
              <Controller
                name="instructor"
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
              <Controller name="aircraft" control={control} render={({ field }) => (
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
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1"><ClipboardList className="w-4 h-4" /> Booking Type</label>
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
                  placeholder="Enter booking remarks"
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
                  placeholder="Description"
                  className="resize-none h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none align-top"
                  rows={4}
                />
              )} />
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  );
} 