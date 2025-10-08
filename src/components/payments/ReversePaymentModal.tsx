'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RotateCcw, DollarSign, AlertTriangle } from 'lucide-react';
import { Payment, ReversePaymentRequest, ReversePaymentResponse } from '@/types/payments';
import { formatCurrencyDisplay } from '@/lib/utils';

interface ReversePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  onSuccess: () => void;
}

export default function ReversePaymentModal({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: ReversePaymentModalProps) {
  const [reason, setReason] = useState('');
  const [shouldCorrect, setShouldCorrect] = useState(false);
  const [correctAmount, setCorrectAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for the reversal');
      return;
    }
    
    if (shouldCorrect) {
      const amount = parseFloat(correctAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid correct amount');
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const requestBody: ReversePaymentRequest = {
        reason: reason.trim(),
      };
      
      if (shouldCorrect) {
        requestBody.correct_amount = parseFloat(correctAmount);
      }
      
      const response = await fetch(`/api/payments/${payment.id}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data: ReversePaymentResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reverse payment');
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Payment reversal failed');
      }
      
      // Success
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setReason('');
      setShouldCorrect(false);
      setCorrectAmount('');
      setError(null);
    } catch (err) {
      console.error('Error reversing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to reverse payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      setReason('');
      setShouldCorrect(false);
      setCorrectAmount('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg flex flex-col justify-between rounded-2xl p-0 overflow-visible">
        <DialogHeader className="px-6 pt-6 pb-2 border-b flex flex-row items-center gap-3 relative">
          <span className="bg-orange-100 text-orange-600 rounded-full p-2">
            <RotateCcw className="w-6 h-6" />
          </span>
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold">Reverse Payment</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Create a reversal entry for this payment
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Payment summary */}
        <div className="px-6 pt-4 pb-2 bg-muted/40 flex flex-row justify-between items-center text-sm border-b">
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground">Amount:</div>
            <div className="font-semibold text-lg">${formatCurrencyDisplay(Number(payment.amount))}</div>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <div className="text-muted-foreground">Method:</div>
            <div className="font-semibold capitalize">{payment.payment_method.replace('_', ' ')}</div>
            <div className="text-muted-foreground mt-1">Date:</div>
            <div className="text-sm">{new Date(payment.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
          {/* Reason for Reversal */}
          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Reversal *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Incorrect amount entered, wrong payment method"
              className="mt-1.5"
              rows={3}
              required
              disabled={loading}
            />
          </div>

          {/* Correction Option */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor="shouldCorrect" className="text-sm font-medium">
                Create Correcting Payment
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reverse and create correct payment in one step
              </p>
            </div>
            <Switch
              id="shouldCorrect"
              checked={shouldCorrect}
              onCheckedChange={setShouldCorrect}
              disabled={loading}
            />
          </div>

          {/* Correct Amount Input */}
          {shouldCorrect && (
            <div>
              <Label htmlFor="correctAmount" className="text-sm font-medium">
                Correct Amount *
              </Label>
              <div className="relative mt-1.5">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="correctAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={correctAmount}
                  onChange={(e) => setCorrectAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                  required={shouldCorrect}
                  disabled={loading}
                />
              </div>
              {correctAmount && (
                <p className="text-xs text-muted-foreground mt-1">
                  Net adjustment: {
                    (parseFloat(correctAmount) - Number(payment.amount)) >= 0 ? '+' : ''
                  }${(parseFloat(correctAmount) - Number(payment.amount)).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Warning */}
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-xs">
              This will create a reversal entry and update the invoice balance. The original payment will be preserved for audit purposes.
            </AlertDescription>
          </Alert>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </form>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reversing...
              </>
            ) : (
              'Reverse Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

