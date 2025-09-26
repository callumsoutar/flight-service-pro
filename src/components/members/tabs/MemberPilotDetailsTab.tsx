import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, isBefore, addDays } from "date-fns";
import { Plane, Heart, AlertTriangle, CalendarIcon, CheckCircle, XCircle, Award, Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { License } from "@/types/licenses";

interface PilotDetailsTabProps {
  memberId: string;
}

interface Endorsement {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface UserEndorsement {
  id: string;
  user_id: string;
  endorsement_id: string;
  issued_date: string;
  expiry_date: string | null;
  notes: string | null;
  voided_at: string | null;
  endorsement: Endorsement;
}

const pilotDetailsSchema = z.object({
  pilot_license_number: z.string().optional(),
  pilot_license_type: z.string().optional(), // Keep for backward compatibility
  pilot_license_id: z.string().optional(),
  pilot_license_expiry: z.string().optional(),
  medical_certificate_expiry: z.string().optional(),
});

type PilotDetailsFormValues = z.infer<typeof pilotDetailsSchema>;

export default function MemberPilotDetailsTab({ memberId }: PilotDetailsTabProps) {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User endorsements state
  const [userEndorsements, setUserEndorsements] = useState<UserEndorsement[]>([]);
  const [availableEndorsements, setAvailableEndorsements] = useState<Endorsement[]>([]);
  const [endorsementsLoading, setEndorsementsLoading] = useState(false);
  const [selectedEndorsement, setSelectedEndorsement] = useState<string>("");
  const [endorsementNotes, setEndorsementNotes] = useState("");
  const [endorsementExpiryDate, setEndorsementExpiryDate] = useState<Date | undefined>(undefined);
  const [showAddEndorsement, setShowAddEndorsement] = useState(false);

  // Licenses state
  const [availableLicenses, setAvailableLicenses] = useState<License[]>([]);

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [endorsementToDelete, setEndorsementToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

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

  // Fetch member data and endorsements
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Parallel fetch of all data
        const [memberResponse, userEndorsementsResponse, availableEndorsementsResponse, licensesResponse] = await Promise.all([
          fetch(`/api/users?id=${memberId}`),
          fetch(`/api/users-endorsements?user_id=${memberId}`),
          fetch('/api/endorsements'),
          fetch('/api/licenses?active_only=true')
        ]);

        // Handle member data
        if (!memberResponse.ok) {
          throw new Error('Failed to fetch member data');
        }
        const memberData = await memberResponse.json();
        if (memberData.users && memberData.users.length > 0) {
          const member = memberData.users[0];

          // Reset form with fetched data
          reset({
            pilot_license_number: member.pilot_license_number || "",
            pilot_license_type: member.pilot_license_type || "",
            pilot_license_id: member.pilot_license_id || "",
            pilot_license_expiry: member.pilot_license_expiry || "",
            medical_certificate_expiry: member.medical_certificate_expiry || "",
          });
        }

        // Handle user endorsements
        if (userEndorsementsResponse.ok) {
          const data = await userEndorsementsResponse.json();
          setUserEndorsements(data.user_endorsements || []);
        }

        // Handle available endorsements
        if (availableEndorsementsResponse.ok) {
          const data = await availableEndorsementsResponse.json();
          setAvailableEndorsements(data.endorsements || []);
        }

        // Handle licenses
        if (licensesResponse.ok) {
          const data = await licensesResponse.json();
          setAvailableLicenses(data.licenses || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchData();
    }
  }, [memberId, reset]);

  // Refresh user endorsements after adding/removing
  const refreshUserEndorsements = async () => {
    try {
      const response = await fetch(`/api/users-endorsements?user_id=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setUserEndorsements(data.user_endorsements || []);
      }
    } catch (err) {
      console.error('Error fetching user endorsements:', err);
    }
  };

  // Add new endorsement
  const addEndorsement = async () => {
    if (!selectedEndorsement) {
      toast.error("Please select an endorsement");
      return;
    }

    setEndorsementsLoading(true);
    try {
      const response = await fetch('/api/users-endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: memberId,
          endorsement_id: selectedEndorsement,
          issued_date: new Date().toISOString(),
          expiry_date: endorsementExpiryDate ? endorsementExpiryDate.toISOString() : null,
          notes: endorsementNotes || null,
        }),
      });

      if (response.ok) {
        toast.success("Endorsement added successfully");
        setSelectedEndorsement("");
        setEndorsementNotes("");
        setEndorsementExpiryDate(undefined);
        setShowAddEndorsement(false); // Hide the form after successful addition
        await refreshUserEndorsements();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add endorsement");
      }
    } catch (err) {
      console.error('Error adding endorsement:', err);
      toast.error("Failed to add endorsement");
    } finally {
      setEndorsementsLoading(false);
    }
  };

  // Reset form and close add endorsement section
  const resetAddEndorsementForm = () => {
    setSelectedEndorsement("");
    setEndorsementNotes("");
    setEndorsementExpiryDate(undefined);
    setShowAddEndorsement(false);
  };

  // Show confirmation dialog for endorsement removal
  const showDeleteConfirmationDialog = (endorsementId: string, endorsementName: string) => {
    setEndorsementToDelete({ id: endorsementId, name: endorsementName });
    setShowDeleteConfirmation(true);
  };

  // Void endorsement (soft delete) - called after confirmation
  const voidEndorsement = async () => {
    if (!endorsementToDelete) return;

    try {
      const response = await fetch(`/api/users-endorsements/${endorsementToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success("Endorsement removed successfully");
        await refreshUserEndorsements();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove endorsement");
      }
    } catch (err) {
      console.error('Error removing endorsement:', err);
      toast.error("Failed to remove endorsement");
    } finally {
      setShowDeleteConfirmation(false);
      setEndorsementToDelete(null);
    }
  };

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
      <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-900 tracking-tight">
          <Plane className="w-5 h-5 text-indigo-500" />
          Pilot License Information
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">License Type</label>
              <Select 
                value={watch("pilot_license_id") || ""} 
                onValueChange={(value) => {
                  setValue("pilot_license_id", value, { shouldDirty: true });
                  // Also update the legacy field for backward compatibility
                  const selectedLicense = availableLicenses.find(license => license.id === value);
                  if (selectedLicense) {
                    setValue("pilot_license_type", selectedLicense.name, { shouldDirty: true });
                  }
                }}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select license type" />
                </SelectTrigger>
                <SelectContent>
                  {availableLicenses.map((license) => (
                    <SelectItem key={license.id} value={license.id}>
                      {license.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pilot_license_id && <p className="text-xs text-red-500 mt-1">{errors.pilot_license_id.message}</p>}
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
      <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-900 tracking-tight">
          <Heart className="w-5 h-5 text-indigo-500" />
          Medical Certificate Expiry
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Medical Certificate Expiry Date</label>
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1 justify-start text-left font-normal bg-white"
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
                {watch("medical_certificate_expiry") && (() => {
                  const expiryStatus = getExpiryStatus(watch("medical_certificate_expiry"));
                  const Icon = expiryStatus.icon;
                  return (
                    <Badge className={`${expiryStatus.color} flex items-center gap-1 px-3 py-1 flex-shrink-0`}>
                      <Icon className="w-3 h-3" />
                      {expiryStatus.status === 'expired' ? 'Expired' : 
                       expiryStatus.status === 'expiring' ? 'Expiring Soon' : 'Valid'}
                    </Badge>
                  );
                })()}
              </div>
              {errors.medical_certificate_expiry && <p className="text-xs text-red-500 mt-1">{errors.medical_certificate_expiry.message}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* User Endorsements Section */}
      <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 tracking-tight">
            <Award className="w-5 h-5 text-indigo-500" />
            Endorsements & Ratings
          </h4>
        </div>
        
        {userEndorsements.length === 0 && !showAddEndorsement ? (
          /* Compact empty state */
          <div className="p-6">
            <div className="text-center py-6 text-gray-500">
              <Award className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="text-sm mb-4">No endorsements yet</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddEndorsement(true)}
                className="w-full justify-center py-3 border-dashed border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-gray-600 font-medium">Add New Endorsement</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* Add New Endorsement - Collapsible */}
            <div className="mb-4">
              {!showAddEndorsement ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddEndorsement(true)}
                  className="w-full justify-center py-2 border-dashed border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-gray-600 font-medium">Add New Endorsement</span>
                </Button>
              ) : (
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-medium text-gray-700">Add New Endorsement</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetAddEndorsementForm}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">Endorsement</label>
                      <Select value={selectedEndorsement} onValueChange={setSelectedEndorsement}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select endorsement" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEndorsements
                            .filter(e => e.is_active && !userEndorsements.some(ue => ue.endorsement_id === e.id))
                            .map((endorsement) => (
                              <SelectItem key={endorsement.id} value={endorsement.id}>
                                {endorsement.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">Expiry Date (Optional)</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal text-xs h-9">
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {endorsementExpiryDate ? format(endorsementExpiryDate, 'MMM dd') : 'No expiry'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endorsementExpiryDate}
                            onSelect={setEndorsementExpiryDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">Notes (Optional)</label>
                      <Input
                        value={endorsementNotes}
                        onChange={(e) => setEndorsementNotes(e.target.value)}
                        placeholder="Add notes..."
                        className="h-9 text-xs"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={addEndorsement}
                        disabled={!selectedEndorsement || endorsementsLoading}
                        size="sm"
                        className="flex-1 h-9"
                      >
                        {endorsementsLoading ? "Adding..." : <><Plus className="w-3 h-3 mr-1" />Add</>}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetAddEndorsementForm}
                        className="h-9 px-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Current Endorsements */}
            {userEndorsements.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">Current Endorsements</h5>
                <div className="space-y-3">
                  {userEndorsements.map((userEndorsement) => {
                    const expiryStatus = getExpiryStatus(userEndorsement.expiry_date);
                    const Icon = expiryStatus.icon;
                    
                    return (
                      <div key={userEndorsement.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h6 className="font-medium text-gray-900">{userEndorsement.endorsement.name}</h6>
                            <Badge className={`${expiryStatus.color} flex items-center gap-1 px-2 py-1 text-xs`}>
                              <Icon className="w-3 h-3" />
                              {expiryStatus.status === 'expired' ? 'Expired' : 
                               expiryStatus.status === 'expiring' ? 'Expiring Soon' : 'Valid'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>Issued: {format(new Date(userEndorsement.issued_date), 'MMM dd, yyyy')}</span>
                            {userEndorsement.expiry_date && (
                              <span>Expires: {format(new Date(userEndorsement.expiry_date), 'MMM dd, yyyy')}</span>
                            )}
                            {userEndorsement.notes && (
                              <span>Notes: {userEndorsement.notes}</span>
                            )}
                          </div>
                        </div>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => showDeleteConfirmationDialog(userEndorsement.id, userEndorsement.endorsement.name)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />
                                Remove endorsement
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {/* Confirmation Dialog for Endorsement Removal */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Endorsement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the <strong>&quot;{endorsementToDelete?.name}&quot;</strong> endorsement? 
              This action can be undone by an administrator if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={voidEndorsement}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Remove Endorsement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
} 