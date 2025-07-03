"use client";
import { useEffect, useState, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AircraftComponent, ComponentType, IntervalType, ComponentStatus } from "@/types/aircraft_components";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { Info, Repeat, Calendar, Settings2, StickyNote } from "lucide-react";

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"];

const componentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  component_type: z.custom<ComponentType>(),
  interval_type: z.custom<IntervalType>(),
  interval_hours: z.preprocess(
    (v) => v === "" ? null : v,
    z.union([z.number().min(1, "Must be > 0").nullable(), z.null()])
  ),
  interval_days: z.preprocess(
    (v) => v === "" ? null : v,
    z.union([z.number().min(1, "Must be > 0").nullable(), z.null()])
  ),
  current_due_date: z.string().optional().nullable(),
  current_due_hours: z.preprocess(
    (v) => v === "" ? null : v,
    z.union([z.number().nullable(), z.null()])
  ),
  last_completed_date: z.string().optional().nullable(),
  last_completed_hours: z.preprocess(
    (v) => v === "" ? null : v,
    z.union([z.number().nullable(), z.null()])
  ),
  status: z.custom<ComponentStatus>(),
  priority: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof componentSchema>;

interface AircraftComponentFormProps {
  aircraftId: string;
  componentId?: string;
  onSuccess?: () => void;
}

const AircraftComponentForm = forwardRef<HTMLFormElement, AircraftComponentFormProps>(function AircraftComponentForm(
  { aircraftId, componentId, onSuccess },
  ref
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!componentId;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: "",
      description: "",
      component_type: undefined,
      interval_type: undefined,
      interval_hours: null,
      interval_days: null,
      current_due_date: "",
      current_due_hours: null,
      last_completed_date: "",
      last_completed_hours: null,
      status: "active",
      priority: "MEDIUM",
      notes: "",
    },
  });

  // Fetch initial data if editing
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    fetch(`/api/aircraft_components?component_id=${componentId}`)
      .then((res) => res.json())
      .then((data: AircraftComponent[] | { error: string }) => {
        if (Array.isArray(data) && data.length > 0) {
          const comp = data[0];
          const mapped = {
            name: comp.name ?? "",
            description: comp.description ?? "",
            component_type: comp.component_type,
            interval_type: comp.interval_type,
            interval_hours: comp.interval_hours ?? null,
            interval_days: comp.interval_days ?? null,
            current_due_date: comp.current_due_date ? comp.current_due_date.split("T")[0] : "",
            current_due_hours: comp.current_due_hours ?? null,
            last_completed_date: comp.last_completed_date ? comp.last_completed_date.split("T")[0] : "",
            last_completed_hours: comp.last_completed_hours ?? null,
            status: comp.status,
            priority: comp.priority ?? "",
            notes: comp.notes ?? "",
          };
          reset(mapped);
          setValue("component_type", mapped.component_type);
          setValue("interval_type", mapped.interval_type);
          setValue("status", mapped.status);
          setValue("priority", mapped.priority);
        } else if (!Array.isArray(data) && data.error) {
          setError(data.error);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [componentId, isEdit, reset, setValue]);

  // Watch interval_type for conditional fields
  const intervalType = watch("interval_type");

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...values,
        aircraft_id: aircraftId,
      };
      let res;
      if (isEdit) {
        res = await fetch(`/api/aircraft_components/${componentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/aircraft_components`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save component");
      }
      if (onSuccess) onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* First row: Component Info + Dates & Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-full flex flex-col">
          {/* Component Info Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold">Component Info</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 flex-1">
              {/* Name */}
              <div>
                <label className="block font-semibold mb-1">Name <span className="text-red-500">*</span></label>
                <Input {...register("name" )} disabled={loading} placeholder="e.g. 100 Hour Inspection" />
                {errors.name && <div className="text-red-500 text-xs mt-1 font-semibold">{errors.name.message}</div>}
              </div>
              {/* Component Type */}
              <div>
                <label className="block font-semibold mb-1">Component Type <span className="text-red-500">*</span></label>
                <Select {...register("component_type")} value={watch("component_type") ?? ""} onValueChange={v => setValue("component_type", v as ComponentType)} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["battery","inspection","service","engine","fuselage","avionics","elt","propeller","landing_gear","other"].map((type) => (
                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.component_type && <div className="text-red-500 text-xs mt-1 font-semibold">Required</div>}
              </div>
              {/* Description */}
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <Textarea {...register("description")} disabled={loading} placeholder="Add any notes or details about this component..." />
              </div>
            </div>
          </div>
        </div>
        <div className="h-full flex flex-col">
          {/* Dates & Hours Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold">Dates & Hours</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 flex-1">
              {/* Current Due Date */}
              <div>
                <label className="block font-semibold mb-1">Current Due Date</label>
                <Input type="date" {...register("current_due_date")} disabled={loading} />
              </div>
              {/* Current Due Hours */}
              <div>
                <label className="block font-semibold mb-1">Current Due Hours</label>
                <Input type="number" {...register("current_due_hours", { valueAsNumber: true })} disabled={loading} />
              </div>
              {/* Last Completed Date */}
              <div>
                <label className="block font-semibold mb-1">Last Completed Date</label>
                <Input type="date" {...register("last_completed_date")} disabled={loading} />
              </div>
              {/* Last Completed Hours */}
              <div>
                <label className="block font-semibold mb-1">Last Completed Hours</label>
                <Input type="number" {...register("last_completed_hours", { valueAsNumber: true })} disabled={loading} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Second row: Intervals + Status & Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-full flex flex-col">
          {/* Interval Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Repeat className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold">Intervals</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 flex-1">
              {/* Interval Type */}
              <div>
                <label className="block font-semibold mb-1">Interval Type <span className="text-red-500">*</span></label>
                <Select {...register("interval_type")} value={watch("interval_type") ?? ""} onValueChange={v => setValue("interval_type", v as IntervalType)} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {["HOURS","CALENDAR","BOTH"].map((type) => (
                      <SelectItem key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.interval_type && <div className="text-red-500 text-xs mt-1 font-semibold">Required</div>}
              </div>
              {/* Interval Hours */}
              {(intervalType === "HOURS" || intervalType === "BOTH") && (
                <div>
                  <label className="block font-semibold mb-1">Interval Hours <span className="text-red-500">*</span></label>
                  <Input type="number" {...register("interval_hours", { valueAsNumber: true })} disabled={loading} placeholder="e.g. 100" />
                  {errors.interval_hours && <div className="text-red-500 text-xs mt-1 font-semibold">{errors.interval_hours.message as string}</div>}
                </div>
              )}
              {/* Interval Days */}
              {(intervalType === "CALENDAR" || intervalType === "BOTH") && (
                <div>
                  <label className="block font-semibold mb-1">Interval Days <span className="text-red-500">*</span></label>
                  <Input type="number" {...register("interval_days", { valueAsNumber: true })} disabled={loading} placeholder="e.g. 365" />
                  {errors.interval_days && <div className="text-red-500 text-xs mt-1 font-semibold">{errors.interval_days.message as string}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="h-full flex flex-col">
          {/* Status & Priority Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold">Status & Priority</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 flex-1">
              {/* Status */}
              <div>
                <label className="block font-semibold mb-1">Status <span className="text-red-500">*</span></label>
                <Select {...register("status")} value={watch("status") ?? ""} onValueChange={v => setValue("status", v as ComponentStatus)} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {["active","inactive","removed"].map((status) => (
                      <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && <div className="text-red-500 text-xs mt-1 font-semibold">Required</div>}
              </div>
              {/* Priority */}
              <div>
                <label className="block font-semibold mb-1">Priority</label>
                <Select {...register("priority")} value={watch("priority") ?? ""} onValueChange={v => setValue("priority", v)} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Notes Section (full width) */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <div className="flex items-center gap-2 mb-4">
          <StickyNote className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold">Notes</h3>
        </div>
        <Textarea {...register("notes")} disabled={loading} placeholder="Any additional notes..." />
      </div>
      {/* Error */}
      {error && <div className="text-red-500 text-sm mt-2 font-semibold">{error}</div>}
    </form>
  );
});

export default AircraftComponentForm; 