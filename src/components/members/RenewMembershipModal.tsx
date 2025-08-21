import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw, 
  CreditCard, 
  Calendar,
  Gift,
  CheckCircle
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { MembershipType, Membership } from "@/types/memberships";

interface RenewMembershipModalProps {
  open: boolean;
  onClose: () => void;
  currentMembership: Membership;
  membershipTypes: MembershipType[];
  onRenew: (data: {
    membership_type_id?: string;
    auto_renew: boolean;
    notes?: string;
    create_invoice: boolean;
  }) => Promise<void>;
}

export default function RenewMembershipModal({
  open,
  onClose,
  currentMembership,
  membershipTypes,
  onRenew
}: RenewMembershipModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");
  const [createInvoice, setCreateInvoice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTypeId(currentMembership.membership_type_id || "");
      setAutoRenew(currentMembership.auto_renew || false);
      setNotes("");
      setCreateInvoice(true);
    }
  }, [open, currentMembership]);

  const selectedType = membershipTypes.find(t => t.id === selectedTypeId) || currentMembership.membership_types;
  const isChangingType = selectedTypeId !== currentMembership.membership_type_id;

  // Calculate new expiry date
  const newExpiryDate = selectedType 
    ? addMonths(new Date(), selectedType.duration_months)
    : null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onRenew({
        membership_type_id: isChangingType ? selectedTypeId : undefined,
        auto_renew: autoRenew,
        notes: notes.trim() || undefined,
        create_invoice: createInvoice
      });
      onClose();
    } catch (error) {
      console.error("Renewal failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Renew Membership
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Membership Info */}
          <Card className="bg-gray-50 rounded-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Current Membership</h4>
                <Badge variant="outline">
                  Expires {format(new Date(currentMembership.expiry_date), 'MMM dd, yyyy')}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{currentMembership.membership_types?.name}</span>
                {currentMembership.membership_types?.price === 0 
                  ? " • Free" 
                  : ` • $${currentMembership.membership_types?.price}/year`}
              </div>
            </CardContent>
          </Card>

          {/* Membership Type Selection */}
          <div className="space-y-3">
            <label htmlFor="membership-type" className="text-sm font-medium">New Membership Type</label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select membership type" />
              </SelectTrigger>
              <SelectContent>
                {membershipTypes.filter(type => type.is_active).map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{type.name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {type.price === 0 ? "Free" : `$${type.price}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {isChangingType && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <CheckCircle className="h-4 w-4" />
                  <span>You&apos;re changing from <strong>{currentMembership.membership_types?.name}</strong> to <strong>{selectedType?.name}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* New Membership Preview */}
          {selectedType && (
            <Card className="border-green-200 bg-green-50 rounded-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-green-800">New Membership Details</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <div className="font-medium">{selectedType.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-medium">{selectedType.duration_months} months</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Price:</span>
                    <div className="font-medium">
                      {selectedType.price === 0 ? "Free" : `$${selectedType.price}`}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">New Expiry:</span>
                    <div className="font-medium">
                      {newExpiryDate ? format(newExpiryDate, 'MMM dd, yyyy') : 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedType.benefits && selectedType.benefits.length > 0 && (
                  <div className="mt-3">
                    <span className="text-gray-600 text-sm">Benefits:</span>
                    <div className="text-sm text-gray-700 mt-1">
                      {selectedType.benefits.slice(0, 3).map((benefit, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                      {selectedType.benefits.length > 3 && (
                        <div className="text-xs text-gray-500 mt-1">
                          +{selectedType.benefits.length - 3} more benefits
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-renew"
                checked={autoRenew}
                onCheckedChange={setAutoRenew}
              />
              <label htmlFor="auto-renew" className="text-sm font-medium">
                Enable auto-renewal
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="create-invoice"
                checked={createInvoice}
                onCheckedChange={setCreateInvoice}
              />
              <label htmlFor="create-invoice" className="text-sm font-medium">
                Create invoice for this renewal
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this renewal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedType}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {createInvoice && <CreditCard className="h-4 w-4" />}
                <Calendar className="h-4 w-4" />
                Renew Membership
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 