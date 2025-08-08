import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isBefore, addDays } from "date-fns";
import { Plane, Heart, AlertTriangle, CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface PilotDetailsTabProps {
  memberId: string;
}

const pilotDetailsSchema = z.object({
  pilot_license_number: z.string().optional(),
  pilot_license_type: z.string().optional(),
  pilot_license_expiry: z.string().optional(),
  medical_certificate_number: z.string().optional(),
  medical_certificate_expiry: z.string().optional(),
});

type PilotDetailsFormValues = z.infer<typeof pilotDetailsSchema>;

export default function MemberPilotDetailsTab({ memberId }: PilotDetailsTabProps) {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
    watch,
    setValue,
  } = useForm<PilotDetailsFormValues>({
    resolver: zodResolver(pilotDetailsSchema),
  });

  useEffect(() => {
    const fetchMemberData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/users?id=${memberId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch member data');
        }
        const data = await response.json();
        if (data.users && data.users.length > 0) {
          const memberData = data.users[0];
          
          // Reset form with fetched data
          reset({
            pilot_license_number: memberData.pilot_license_number || "",
            pilot_license_type: memberData.pilot_license_type || "",
            pilot_license_expiry: memberData.pilot_license_expiry || "",
            medical_certificate_number: memberData.medical_certificate_number || "",
            medical_certificate_expiry: memberData.medical_certificate_expiry || "",
          });
        }
      } catch (err) {
        console.error('Error fetching member data:', err);
        setError('Failed to load member data');
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMemberData();
    }
  }, [memberId, reset]);

  const onSubmit = async (data: PilotDetailsFormValues) => {
    setIsSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/members?id=${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || `Failed to update pilot details (${res.status})`);
        toast.error(err.error || "Failed to update pilot details");
      } else {
        reset(data); // reset dirty state
        toast.success("Pilot details saved!");
      }
    } catch (err) {
      console.error('Network error:', err);
      setError("Failed to update pilot details - network error");
      toast.error("Failed to update pilot details - network error");
    } finally {
      setIsSaving(false);
    }
  };

  const getExpiryStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return { status: 'unknown', color: 'bg-gray-100 text-gray-800', icon: CalendarIcon };
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const warningDate = addDays(today, 30); // 30 days warning
    
    if (isBefore(expiry, today)) {
      return { status: 'expired', color: 'bg-red-100 text-red-800', icon: XCircle };
    } else if (isBefore(expiry, warningDate)) {
      return { status: 'expiring', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    } else {
      return { status: 'valid', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading pilot details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Pilot Details & Certifications</h3>
        <div className="flex gap-2 items-center">
          <Button type="submit" disabled={!isDirty || isSaving} size="sm" className="min-w-[100px] font-semibold">
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!isDirty || isSaving} onClick={() => reset()}>
            Undo
          </Button>
        </div>
      </div>

      {/* Pilot License Section */}
      <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
        <h4 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-900 tracking-tight">
          <Plane className="w-5 h-5 text-indigo-500" />
          Pilot License Information
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">License Type</label>
              <Input 
                {...register("pilot_license_type")}
                className="bg-white"
                placeholder="e.g., Private Pilot License (PPL)"
              />
              {errors.pilot_license_type && <p className="text-xs text-red-500 mt-1">{errors.pilot_license_type.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">License Number</label>
              <Input 
                {...register("pilot_license_number")}
                className="bg-white"
                placeholder="e.g., PPL-123456"
              />
              {errors.pilot_license_number && <p className="text-xs text-red-500 mt-1">{errors.pilot_license_number.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Medical Certificate Number</label>
              <Input 
                {...register("medical_certificate_number")}
                className="bg-white"
                placeholder="e.g., MED-789012"
              />
              {errors.medical_certificate_number && <p className="text-xs text-red-500 mt-1">{errors.medical_certificate_number.message}</p>}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">License Expiry Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal bg-white"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("pilot_license_expiry") ? format(new Date(watch("pilot_license_expiry")!), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch("pilot_license_expiry") ? new Date(watch("pilot_license_expiry")!) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("pilot_license_expiry", format(date, 'yyyy-MM-dd'), { shouldDirty: true });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.pilot_license_expiry && <p className="text-xs text-red-500 mt-1">{errors.pilot_license_expiry.message}</p>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {watch("pilot_license_expiry") && (() => {
                const expiryStatus = getExpiryStatus(watch("pilot_license_expiry"));
                const Icon = expiryStatus.icon;
                return (
                  <Badge className={`${expiryStatus.color} flex items-center gap-1 px-3 py-1`}>
                    <Icon className="w-3 h-3" />
                    {expiryStatus.status === 'expired' ? 'Expired' : 
                     expiryStatus.status === 'expiring' ? 'Expiring Soon' : 'Valid'}
                  </Badge>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Medical Certificate Section */}
      <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
        <h4 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-900 tracking-tight">
          <Heart className="w-5 h-5 text-indigo-500" />
          Medical Certificate Expiry
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Medical Certificate Expiry Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal bg-white"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("medical_certificate_expiry") ? format(new Date(watch("medical_certificate_expiry")!), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch("medical_certificate_expiry") ? new Date(watch("medical_certificate_expiry")!) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("medical_certificate_expiry", format(date, 'yyyy-MM-dd'), { shouldDirty: true });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.medical_certificate_expiry && <p className="text-xs text-red-500 mt-1">{errors.medical_certificate_expiry.message}</p>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {watch("medical_certificate_expiry") && (() => {
                const expiryStatus = getExpiryStatus(watch("medical_certificate_expiry"));
                const Icon = expiryStatus.icon;
                return (
                  <Badge className={`${expiryStatus.color} flex items-center gap-1 px-3 py-1`}>
                    <Icon className="w-3 h-3" />
                    {expiryStatus.status === 'expired' ? 'Expired' : 
                     expiryStatus.status === 'expiring' ? 'Expiring Soon' : 'Valid'}
                  </Badge>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </form>
  );
} 