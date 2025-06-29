import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { User } from "@/types/users";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User as UserIcon, Building, Users, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const contactSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email(),
  phone: z.string().optional(),
  street_address: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
  next_of_kin_name: z.string().optional(),
  next_of_kin_phone: z.string().optional(),
  company_name: z.string().optional(),
  occupation: z.string().optional(),
  employer: z.string().optional(),
  date_of_birth: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface MemberContactTabProps {
  member: User;
}

export default function MemberContactTab({ member }: MemberContactTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
    watch,
    setValue,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      email: member.email || "",
      phone: member.phone || "",
      street_address: member.street_address || "",
      gender: member.gender || "",
      notes: member.notes || "",
      next_of_kin_name: member.next_of_kin_name || "",
      next_of_kin_phone: member.next_of_kin_phone || "",
      company_name: member.company_name || "",
      occupation: member.occupation || "",
      employer: member.employer || "",
      date_of_birth: member.date_of_birth || "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/members?id=${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to update member");
      } else {
        reset(data); // reset dirty state
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      }
    } catch {
      setError("Failed to update member");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-row items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
        <div className="flex gap-2 items-center">
          <Button type="submit" disabled={!isDirty || isSaving} size="sm" className="min-w-[100px] font-semibold">
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!isDirty || isSaving} onClick={() => reset()}>
            Undo
          </Button>
          {showSaved && (
            <span className="flex items-center gap-1 text-green-600 font-semibold text-sm ml-2 animate-fade-in">
              <CheckCircle2 className="w-5 h-5" /> Saved!
            </span>
          )}
        </div>
      </div>
      {/* Personal Details Section */}
      <div className="mb-6">
        <h4 className="flex items-center gap-2 text-base font-semibold mb-2 text-gray-900">
          <UserIcon className="w-5 h-5 text-gray-500" />
          Personal Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">First Name</label>
            <Input {...register("first_name")}/>
            {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Last Name</label>
            <Input {...register("last_name")}/>
            {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
            <Input {...register("email")}/>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Phone</label>
            <Input {...register("phone")}/>
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Street Address</label>
            <Input {...register("street_address")}/>
          </div>
          <div className="max-w-md flex gap-4">
            <div className="w-1/2 min-w-0">
              <label className="block text-sm font-medium mb-1 text-gray-700">Gender</label>
              <Select
                value={watch("gender") || ""}
                onValueChange={val => setValue("gender", val, { shouldDirty: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2 min-w-0">
              <label className="block text-sm font-medium mb-1 text-gray-700">Date of Birth</label>
              <Input
                type="date"
                className="w-full"
                {...register("date_of_birth")}
                value={watch("date_of_birth") || ""}
                onChange={e => setValue("date_of_birth", e.target.value, { shouldDirty: true })}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Company Details Section */}
      <div className="mb-6">
        <h4 className="flex items-center gap-2 text-base font-semibold mb-2 text-gray-900">
          <Building className="w-5 h-5 text-gray-500" />
          Company Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Company</label>
            <Input {...register("company_name")}/>
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Occupation</label>
            <Input {...register("occupation")}/>
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Employer</label>
            <Input {...register("employer")}/>
          </div>
        </div>
      </div>
      {/* Next of Kin Section */}
      <div className="mb-6">
        <h4 className="flex items-center gap-2 text-base font-semibold mb-2 text-gray-900">
          <Users className="w-5 h-5 text-gray-500" />
          Next of Kin
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Next of Kin Name</label>
            <Input {...register("next_of_kin_name")}/>
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-1 text-gray-700">Next of Kin Phone</label>
            <Input {...register("next_of_kin_phone")}/>
          </div>
        </div>
      </div>
      {/* Notes Section */}
      <div className="mb-2">
        <h4 className="text-base font-semibold mb-2 text-gray-900">Notes</h4>
        <div className="max-w-md">
          <Input {...register("notes")}/>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </form>
  );
} 