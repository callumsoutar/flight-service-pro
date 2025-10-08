"use client";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as Tabs from "@radix-ui/react-tabs";
import { User, Mail, Award, Activity, FileText, Clock, CalendarCheck2, ActivitySquare, Stethoscope, Settings, Briefcase, Calendar as CalendarIcon, UserCog, Shield } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useEffect } from "react";
import type { InstructorCategory } from "@/types/instructor_categories";
import AircraftTypeRatingsTab from "@/components/instructors/AircraftTypeRatingsTab";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Controller } from "react-hook-form";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useUserRoles, useAssignRole, useRemoveRole } from '@/hooks/use-user-roles';
import { useCanManageRoles } from '@/hooks/use-can-manage-roles';
const InstructorFlightTypeRatesTable = dynamic(() => import("@/components/instructors/InstructorFlightTypeRatesTable"), { ssr: false });

const tabItems = [
  { id: "license", label: "Details", icon: Award },
  { id: "history", label: "History", icon: Clock },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const licenseSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  rating: z.string().optional(),
  instructor_check_due_date: z.string().min(1, "Required"),
  instrument_check_due_date: z.string().min(1, "Required"),
  class_1_medical_due_date: z.string().min(1, "Required"),
  employment_type: z.enum(["full_time", "part_time", "casual", "contractor"]),
  is_actively_instructing: z.boolean(),
  notes: z.string().optional(),
  // Endorsement columns
  night_removal: z.boolean(),
  aerobatics_removal: z.boolean(),
  multi_removal: z.boolean(),
  tawa_removal: z.boolean(),
  ifr_removal: z.boolean(),
});

interface InstructorWithUser {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  rating: string | null;
  email: string;
  status: string;
  instructor_check_due_date?: string;
  instrument_check_due_date?: string;
  class_1_medical_due_date?: string;
  employment_type?: "full_time" | "part_time" | "casual" | "contractor";
  is_actively_instructing: boolean;
  notes?: string;
  // Endorsement columns
  night_removal?: boolean;
  aerobatics_removal?: boolean;
  multi_removal?: boolean;
  tawa_removal?: boolean;
  ifr_removal?: boolean;
}

type LicenseFormValues = z.infer<typeof licenseSchema>;

export default function InstructorDetailsClient({ instructor }: { instructor: InstructorWithUser }) {
  const [selectedTab, setSelectedTab] = useState("license");
  const [status, setStatus] = useState<string>(instructor.status);

  // Role management hooks
  const { data: canManageRoles } = useCanManageRoles();
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles(instructor.user_id);
  const assignRoleMutation = useAssignRole();
  const removeRoleMutation = useRemoveRole();

  // Available roles for assignment
  const availableRoles = [
    { value: "instructor", label: "Instructor", description: "Can manage bookings, lessons, and student progress" },
    { value: "admin", label: "Admin", description: "Administrative access to manage users and settings" },
    { value: "owner", label: "Owner", description: "Full system access and control" },
  ];

  // Get current user's primary role
  const currentRole = userRoles?.roles?.[0]?.roles?.name || null;

  // Handle role assignment
  const handleRoleChange = async (newRole: string) => {
    if (!canManageRoles) {
      toast.error('You do not have permission to change roles');
      return;
    }

    if (currentRole === newRole) {
      return; // No change needed
    }

    try {
      // Remove existing role if any
      if (currentRole && userRoles?.roles?.[0]) {
        await removeRoleMutation.mutateAsync({
          userId: instructor.user_id,
          roleId: userRoles.roles[0].roles.id,
        });
      }

      // Assign new role
      if (newRole !== 'none') {
        await assignRoleMutation.mutateAsync({
          userId: instructor.user_id,
          roleName: newRole,
        });
      }
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

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
      first_name: instructor.first_name || "",
      last_name: instructor.last_name || "",
      rating: instructor.rating || "",
      instructor_check_due_date: instructor.instructor_check_due_date || "",
      instrument_check_due_date: instructor.instrument_check_due_date || "",
      class_1_medical_due_date: instructor.class_1_medical_due_date,
      employment_type: instructor.employment_type || "full_time",
      is_actively_instructing: instructor.is_actively_instructing,
      notes: instructor.notes || "",
      // Endorsement columns
      night_removal: instructor.night_removal || false,
      aerobatics_removal: instructor.aerobatics_removal || false,
      multi_removal: instructor.multi_removal || false,
      tawa_removal: instructor.tawa_removal || false,
      ifr_removal: instructor.ifr_removal || false,
    },
  });

  // State for instructor categories
  const [instructorCategories, setInstructorCategories] = useState<InstructorCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Fetch instructor categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/instructor_categories');
        if (response.ok) {
          const result = await response.json();
          setInstructorCategories(result.instructor_categories || []);
        }
      } catch (error) {
        console.error('Failed to fetch instructor categories:', error);
        toast.error('Failed to load instructor categories');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const onSave = async (data: LicenseFormValues) => {
    try {
      const res = await fetch("/api/instructors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: instructor.id,
          first_name: data.first_name,
          last_name: data.last_name,
          rating: data.rating || null,
          instructor_check_due_date: data.instructor_check_due_date,
          instrument_check_due_date: data.instrument_check_due_date,
          class_1_medical_due_date: data.class_1_medical_due_date,
          employment_type: data.employment_type,
          is_actively_instructing: data.is_actively_instructing,
          notes: data.notes,
          // Endorsement columns
          night_removal: data.night_removal,
          aerobatics_removal: data.aerobatics_removal,
          multi_removal: data.multi_removal,
          tawa_removal: data.tawa_removal,
          ifr_removal: data.ifr_removal,
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
            <form id="instructor-form" onSubmit={handleSubmit(onSave)} className="space-y-8">
              {/* Header with Save/Undo buttons */}
              <div className="flex flex-row items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <Award className="w-6 h-6 text-indigo-600" />
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
              
              {/* Name Fields Section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
                      <User className="w-4 h-4 text-indigo-500" /> First Name
                    </label>
                    <Input
                      {...register("first_name")}
                      placeholder="Enter first name"
                      className="w-full"
                    />
                    {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
                      <User className="w-4 h-4 text-indigo-500" /> Last Name
                    </label>
                    <Input
                      {...register("last_name")}
                      placeholder="Enter last name"
                      className="w-full"
                    />
                    {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
                  </div>
                </div>

                {/* Instructor Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Award className="w-4 h-4 text-indigo-500" /> Instructor Category
                    </label>
                    <Select
                      value={watch("rating") || undefined}
                      onValueChange={(value) => {
                        if (value === "clear") {
                          setValue("rating", "", { shouldDirty: true });
                        } else {
                          setValue("rating", value, { shouldDirty: true });
                        }
                      }}
                      disabled={categoriesLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select instructor category"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clear">No category selected</SelectItem>
                        {instructorCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Certification Dates Section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2">Certification & Medical</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
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
                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
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
                    <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
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
              </div>
              
              {/* Endorsements Section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  Endorsements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Switch 
                        checked={watch("night_removal")}
                        onCheckedChange={val => setValue("night_removal", val, { shouldDirty: true })}
                      />
                      Night Removal
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Switch 
                        checked={watch("aerobatics_removal")}
                        onCheckedChange={val => setValue("aerobatics_removal", val, { shouldDirty: true })}
                      />
                      Aerobatics Removal
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Switch 
                        checked={watch("multi_removal")}
                        onCheckedChange={val => setValue("multi_removal", val, { shouldDirty: true })}
                      />
                      Multi Removal
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Switch 
                        checked={watch("tawa_removal")}
                        onCheckedChange={val => setValue("tawa_removal", val, { shouldDirty: true })}
                      />
                      TAWA Removal
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Switch 
                        checked={watch("ifr_removal")}
                        onCheckedChange={val => setValue("ifr_removal", val, { shouldDirty: true })}
                      />
                      IFR Removal
                    </label>
                  </div>
                </div>
              </div>

              {/* Aircraft Type Ratings Section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                  <ActivitySquare className="w-5 h-5 text-blue-500" />
                  Aircraft Type Ratings
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <AircraftTypeRatingsTab instructorId={instructor.id} />
                </div>
              </div>
            </form>
          </Tabs.Content>

          <Tabs.Content value="history" className="w-full space-y-6">
            <div className="flex flex-row items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                <Clock className="w-6 h-6 text-indigo-600" />
                Activity History
              </h2>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">No activity history available yet.</p>
              <p className="text-gray-500 text-xs mt-1">Changes and updates will appear here.</p>
            </div>
          </Tabs.Content>
          <Tabs.Content value="notes" className="w-full space-y-6">
            <div className="flex flex-row items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                <FileText className="w-6 h-6 text-indigo-600" />
                Notes
              </h2>
            </div>
            
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
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Instructor Notes</label>
                <Textarea
                  {...register("notes")}
                  className="bg-white min-h-[160px] resize-none"
                  placeholder="Add notes about this instructor..."
                  value={watch("notes") || ""}
                  onChange={e => setValue("notes", e.target.value, { shouldDirty: true })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={!isDirty} size="sm" className="min-w-[100px] font-semibold">
                  Save Notes
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={!isDirty} onClick={() => reset()}>
                  Undo
                </Button>
              </div>
            </form>
          </Tabs.Content>
          {/* Settings Tab */}
          <Tabs.Content value="settings" className="w-full space-y-8">
            <div className="flex flex-row items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                <Settings className="w-6 h-6 text-indigo-600" />
                Instructor Settings
              </h2>
              <div className="flex gap-2 items-center">
                <Button type="submit" disabled={!isDirty} size="sm" className="min-w-[100px] font-semibold" form="instructor-settings-form">
                  Save Settings
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={!isDirty} onClick={() => reset()}>
                  Undo
                </Button>
              </div>
            </div>

            <form id="instructor-settings-form" onSubmit={handleSubmit(onSave)} className="space-y-8">
              {/* Role Management Section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  Role & Permissions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-indigo-500" />
                      System Role
                    </label>

                    {rolesLoading ? (
                      <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                    ) : (
                      <Select
                        value={currentRole || 'none'}
                        onValueChange={handleRoleChange}
                        disabled={!canManageRoles || assignRoleMutation.isPending || removeRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No role assigned</SelectItem>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {!canManageRoles && (
                      <p className="text-xs text-gray-500">
                        You need admin or owner permissions to change roles
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructor Status Section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2">Status & Employment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-500" /> 
                      Actively Instructing
                    </label>
                    <Switch 
                      checked={watch("is_actively_instructing")}
                      onCheckedChange={val => setValue("is_actively_instructing", val, { shouldDirty: true })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-500" /> 
                      Account Status
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
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-500" /> 
                      Employment Type
                    </label>
                    <Select
                      value={watch("employment_type")}
                      onValueChange={val => setValue("employment_type", val as LicenseFormValues["employment_type"], { shouldDirty: true })}
                    >
                      <SelectTrigger className="w-full">
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
                
              </div>
            </form>

            {/* Rates Section */}
            <div className="space-y-4">
              <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                Flight Type Rates
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <InstructorFlightTypeRatesTable instructorId={instructor.id} />
              </div>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
} 