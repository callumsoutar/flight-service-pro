"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOverrideAuthorization } from '@/hooks/use-authorization-override';
import { AlertTriangle } from 'lucide-react';

interface OverrideAuthorizationModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function OverrideAuthorizationModal({
  bookingId,
  isOpen,
  onClose
}: OverrideAuthorizationModalProps) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  
  const overrideMutation = useOverrideAuthorization();

  const handleOverride = async () => {
    if (!reason.trim() || !confirmed) return;

    try {
      await overrideMutation.mutateAsync({ bookingId, reason });
      onClose();
      setReason('');
      setConfirmed(false);
    } catch (error) {
      console.error('Failed to override authorization:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Override Flight Authorization
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              This will allow the solo flight to be checked out without completing the authorization process.
              Please provide a reason for audit purposes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Override Reason *</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Emergency, Student has current authorization on file..."
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="confirm" className="text-sm">
              I confirm this override is necessary and appropriate
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleOverride}
              disabled={!reason.trim() || !confirmed || overrideMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {overrideMutation.isPending ? 'Overriding...' : 'Override Authorization'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
