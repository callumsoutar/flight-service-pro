"use client";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import * as Tabs from "@radix-ui/react-tabs";
import { User, Mail, Award, Activity, FileText, Upload, Clock, CalendarCheck2, ActivitySquare, Stethoscope, Settings, Briefcase, Calendar as CalendarIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import RatingsTab from "@/components/aircraft/RatingsTab";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Controller } from "react-hook-form";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
const InstructorFlightTypeRatesTable = dynamic(() => import("@/components/InstructorFlightTypeRatesTable"), { ssr: false });

const tabItems = [
  { id: "license", label: "Details", icon: Award },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "history", label: "History", icon: Clock },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings }, // <-- Added settings tab
];

const licenseSchema = z.object({
  instructor_check_due_date: z.string().min(1, "Required"),
  instrument_check_due_date: z.string().min(1, "Required"),
  class_1_medical_due_date: z.string().min(1, "Required"),
  employment_type: z.enum(["full_time", "part_time", "casual", "contractor"]),
  is_actively_instructing: z.boolean(),
  endorsements: z.array(z.string()),
  notes: z.string().optional(),
});

interface InstructorWithUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  instructor_check_due_date?: string;
  instrument_check_due_date?: string;
  class_1_medical_due_date?: string;
  employment_type?: "full_time" | "part_time" | "casual" | "contractor";
  is_actively_instructing: boolean;
  endorsements?: { name: string }[];
  notes?: string;
}

type LicenseFormValues = z.infer<typeof licenseSchema>;

export default function InstructorDetailsClient({ instructor }: { instructor: InstructorWithUser }) {
  const [selectedTab, setSelectedTab] = useState("license");
  const [status, setStatus] = useState<string>(instructor.status);

  const employmentTypes = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "casual", label: "Casual" },
    { value: "contractor", label: "Contractor" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "deactivated", label: "Deactivated" },
    { value: "suspended", label: "Suspended" },
  ];

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
    watch,
    setValue,
    control,
  } = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      instructor_check_due_date: instructor.instructor_check_due_date || "",
      instrument_check_due_date: instructor.instrument_check_due_date || "",
      class_1_medical_due_date: instructor.class_1_medical_due_date,
      employment_type: instructor.employment_type || "full_time",
      is_actively_instructing: instructor.is_actively_instructing,
      endorsements: instructor.endorsements?.map((e) => e.name) || [],
      notes: instructor.notes || "",
    },
  });

  const onSave = async (data: LicenseFormValues) => {
    try {
      const res = await fetch("/api/instructors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: instructor.id,
          instructor_check_due_date: data.instructor_check_due_date,
          instrument_check_due_date: data.instrument_check_due_date,
          class_1_medical_due_date: data.class_1_medical_due_date,
          employment_type: data.employment_type,
          is_actively_instructing: data.is_actively_instructing,
          notes: data.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save changes");
      }
      toast.success("Saved");
      reset(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to save changes");
      } else {
        toast.error("Failed to save changes");
      }
    }
  };

  return (
    <div className="w-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden max-w-4xl mx-auto mt-2">
      {/* Header */}
      <div className="flex items-center gap-6 px-8 pt-8 pb-4">
        <Avatar className="w-24 h-24 border-4 border-indigo-100 shadow">
          <AvatarFallback className="text-2xl font-semibold bg-indigo-100 text-indigo-700">
            {(instructor.first_name || instructor.email || "").charAt(0).toUpperCase()}
            {(instructor.last_name || "").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-600" />
            {instructor.first_name} {instructor.last_name}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-zinc-500">
            <Mail className="w-4 h-4" />
            <span>{instructor.email}</span>
          </div>
          <Badge className={
            instructor.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-zinc-200 text-zinc-500"
          }>
            {instructor.status === "active" ? "Active" : "Expired"}
          </Badge>
        </div>
      </div>
      {/* Tabs Bar */}
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full flex flex-col"
      >
        <div className="w-full border-b border-gray-200 bg-white">
          <Tabs.List
            className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]"
            aria-label="Instructor tabs"
          >
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={`inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                    data-[state=active]:border-indigo-700 data-[state=active]:text-indigo-800
                    data-[state=inactive]:text-muted-foreground hover:text-indigo-600 whitespace-nowrap`}
                  style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>
        </div>
        <div className="w-full p-8">
          <Tabs.Content value="license" className="w-full">
            <form onSubmit={handleSubmit(onSave)}>
              <Card className="p-6 flex flex-col gap-6">
                <div className="flex flex-row items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Instructor Details
                  </h2>
                  <div className="flex gap-2 items-center">
                    <Button type="submit" disabled={!isDirty} size="sm" className="min-w-[100px] font-semibold">
                      Save
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={!isDirty} onClick={() => reset()}>
                      Undo
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
                      <CalendarCheck2 className="w-4 h-4 text-indigo-500" /> Instructor Check Due
                    </label>
                    <Controller
                      name="instructor_check_due_date"
                      control={control}
                      render={({ field }) => {
                        const value = field.value ? new Date(field.value) : undefined;
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
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
                                onSelect={date => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                    {errors.instructor_check_due_date && <p className="text-xs text-red-500 mt-1">{errors.instructor_check_due_date.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
                      <ActivitySquare className="w-4 h-4 text-indigo-500" /> Instrument Check Due
                    </label>
                    <Controller
                      name="instrument_check_due_date"
                      control={control}
                      render={({ field }) => {
                        const value = field.value ? new Date(field.value) : undefined;
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
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
                                onSelect={date => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                    {errors.instrument_check_due_date && <p className="text-xs text-red-500 mt-1">{errors.instrument_check_due_date.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
                      <Stethoscope className="w-4 h-4 text-indigo-500" /> Class 1 Medical Due
                    </label>
                    <Controller
                      name="class_1_medical_due_date"
                      control={control}
                      render={({ field }) => {
                        const value = field.value ? new Date(field.value) : undefined;
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
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
                                onSelect={date => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                    {errors.class_1_medical_due_date && <p className="text-xs text-red-500 mt-1">{errors.class_1_medical_due_date.message}</p>}
                  </div>
                </div>
                {/* Endorsements Section */}
                <div className="flex flex-col gap-2 mt-4">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    Endorsements & Ratings
                  </h3>
                  <Card className="p-4 bg-white border border-indigo-100">
                    <RatingsTab instructorId={instructor.id} />
                  </Card>
                </div>
              </Card>
            </form>
          </Tabs.Content>
          <Tabs.Content value="uploads" className="w-full">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Uploads</h2>
              <div className="max-w-2xl w-full mx-auto">
                {/* Move hook call to top level */}
                <Dropzone {...useSupabaseUpload({
                  bucketName: 'test',
                  path: 'test',
                  allowedMimeTypes: ['image/*'],
                  maxFiles: 2,
                  maxFileSize: 1000 * 1000 * 10, // 10MB
                })}>
                  <DropzoneEmptyState />
                  <DropzoneContent />
                </Dropzone>
              </div>
            </Card>
          </Tabs.Content>
          <Tabs.Content value="history" className="w-full">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">History</h2>
              <p className="text-zinc-700">No history yet. (Placeholder)</p>
            </Card>
          </Tabs.Content>
          <Tabs.Content value="notes" className="w-full">
            <Card className="p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Notes
              </h2>
              <form
                onSubmit={handleSubmit(async (data) => {
                  try {
                    const res = await fetch("/api/instructors", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: instructor.id,
                        notes: data.notes,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.error || "Failed to save notes");
                    }
                    toast.success("Notes saved");
                    setValue("notes", data.notes, { shouldDirty: false });
                  } catch (err: unknown) {
                    if (err instanceof Error) {
                      toast.error(err.message || "Failed to save notes");
                    } else {
                      toast.error("Failed to save notes");
                    }
                  }
                })}
                className="flex flex-col gap-4"
              >
                <Textarea
                  {...register("notes")}
                  className="bg-white min-h-[120px]"
                  placeholder="Add notes about this instructor..."
                  value={watch("notes") || ""}
                  onChange={e => setValue("notes", e.target.value, { shouldDirty: true })}
                />
                <div className="flex gap-2 mt-2">
                  <Button type="submit" disabled={!isDirty} size="sm" className="min-w-[100px] font-semibold">
                    Save
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={!isDirty} onClick={() => reset()}>
                    Undo
                  </Button>
                </div>
              </form>
            </Card>
          </Tabs.Content>
          {/* Settings Tab */}
          <Tabs.Content value="settings" className="w-full">
            <form onSubmit={handleSubmit(onSave)}>
              <Card className="p-6 flex flex-col gap-6">
                <div className="flex flex-row items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    Settings
                  </h2>
                  <div className="flex gap-2 items-center">
                    <Button type="submit" disabled={!isDirty} size="sm" className="min-w-[100px] font-semibold">
                      Save
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={!isDirty} onClick={() => reset()}>
                      Undo
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col gap-2 md:w-1/3">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Activity className="w-4 h-4" /> Actively Instructing
                    </label>
                    <Switch checked={watch("is_actively_instructing")}
                      onCheckedChange={val => setValue("is_actively_instructing", val, { shouldDirty: true })}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:w-1/3">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Settings className="w-4 h-4 text-indigo-500" /> Status
                    </label>
                    <Select
                      value={status}
                      onValueChange={val => {
                        if (val !== status) {
                          fetch("/api/instructors", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: instructor.id, status: val }),
                          })
                            .then(async res => {
                              if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.error || "Failed to update status");
                              }
                              setStatus(val);
                              toast.success("Status updated");
                            })
                            .catch(err => {
                              toast.error(err.message || "Failed to update status");
                            });
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 md:w-1/3">
                    <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
                      <Briefcase className="w-4 h-4 text-indigo-500" /> Employment Type
                    </label>
                    <Select
                      value={watch("employment_type")}
                      onValueChange={val => setValue("employment_type", val as LicenseFormValues["employment_type"], { shouldDirty: true })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {employmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.employment_type && <p className="text-xs text-red-500 mt-1">{errors.employment_type.message}</p>}
                  </div>
                </div>
                <div className="mt-8">
                  <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600" /> Instructor Rates by Flight Type
                  </h3>
                  <InstructorFlightTypeRatesTable instructorId={instructor.id} />
                </div>
              </Card>
            </form>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
} 