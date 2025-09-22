import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plane, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AircraftOption {
  id: string;
  registration: string;
  type: string;
}

interface ChangeAircraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    name: string;
    aircraft: string;
    start_time: string;
    end_time: string;
  } | null;
  aircraft: AircraftOption[];
  onAircraftChanged: (bookingId: string, newAircraftId: string) => void;
  loading?: boolean;
}

export const ChangeAircraftModal: React.FC<ChangeAircraftModalProps> = ({
  open,
  onOpenChange,
  booking,
  aircraft,
  onAircraftChanged,
  loading = false
}) => {
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset selected aircraft when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setSelectedAircraftId('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!booking || !selectedAircraftId) {
      toast.error('Please select an aircraft');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAircraftChanged(booking.id, selectedAircraftId);
      onOpenChange(false);
      toast.success('Aircraft changed successfully');
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Failed to change aircraft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedAircraftId('');
    onOpenChange(false);
  };

  if (!booking) return null;

  const selectedAircraft = aircraft.find(a => a.id === selectedAircraftId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-full">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plane className="w-6 h-6 text-blue-600" />
            </div>
            Change Aircraft
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Booking Info */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
            <div className="space-y-3">
              <div className="font-semibold text-base text-gray-900">{booking.name}</div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Aircraft:</span>
                  <span className="font-medium text-gray-900">{booking.aircraft}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Aircraft Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Plane className="w-4 h-4 text-gray-500" />
              Select New Aircraft
            </label>
            <Select value={selectedAircraftId} onValueChange={setSelectedAircraftId}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Choose aircraft..." />
              </SelectTrigger>
              <SelectContent>
                {aircraft.map(aircraftOption => (
                  <SelectItem key={aircraftOption.id} value={aircraftOption.id}>
                    {aircraftOption.registration} ({aircraftOption.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conflict Warning */}
          {selectedAircraft && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-800 flex-1">
                  <div className="font-medium">
                    Changing to <strong>{selectedAircraft.registration} ({selectedAircraft.type})</strong>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    The system will automatically check for conflicts
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-6 gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-6 py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAircraftId || isSubmitting || loading}
            className="bg-blue-500 hover:bg-blue-600 px-6 py-2"
          >
            {isSubmitting ? 'Changing...' : 'Change Aircraft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
