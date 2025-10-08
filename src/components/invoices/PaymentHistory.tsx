'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, CreditCard, Banknote, Hash, RotateCcw, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { Payment } from '@/types/payments';
import ReversePaymentModal from '@/components/payments/ReversePaymentModal';
import { toast } from 'sonner';

interface PaymentHistoryProps {
  invoiceId: string;
  userRole?: string;
}

const methodIcon = (method: string) => {
  switch (method) {
    case 'credit_card':
      return <CreditCard className="w-4 h-4 text-blue-500" />;
    case 'bank_transfer':
      return <Banknote className="w-4 h-4 text-green-500" />;
    case 'cash':
      return <DollarSign className="w-4 h-4 text-yellow-500" />;
    default:
      return <Hash className="w-4 h-4 text-gray-400" />;
  }
};

const getPaymentType = (payment: Payment): 'normal' | 'reversal' | 'correction' | 'reversed' => {
  if (payment.metadata?.reverses_payment_id) return 'reversal';
  if (payment.metadata?.corrects_payment_id) return 'correction';
  if (payment.metadata?.reversed_by_payment_id) return 'reversed';
  return 'normal';
};

export function PaymentHistory({ invoiceId, userRole }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  const canReversePayments = userRole === 'admin' || userRole === 'owner';

  const fetchPayments = () => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/payments?invoice_id=${invoiceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPayments(data);
        } else {
          setError(data.error || 'Failed to load payments');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load payments');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const handleReverseClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setReverseModalOpen(true);
  };

  const handleReverseSuccess = () => {
    toast.success('Payment reversed successfully. The invoice has been updated.');
    fetchPayments();
    // Refresh the page to update invoice totals
    window.location.reload();
  };

  const renderPaymentBadge = (payment: Payment) => {
    const paymentType = getPaymentType(payment);
    
    switch (paymentType) {
      case 'reversal':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <RotateCcw className="w-3 h-3 mr-1" />
            Reversal
          </Badge>
        );
      case 'correction':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Correction
          </Badge>
        );
      case 'reversed':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Reversed
          </Badge>
        );
      default:
        return null;
    }
  };


  // Don't render anything if no payments exist (similar to credit notes behavior)
  if (payments.length === 0 && !loading && !error) {
    return null;
  }

  return (
    <>
      <Card>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <h2 className="text-base font-semibold">Payment History</h2>
              <Badge variant="outline" className="text-xs">
                {payments.length} payment{payments.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            {canReversePayments && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="w-3 h-3" />
                <span>Click &quot;Reverse&quot; to correct any payment errors</span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading payments...</div>
          ) : error ? (
            <div className="text-center text-destructive py-8">{error}</div>
          ) : (
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">DATE</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">METHOD</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">REFERENCE</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">NOTES</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">AMOUNT</th>
                  {canReversePayments && (
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">ACTIONS</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const paymentType = getPaymentType(payment);
                  const isReversed = paymentType === 'reversed';
                  const isReversal = paymentType === 'reversal';
                  const isCorrection = paymentType === 'correction';
                  const amount = Number(payment.amount);
                  const amountColor = amount < 0 
                    ? 'text-red-600' 
                    : isCorrection 
                      ? 'text-blue-600' 
                      : 'text-green-600';

                  return (
                    <tr 
                      key={payment.id} 
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                        isReversed ? 'opacity-50' : ''
                      } ${isReversal ? 'bg-red-50/30' : ''} ${isCorrection ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="py-2.5 px-4 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(payment.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        <span className="block text-xs">
                          {new Date(payment.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          {methodIcon(payment.payment_method)}
                          <span className="text-sm capitalize">{payment.payment_method.replace('_', ' ')}</span>
                        </div>
                        {renderPaymentBadge(payment)}
                      </td>
                      <td className="py-2.5 px-4 text-sm text-muted-foreground">
                        {payment.payment_reference || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-sm text-muted-foreground max-w-xs">
                        <div className="space-y-0.5">
                          {payment.notes && <div>{payment.notes}</div>}
                          {isReversed && payment.metadata?.reversal_reason && (
                            <div className="text-xs text-orange-600">
                              Reversed: {payment.metadata.reversal_reason}
                            </div>
                          )}
                          {isReversal && payment.metadata?.reversal_reason && (
                            <div className="text-xs text-red-600">
                              {payment.metadata.reversal_reason}
                            </div>
                          )}
                          {isCorrection && payment.metadata?.correction_reason && (
                            <div className="text-xs text-blue-600">
                              {payment.metadata.correction_reason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`py-2.5 px-4 text-right text-sm font-semibold ${amountColor}`}>
                        ${amount < 0 ? '-' : ''}{Math.abs(amount).toFixed(2)}
                      </td>
                      {canReversePayments && (
                        <td className="py-2.5 px-4 text-right">
                          {!isReversed && !isReversal && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReverseClick(payment)}
                              className="text-xs h-7"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Reverse
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Reverse Payment Modal */}
      {selectedPayment && (
        <ReversePaymentModal
          open={reverseModalOpen}
          onOpenChange={setReverseModalOpen}
          payment={selectedPayment}
          onSuccess={handleReverseSuccess}
        />
      )}
    </>
  );
}

export default PaymentHistory; 