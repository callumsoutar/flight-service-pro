"use client";

import { useState } from "react";
import { User, Shield, Calendar } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { PublicDirectoryToggle } from "@/components/settings/PublicDirectoryToggle";
import { User as UserType } from "@/types/users";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

interface ProfileClientProps {
  initialProfileData: UserType | null;
}

const dueDatesSchema = z.object({
  class_1_medical_due: z.string().optional(),
  class_2_medical_due: z.string().optional(),
  DL9_due: z.string().optional(),
  BFR_due: z.string().optional(),
});

type DueDatesFormValues = z.infer<typeof dueDatesSchema>;

const getDaysUntilExpiry = (dateString: string | null | undefined): number | null => {
  if (!dateString) return null;

  const expiryDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getExpiryStatus = (daysRemaining: number | null): { color: string; bgColor: string; textColor: string } => {
  if (daysRemaining === null) {
    return { color: "gray", bgColor: "bg-gray-100", textColor: "text-gray-600" };
  }

  if (daysRemaining < 0) {
    return { color: "red", bgColor: "bg-red-100", textColor: "text-red-700" };
  } else if (daysRemaining <= 30) {
    return { color: "yellow", bgColor: "bg-yellow-100", textColor: "text-yellow-700" };
  } else {
    return { color: "green", bgColor: "bg-green-100", textColor: "text-green-700" };
  }
};

const tabItems = [
  { id: "profile", label: "Profile", icon: User },
  { id: "due-dates", label: "Due Dates", icon: Calendar },
  { id: "privacy", label: "Privacy", icon: Shield },
];

export default function ProfileClient({ initialProfileData }: ProfileClientProps) {
  const [selectedTab, setSelectedTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);

  const {
    handleSubmit,
    reset,
    formState: { isDirty },
    watch,
    setValue,
  } = useForm<DueDatesFormValues>({
    resolver: zodResolver(dueDatesSchema),
    defaultValues: {
      class_1_medical_due: initialProfileData?.class_1_medical_due || "",
      class_2_medical_due: initialProfileData?.class_2_medical_due || "",
      DL9_due: initialProfileData?.DL9_due || "",
      BFR_due: initialProfileData?.BFR_due || "",
    },
  });

  const onSubmit = async (data: DueDatesFormValues) => {
    setIsSaving(true);
    try {
      // Transform empty strings to null for date fields
      const transformedData = {
        class_1_medical_due: data.class_1_medical_due || null,
        class_2_medical_due: data.class_2_medical_due || null,
        DL9_due: data.DL9_due || null,
        BFR_due: data.BFR_due || null,
      };
      
      console.log('Submitting due dates data:', transformedData);
      console.log('User ID:', initialProfileData?.id);
      
      const res = await fetch(`/api/members?id=${initialProfileData?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.error('API Error:', err);
        toast.error(err.error || `Failed to update due dates (${res.status})`);
      } else {
        reset(data); // reset dirty state
        toast.success("Due dates saved!");
      }
    } catch (err) {
      console.error('Network error:', err);
      toast.error("Failed to update due dates - network error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full h-full flex flex-col"
      >
        <div className="w-full border-b border-gray-200 bg-white">
          <Tabs.List
            className="flex flex-row gap-1 px-2 pt-2 min-h-[48px]"
            aria-label="Profile settings tabs"
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
        
        <div className="w-full p-6">
          <Tabs.Content value="profile" className="h-full w-full">
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Your basic profile information. Contact an administrator to update this information.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-900">{initialProfileData?.first_name || "Not provided"}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-900">{initialProfileData?.last_name || "Not provided"}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-900">{initialProfileData?.email || "Not provided"}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-900">{initialProfileData?.phone || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tabs.Content>
          
          <Tabs.Content value="due-dates" className="h-full w-full">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex flex-row items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Medical & Training Due Dates</h3>
                      <p className="text-sm text-gray-600">
                        These dates are for your reference only as a reminder. They do not affect your ability to book flights or access the system.
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button type="submit" disabled={!isDirty || isSaving} size="sm" className="min-w-[100px] font-semibold">
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={!isDirty || isSaving} onClick={() => reset()}>
                        Undo
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div className="h-[84px] flex flex-col">
                        <label className="block text-sm font-medium mb-2 text-gray-700">Class 1 Medical Due</label>
                        <div className="flex-1 flex flex-col justify-between">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {watch("class_1_medical_due") ? format(new Date(watch("class_1_medical_due")!), 'PPP') : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={watch("class_1_medical_due") ? new Date(watch("class_1_medical_due")!) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    setValue("class_1_medical_due", format(date, 'yyyy-MM-dd'), { shouldDirty: true });
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="h-6 flex items-center mt-2">
                            {(() => {
                              const daysRemaining = getDaysUntilExpiry(watch("class_1_medical_due"));
                              const status = getExpiryStatus(daysRemaining);

                              if (daysRemaining === null) return null;

                              return (
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}>
                                  {daysRemaining < 0
                                    ? `Expired ${Math.abs(daysRemaining)} days ago`
                                    : daysRemaining === 0
                                    ? "Expires today"
                                    : `${daysRemaining} days remaining`
                                  }
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="h-[84px] flex flex-col">
                        <label className="block text-sm font-medium mb-2 text-gray-700">Class 2 Medical Due</label>
                        <div className="flex-1 flex flex-col justify-between">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {watch("class_2_medical_due") ? format(new Date(watch("class_2_medical_due")!), 'PPP') : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={watch("class_2_medical_due") ? new Date(watch("class_2_medical_due")!) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    setValue("class_2_medical_due", format(date, 'yyyy-MM-dd'), { shouldDirty: true });
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="h-6 flex items-center mt-2">
                            {(() => {
                              const daysRemaining = getDaysUntilExpiry(watch("class_2_medical_due"));
                              const status = getExpiryStatus(daysRemaining);

                              if (daysRemaining === null) return null;

                              return (
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}>
                                  {daysRemaining < 0
                                    ? `Expired ${Math.abs(daysRemaining)} days ago`
                                    : daysRemaining === 0
                                    ? "Expires today"
                                    : `${daysRemaining} days remaining`
                                  }
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="h-[84px] flex flex-col">
                        <label className="block text-sm font-medium mb-2 text-gray-700">DL9 Due</label>
                        <div className="flex-1 flex flex-col justify-between">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {watch("DL9_due") ? format(new Date(watch("DL9_due")!), 'PPP') : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={watch("DL9_due") ? new Date(watch("DL9_due")!) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    setValue("DL9_due", format(date, 'yyyy-MM-dd'), { shouldDirty: true });
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="h-6 flex items-center mt-2">
                            {(() => {
                              const daysRemaining = getDaysUntilExpiry(watch("DL9_due"));
                              const status = getExpiryStatus(daysRemaining);

                              if (daysRemaining === null) return null;

                              return (
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}>
                                  {daysRemaining < 0
                                    ? `Expired ${Math.abs(daysRemaining)} days ago`
                                    : daysRemaining === 0
                                    ? "Expires today"
                                    : `${daysRemaining} days remaining`
                                  }
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="h-[84px] flex flex-col">
                        <label className="block text-sm font-medium mb-2 text-gray-700">BFR Due</label>
                        <div className="flex-1 flex flex-col justify-between">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {watch("BFR_due") ? format(new Date(watch("BFR_due")!), 'PPP') : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={watch("BFR_due") ? new Date(watch("BFR_due")!) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    setValue("BFR_due", format(date, 'yyyy-MM-dd'), { shouldDirty: true });
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="h-6 flex items-center mt-2">
                            {(() => {
                              const daysRemaining = getDaysUntilExpiry(watch("BFR_due"));
                              const status = getExpiryStatus(daysRemaining);

                              if (daysRemaining === null) return null;

                              return (
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}>
                                  {daysRemaining < 0
                                    ? `Expired ${Math.abs(daysRemaining)} days ago`
                                    : daysRemaining === 0
                                    ? "Expires today"
                                    : `${daysRemaining} days remaining`
                                  }
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </Tabs.Content>
          
          <Tabs.Content value="privacy" className="h-full w-full">
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Control your visibility and privacy preferences.
                </p>
                
                <PublicDirectoryToggle />
              </div>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
