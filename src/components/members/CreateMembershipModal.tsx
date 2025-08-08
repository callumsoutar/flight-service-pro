import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  UserPlus, 
  CreditCard, 
  Calendar,
  Gift,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Settings,
  Info
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { MembershipType } from "@/types/memberships";

interface CreateMembershipModalProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  membershipTypes: MembershipType[];
  onCreateMembership: (data: {
    user_id: string;
    membership_type_id: string;
    auto_renew: boolean;
    notes?: string;
    create_invoice: boolean;
  }) => Promise<void>;
}

export default function CreateMembershipModal({
  open,
  onClose,
  memberId,
  membershipTypes,
  onCreateMembership
}: CreateMembershipModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");
  const [createInvoice, setCreateInvoice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTypeId("");
      setAutoRenew(false);
      setNotes("");
      setCreateInvoice(true);
    }
  }, [open]);

  const selectedType = membershipTypes.find(t => t.id === selectedTypeId);

  // Calculate expiry date
  const expiryDate = selectedType 
    ? addMonths(new Date(), selectedType.duration_months)
    : null;

  const handleSubmit = async () => {
    if (!selectedType) return;
    
    setIsSubmitting(true);
    try {
      await onCreateMembership({
        user_id: memberId,
        membership_type_id: selectedTypeId,
        auto_renew: autoRenew,
        notes: notes.trim() || undefined,
        create_invoice: createInvoice
      });
      onClose();
    } catch (error) {
      console.error("Membership creation failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            Create New Membership
          </DialogTitle>
          <p className="text-gray-600 text-base">
            Set up a new membership for this member with the details below.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Selection & Configuration */}
          <div className="space-y-6">
            {/* Membership Type Selection */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-lg">Membership Type</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Choose a membership type" />
                  </SelectTrigger>
                  <SelectContent>
                    {membershipTypes.filter(type => type.is_active).map((type) => (
                      <SelectItem key={type.id} value={type.id} className="py-3">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{type.name}</span>
                          <span className="text-sm font-medium text-gray-600 ml-4">
                            {type.price === 0 ? "Free" : `$${type.price}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedType && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{selectedType.name}</h4>
                        {selectedType.description && (
                          <p className="text-sm text-gray-600 mt-1">{selectedType.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-semibold text-gray-900">
                          {selectedType.price === 0 ? "Free" : `$${selectedType.price}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {selectedType.duration_months} month{selectedType.duration_months !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {membershipTypes.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No membership types available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configuration Options */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-lg">Configuration</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auto-renewal */}
                <div className="flex items-start space-x-3">
                  <Switch
                    id="auto-renew"
                    checked={autoRenew}
                    onCheckedChange={setAutoRenew}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="auto-renew" className="text-base font-medium cursor-pointer">
                      Enable auto-renewal
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Automatically renew this membership when it expires
                    </p>
                  </div>
                </div>

                {/* Invoice creation */}
                <div className="flex items-start space-x-3">
                  <Switch
                    id="create-invoice"
                    checked={createInvoice}
                    onCheckedChange={setCreateInvoice}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="create-invoice" className="text-base font-medium cursor-pointer">
                      Create invoice for this membership
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Generate an invoice for membership payment
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <label htmlFor="notes" className="text-base font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes (optional)
                  </label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this membership..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="text-base"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {selectedType ? (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Gift className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-lg text-blue-900">Membership Preview</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Main Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Gift className="h-4 w-4" />
                        Type
                      </div>
                      <div className="font-semibold text-lg">{selectedType.name}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        Price
                      </div>
                      <div className="font-semibold text-lg">
                        {selectedType.price === 0 ? "Free" : `$${selectedType.price}`}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        Duration
                      </div>
                      <div className="font-semibold">{selectedType.duration_months} months</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        Expires
                      </div>
                      <div className="font-semibold">
                        {expiryDate ? format(expiryDate, 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedType.description && (
                    <div className="p-4 bg-white/70 rounded-lg">
                      <p className="text-sm text-gray-700">{selectedType.description}</p>
                    </div>
                  )}

                  {/* Benefits */}
                  {selectedType.benefits && selectedType.benefits.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-blue-900">Membership Benefits</h4>
                      <div className="space-y-2">
                        {selectedType.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configuration Summary */}
                  <div className="p-4 bg-white/70 rounded-lg space-y-2">
                    <h4 className="font-medium text-blue-900 mb-3">Configuration Summary</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span>Auto-renewal:</span>
                      <span className={`font-medium ${autoRenew ? 'text-green-600' : 'text-gray-500'}`}>
                        {autoRenew ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Invoice creation:</span>
                      <span className={`font-medium ${createInvoice ? 'text-green-600' : 'text-gray-500'}`}>
                        {createInvoice ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {notes.trim() && (
                      <div className="pt-2 border-t border-blue-200">
                        <span className="text-sm text-gray-600">Notes:</span>
                        <p className="text-sm text-gray-700 mt-1">{notes.trim()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="text-center py-12">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Membership Type</h3>
                  <p className="text-gray-600">Choose a membership type to see the preview and details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="pt-6 mt-8 border-t">
          <div className="flex items-center gap-3 w-full justify-end">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !selectedType}
              className="flex items-center gap-2 px-6"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <UserPlus className="h-4 w-4 animate-spin" />
                  Creating Membership...
                </>
              ) : (
                <>
                  {createInvoice && <CreditCard className="h-4 w-4" />}
                  <Calendar className="h-4 w-4" />
                  Create Membership
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 